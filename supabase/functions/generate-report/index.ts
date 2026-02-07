
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import 'https://esm.sh/jspdf-autotable@3.5.28';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Format Dates
const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper: Simple Hebrew Number Formatting
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(val);
};

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2. Auth Check
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) throw new Error('Unauthorized');

        // 3. Request Data
        const { propertyId, startDate, endDate, lang = 'he' } = await req.json();
        if (!propertyId) throw new Error('Property ID is required');

        // 4. Verify Ownership & Fetch Base Data
        const { data: property, error: pError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .eq('user_id', user.id)
            .single();

        if (pError || !property) throw new Error('Property not found or unauthorized access');

        // 5. Aggregate Expanded Data

        // A. Contract & Tenants
        const { data: contract } = await supabase
            .from('contracts')
            .select('*')
            .eq('property_id', propertyId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // B. Payments (Itemized)
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .eq('contract_id', contract?.id || '')
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .order('due_date', { ascending: true });

        // C. Utilities
        const { data: utilities } = await supabase
            .from('property_documents')
            .select('*')
            .eq('property_id', propertyId)
            .like('category', 'utility_%')
            .gte('document_date', startDate)
            .lte('document_date', endDate);

        // D. Index Data for Linkage Calculation
        const { data: latestIndices } = await supabase
            .from('index_data')
            .select('*')
            .in('index_type', ['cpi', 'housing', 'construction'])
            .order('date', { ascending: false })
            .limit(3);

        const latestCpi = latestIndices?.find(i => i.index_type === 'cpi');

        // 6. Logic: Linkage Adjustment Calculation
        let adjustedRent = contract?.base_rent ? parseFloat(contract.base_rent) : 0;
        let linkageDelta = 0;

        if (contract?.linkage_type === 'cpi' && contract.base_index_value && latestCpi) {
            const baseVal = parseFloat(contract.base_index_value);
            const currentVal = parseFloat(latestCpi.value);
            if (baseVal > 0) {
                const ratio = currentVal / baseVal;
                const projected = adjustedRent * ratio;
                linkageDelta = projected - adjustedRent;
                adjustedRent = projected;
            }
        }

        // 7. PDF Generation
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // NOTE: In a production environment, we would load the font base64 here.
        // For now, we use standard fonts and basic PDF structure.
        const isRtl = lang === 'he';
        const width = doc.internal.pageSize.getWidth();
        const margin = 20;

        // -- Header --
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, width, 45, 'F');
        doc.setTextColor(255, 255, 255);

        doc.setFontSize(24);
        const title = isRtl ? 'דוח ביצועי נכס - RentMate' : 'Property Performance Report';
        doc.text(title, isRtl ? width - margin : margin, 20, { align: isRtl ? 'right' : 'left' });

        doc.setFontSize(10);
        doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, isRtl ? width - margin : margin, 32, { align: isRtl ? 'right' : 'left' });

        // -- Property Summary --
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.text(property.address, isRtl ? width - margin : margin, 60, { align: isRtl ? 'right' : 'left' });
        doc.setFontSize(11);
        doc.text(`${property.city} | ${property.rooms} ${isRtl ? 'חדרים' : 'Rooms'} | ${property.size_sqm} ${isRtl ? 'מ"ר' : 'sqm'}`, isRtl ? width - margin : margin, 68, { align: isRtl ? 'right' : 'left' });

        // -- Financial Scoreboard --
        const totalIncome = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        const totalExpenses = (utilities || []).reduce((sum, u) => sum + (u.amount || 0), 0);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, 75, width - (margin * 2), 25, 3, 3, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(isRtl ? 'סה"כ הכנסות' : 'Total Income', margin + 10, 85);
        doc.text(isRtl ? 'סה"כ הוצאות' : 'Total Expenses', width / 2, 85, { align: 'center' });
        doc.text(isRtl ? 'תזרים נקי' : 'Net Cash Flow', width - margin - 10, 85, { align: 'right' });

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text(formatCurrency(totalIncome), margin + 10, 93);
        doc.text(formatCurrency(totalExpenses), width / 2, 93, { align: 'center' });
        doc.text(formatCurrency(totalIncome - totalExpenses), width - margin - 10, 93, { align: 'right' });

        // -- Contract & Linkage --
        if (contract) {
            doc.setFontSize(12);
            doc.text(isRtl ? 'פרטי חוזה והצמדה' : 'Contract & Linkage', isRtl ? width - margin : margin, 115, { align: isRtl ? 'right' : 'left' });

            doc.autoTable({
                startY: 120,
                head: [[isRtl ? 'תיאור' : 'Description', isRtl ? 'ערך' : 'Value']],
                body: [
                    [isRtl ? 'שכר דירה בסיס' : 'Base Rent', formatCurrency(parseFloat(contract.base_rent))],
                    [isRtl ? 'סוג הצמדה' : 'Linkage Type', contract.linkage_type?.toUpperCase() || 'NONE'],
                    [isRtl ? 'תוספת הצמדה (חיזוי)' : 'Linkage Delta (Proj)', formatCurrency(linkageDelta)],
                    [isRtl ? 'שכר דירה נוכחי' : 'Current Adjusted Rent', formatCurrency(adjustedRent)],
                    [isRtl ? 'פיקדון' : 'Security Deposit', formatCurrency(parseFloat(contract.security_deposit_amount || '0'))]
                ],
                theme: 'plain',
                styles: { halign: isRtl ? 'right' : 'left', fontSize: 9 }
            });
        }

        // -- Payment History Table --
        const paymentsY = (doc as any).lastAutoTable?.finalY + 15 || 115;
        doc.setFontSize(12);
        doc.text(isRtl ? 'פירוט תקבולים' : 'Payment History', isRtl ? width - margin : margin, paymentsY, { align: isRtl ? 'right' : 'left' });

        doc.autoTable({
            startY: paymentsY + 5,
            head: [[isRtl ? 'תאריך' : 'Date', isRtl ? 'סטטוס' : 'Status', isRtl ? 'סכום' : 'Amount']],
            body: (payments || []).map(p => [formatDate(p.due_date), p.status.toUpperCase(), formatCurrency(parseFloat(p.amount))]),
            headStyles: { fillColor: [79, 70, 229] },
            styles: { halign: isRtl ? 'right' : 'left' }
        });

        // -- Footer --
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('RentMate Vanguard Management Intelligence - Automated Report', width / 2, 285, { align: 'center' });

        // 8. Output
        const pdfOutput = doc.output('datauristring');

        return new Response(
            JSON.stringify({ pdf: pdfOutput }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Report Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
