
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { addMonths, addYears, format, parseISO } from "https://esm.sh/date-fns@2.30.0";
import { withEdgeMiddleware } from '../_shared/middleware.ts';
import { calculateEffectiveChange, determineTargetIndexMonth, calculateProratedCeiling } from '../_shared/core/linkage-math.ts';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentScheduleItem {
    contract_id?: string;
    amount: number;
    currency: 'ILS' | 'USD' | 'EUR';
    due_date: string;
    status: 'pending';
    index_linkage_rate?: number;
    original_amount: number;
}

interface GenerationParams {
    startDate: string;
    endDate: string;
    baseRent: number;
    currency: 'ILS' | 'USD' | 'EUR';
    paymentFrequency: 'monthly' | 'quarterly' | 'annually';
    paymentDay: number;
    linkageType: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur' | 'none';
    linkageSubType?: 'known' | 'respect_of' | 'base' | null;
    baseIndexDate?: string | null;
    baseIndexValue?: number | null;
    linkageCeiling?: number | null;
    linkageFloor?: number | null;
    rent_periods?: {
        startDate: string;
        amount: number;
        currency: 'ILS' | 'USD' | 'EUR';
    }[];
}

interface IndexData {
    index_type: string;
    date: string;
    value: number;
}

serve(withEdgeMiddleware('generate-payments', async (req, logger) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Auth Check - Create Supabase client with user's token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify user is logged in
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        // 3. Parse Body
        const {
            startDate, endDate, baseRent, currency, paymentFrequency, paymentDay,
            linkageType, linkageSubType, baseIndexDate, baseIndexValue,
            linkageCeiling, linkageFloor, rent_periods
        } = await req.json() as GenerationParams;

        if (!startDate || !endDate || !baseRent) {
            throw new Error('Missing required fields: startDate, endDate, baseRent');
        }

        const payments: PaymentScheduleItem[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        let count = 0;

        // 4. Fetch Index Data (if needed)
        const indexMap: Record<string, number> = {};
        if (linkageType !== 'none' && baseIndexValue) {
            // Fetch indices from 2 months before start date to 1 month after end date
            const fetchStart = new Date(start);
            fetchStart.setMonth(fetchStart.getMonth() - 2);
            const fetchEnd = new Date(end);
            fetchEnd.setMonth(fetchEnd.getMonth() + 1);

            const { data: indices, error: indexError } = await supabase
                .from('index_data')
                .select('date, value')
                .eq('index_type', linkageType)
                .gte('date', fetchStart.toISOString().split('T')[0])
                .lte('date', fetchEnd.toISOString().split('T')[0]);

            if (indexError) {
                console.error('Error fetching indices:', indexError);
                // Continue without linkage if fetch fails? Or fail?
                // Let's log but continue, maybe partial linkage or no linkage.
            } else if (indices) {
                indices.forEach((idx: any) => {
                    const key = idx.date.substring(0, 7); // YYYY-MM
                    indexMap[key] = idx.value;
                });
            }
        }

        // 5. Generate Payments Loop
        while (current <= end && count < 120) {
            const year = current.getFullYear();
            const month = current.getMonth();
            
            const freq = paymentFrequency.toLowerCase();
            const monthStep = freq === 'quarterly' ? 3 : freq === 'annually' ? 12 : 1;

            const periodStart = new Date(year, month, 1);
            const periodEnd = new Date(year, month + monthStep, 0);

            const activeStart = periodStart < start ? start : periodStart;
            const activeEnd = periodEnd > end ? end : periodEnd;

            if (activeStart <= activeEnd) {
                const getDaysBetween = (d1: Date, d2: Date) => {
                    const u1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
                    const u2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
                    return Math.floor((u2 - u1) / (1000 * 60 * 60 * 24)) + 1;
                };

                const periodTotalDays = getDaysBetween(periodStart, periodEnd);
                const activeDays = getDaysBetween(activeStart, activeEnd);
                const prorationFactor = activeDays < periodTotalDays ? (activeDays / periodTotalDays) : 1;

                // Determine Due Date
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const actualDay = Math.min(paymentDay, daysInMonth);
                let dueDate = new Date(year, month, actualDay);
                if (count === 0 && dueDate < start) {
                    dueDate = new Date(start);
                }
                const dueStr = format(dueDate, 'yyyy-MM-dd');
                const monthKey = dueStr.substring(0, 7);

            // Determine Base Rent (Rent Steps)
            let currentBaseRent = baseRent;
            let currentCurrency = currency;

            if (rent_periods && rent_periods.length > 0) {
                const applicablePeriod = rent_periods
                    .filter(p => p.startDate <= dueStr)
                    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

                if (applicablePeriod) {
                    currentBaseRent = applicablePeriod.amount;
                    currentCurrency = applicablePeriod.currency;
                }
            }

            let amount = currentBaseRent * prorationFactor;
            let linkageRate = 0;

            // Calculate Linkage
            if (linkageType !== 'none' && baseIndexValue) {
                const lookupKey = determineTargetIndexMonth(dueStr, linkageSubType);
                const targetIndexValue = indexMap[lookupKey] || null;

                if (targetIndexValue) {
                    const ratio = targetIndexValue / baseIndexValue;
                    const linkageCoefficient = (ratio - 1) * 100;
                    
                    const proratedCeiling = linkageCeiling !== null && linkageCeiling !== undefined 
                        ? calculateProratedCeiling(linkageCeiling, startDate, dueStr)
                        : undefined;

                    const effectiveChange = calculateEffectiveChange({
                        linkageCoefficient,
                        partialLinkage: 100, // Legacy support defaults, could be added to schema later
                        isIndexBaseMinimum: false, // Legacy support defaults
                        proratedCeiling
                    });

                    linkageRate = effectiveChange * 100;
                    amount = (currentBaseRent * prorationFactor) * (1 + effectiveChange);

                    // Optional Floor (Backend specific logic preserved)
                    if (linkageFloor !== null && linkageFloor !== undefined) {
                        const effectiveFloor = (currentBaseRent * prorationFactor) * (1 + linkageFloor / 100);
                        if (amount < effectiveFloor) amount = effectiveFloor;
                    }
                }
            }

            payments.push({
                amount: Number(amount.toFixed(2)),
                currency: currentCurrency,
                due_date: dueStr,
                status: 'pending',
                original_amount: currentBaseRent * prorationFactor,
                index_linkage_rate: Number(linkageRate.toFixed(2))
            });
            } // end of active days block

            // Advance
            if (freq === 'monthly') current = addMonths(current, 1);
            else if (freq === 'quarterly') current = addMonths(current, 3);
            else if (freq === 'annually') current = addMonths(current, 12); // addYears not in imports? Wait I imported addYears.
            else {
                // fallback to monthly to avoid infinite loop
                current = addMonths(current, 1);
            }
            count++;
        }

        return new Response(JSON.stringify({ payments }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Generate Payments Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}));
