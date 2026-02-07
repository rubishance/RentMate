
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { addMonths, addYears, format, parseISO } from "https://esm.sh/date-fns@2.30.0";

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

serve(async (req) => {
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
        let current = new Date(start);

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
        while (current <= end) {
            // Determine Due Date
            const year = current.getFullYear();
            const month = current.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const actualDay = Math.min(paymentDay, daysInMonth);
            const dueDate = new Date(year, month, actualDay);
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

            let amount = currentBaseRent;
            let linkageRate = 0;

            // Calculate Linkage
            if (linkageType !== 'none' && baseIndexValue) {
                let targetIndexValue: number | null = null;

                if (linkageSubType === 'known') {
                    // Madad Yadua logic
                    const dayOfMonth = dueDate.getDate();
                    const indexDate = new Date(dueDate);
                    if (dayOfMonth < 15) {
                        indexDate.setMonth(indexDate.getMonth() - 2);
                    } else {
                        indexDate.setMonth(indexDate.getMonth() - 1);
                    }
                    const lookupKey = indexDate.toISOString().substring(0, 7);
                    targetIndexValue = indexMap[lookupKey] || null;

                } else if (linkageSubType === 'respect_of' || !linkageSubType) {
                    // Madad B'gin logic (same month)
                    targetIndexValue = indexMap[monthKey] || null;
                }

                if (targetIndexValue) {
                    const ratio = targetIndexValue / baseIndexValue;
                    linkageRate = (ratio - 1) * 100;
                    amount = currentBaseRent * ratio;

                    // Floor
                    const effectiveFloor = linkageFloor ?? currentBaseRent;
                    if (amount < effectiveFloor) amount = effectiveFloor;

                    // Ceiling
                    if (linkageCeiling !== null && linkageCeiling !== undefined) {
                        const maxAmount = currentBaseRent * (1 + linkageCeiling / 100);
                        if (amount > maxAmount) amount = maxAmount;
                    }
                }
            }

            payments.push({
                amount: Number(amount.toFixed(2)),
                currency: currentCurrency,
                due_date: dueStr,
                status: 'pending',
                original_amount: currentBaseRent,
                index_linkage_rate: Number(linkageRate.toFixed(2))
            });

            // Advance
            const freq = paymentFrequency.toLowerCase();
            if (freq === 'monthly') current = addMonths(current, 1);
            else if (freq === 'quarterly') current = addMonths(current, 3);
            else if (freq === 'annually') current = addMonths(current, 12); // addYears not in imports? Wait I imported addYears.
            else {
                // fallback to monthly to avoid infinite loop
                current = addMonths(current, 1);
            }
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
});
