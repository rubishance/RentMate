
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import autoTable from 'https://esm.sh/jspdf-autotable@3.5.28';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Format Dates
const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper: Simple Hebrew Number Formatting
const formatCurrency = (val: number) => {
    try {
        return `₪${val.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;
    } catch (_e) {
        return `₪${val.toFixed(2)}`;
    }
};

/**
 * Reverses Hebrew characters for jsPDF RTL compatibility.
 * Smatly handles numbers to keep them in logical order.
 */
const fixRtl = (text: string | null | undefined): string => {
    if (!text) return '';
    // Check if contains Hebrew characters
    const hasHebrew = /[\u0590-\u05FF]/.test(text);
    if (!hasHebrew) return text;

    // Split into segments of (Hebrew+Space) vs (Non-Hebrew)
    // Actually, a simpler robust way for jsPDF:
    // Reverse the entire string, then reverse back any sequence of digits/decimals/symbols
    let reversed = text.split('').reverse().join('');
    // Regex to find sequences of numbers, dots, commas, %, and currency symbols that should be LTR
    reversed = reversed.replace(/([0-9.,%₪$]+)/g, (match) => {
        return match.split('').reverse().join('');
    });
    return reversed;
};

/**
 * Loads a font from a URL and returns base64
 */
async function loadFont(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();

    // Uint8Array to Base64 in Deno environment
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log('[ReportFunction] Initializing generation...');
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2. Auth Check
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) throw new Error('Missing authorization token');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('[ReportFunction] Auth error:', authError);
            throw new Error('Unauthorized');
        }

        // 3. Request Data
        const body = await req.json();
        const { propertyId, startDate, endDate, lang = 'he' } = body;
        if (!propertyId) throw new Error('Property ID is required');

        console.log(`[ReportFunction] Fetching data for property: ${propertyId}, range: ${startDate} to ${endDate}`);

        // 4. Verify Ownership & Fetch Base Data
        const { data: property, error: pError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (pError || !property) {
            console.error('[ReportFunction] Data fetch error or unauthorized:', pError);
            throw new Error('Property not found or unauthorized access');
        }

        // 5. Aggregate Expanded Data
        // A. Contract
        const { data: contract } = await supabase
            .from('contracts')
            .select('*')
            .eq('property_id', propertyId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // B. Payments
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user.id)
            .eq('contract_id', contract?.id || '00000000-0000-0000-0000-000000000000')
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

        // D. Indices
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
        console.log('[ReportFunction] Starting PDF generation...');
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true
        });

        const isRtl = lang === 'he';
        const width = doc.internal.pageSize.getWidth();
        const margin = 20;

        // -- Load Hebrew Font with absolute fallback --
        if (isRtl) {
            try {
                // Heebo-Regular via Google's raw repository URL is usually reliable for Deno fetch
                const fontBase64 = await loadFont('https://raw.githubusercontent.com/google/fonts/master/ofl/heebo/Heebo-Regular.ttf');
                doc.addFileToVFS('Heebo.ttf', fontBase64);
                doc.addFont('Heebo.ttf', 'Heebo', 'normal');
                doc.setFont('Heebo');
                console.log('[ReportFunction] Hebrew font Heebo loaded and set');
            } catch (fontErr) {
                console.error('[ReportFunction] CRITICAL: Failed to load Hebrew font:', fontErr);
                // If font fails, Hebrew will be gibberish in most standard fonts
                doc.setFont('helvetica');
            }
        }

        // -- Header --
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, width, 45, 'F');
        doc.setTextColor(255, 255, 255);

        doc.setFontSize(24);
        const title = isRtl ? fixRtl('דוח ביצועי נכס - RentMate') : 'Property Performance Report';
        doc.text(title, isRtl ? width - margin : margin, 20, { align: isRtl ? 'right' : 'left' });

        doc.setFontSize(10);
        doc.text(`${formatDate(startDate)} - ${formatDate(endDate)}`, isRtl ? width - margin : margin, 32, { align: isRtl ? 'right' : 'left' });

        // -- Property Summary --
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.text(fixRtl(property.title || property.address || 'Address'), isRtl ? width - margin : margin, 60, { align: isRtl ? 'right' : 'left' });
        doc.setFontSize(11);
        const roomsText = isRtl ? fixRtl(`${property.rooms || 0} חדרים`) : `${property.rooms || 0} Rooms`;
        const sqmText = isRtl ? fixRtl(`${property.size_sqm || 0} מ"ר`) : `${property.size_sqm || 0} sqm`;
        doc.text(`${fixRtl(property.city || '')} | ${roomsText} | ${sqmText}`, isRtl ? width - margin : margin, 68, { align: isRtl ? 'right' : 'left' });

        // -- Financial Scoreboard --
        const totalIncome = (payments || []).reduce((sum, p) => sum + parseFloat(p.paid_amount || p.amount || '0'), 0);
        const totalExpenses = (utilities || []).reduce((sum, u) => sum + (u.amount || 0), 0);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, 75, width - (margin * 2), 25, 3, 3, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text(isRtl ? fixRtl('סה"כ הכנסות') : 'Total Income', margin + 10, 85);
        doc.text(isRtl ? fixRtl('סה"כ הוצאות') : 'Total Expenses', width / 2, 85, { align: 'center' });
        doc.text(isRtl ? fixRtl('תזרים נקי') : 'Net Cash Flow', width - margin - 10, 85, { align: 'right' });

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.text(formatCurrency(totalIncome), margin + 10, 93);
        doc.text(formatCurrency(totalExpenses), width / 2, 93, { align: 'center' });
        doc.text(formatCurrency(totalIncome - totalExpenses), width - margin - 10, 93, { align: 'right' });

        // -- Contract & Linkage --
        if (contract) {
            doc.setFontSize(12);
            doc.text(isRtl ? fixRtl('פרטי חוזה והצמדה') : 'Contract & Linkage', isRtl ? width - margin : margin, 115, { align: isRtl ? 'right' : 'left' });

            const contractRows = [
                [isRtl ? fixRtl('שכר דירה בסיס') : 'Base Rent', formatCurrency(parseFloat(contract.base_rent || '0'))],
                [isRtl ? fixRtl('סוג הצמדה') : 'Linkage Type', contract.linkage_type?.toUpperCase() || 'NONE'],
                [isRtl ? fixRtl('תוספת הצמדה (חיזוי)') : 'Linkage Delta (Proj)', formatCurrency(linkageDelta)],
                [isRtl ? fixRtl('שכר דירה נוכחי') : 'Current Adjusted Rent', formatCurrency(adjustedRent)],
                [isRtl ? fixRtl('פיקדון') : 'Security Deposit', formatCurrency(parseFloat(contract.security_deposit_amount || '0'))]
            ];

            autoTable(doc, {
                startY: 120,
                head: [[isRtl ? fixRtl('תיאור') : 'Description', isRtl ? fixRtl('ערך') : 'Value']],
                body: contractRows,
                theme: 'plain',
                styles: {
                    halign: isRtl ? 'right' : 'left',
                    fontSize: 9,
                    font: isRtl ? 'Heebo' : 'helvetica'
                }
            });
        }

        // -- Payment History Table --
        const paymentsY = (doc as any).lastAutoTable?.finalY + 15 || 115;
        doc.setFontSize(12);
        doc.text(isRtl ? fixRtl('פירוט תקבולים') : 'Payment History', isRtl ? width - margin : margin, paymentsY, { align: isRtl ? 'right' : 'left' });

        autoTable(doc, {
            startY: paymentsY + 5,
            head: [[isRtl ? fixRtl('תאריך') : 'Date', isRtl ? fixRtl('סטטוס') : 'Status', isRtl ? fixRtl('סכום') : 'Amount']],
            body: (payments || []).map(p => [formatDate(p.due_date), p.status.toUpperCase(), formatCurrency(parseFloat(p.amount || '0'))]),
            headStyles: { fillColor: [79, 70, 229] },
            styles: {
                halign: isRtl ? 'right' : 'left',
                font: isRtl ? 'Heebo' : 'helvetica',
                fontSize: 9
            }
        });

        // -- Footer --
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('RentMate Vanguard Management Intelligence - Automated Report', width / 2, 285, { align: 'center' });

        // 8. Output
        console.log('[ReportFunction] PDF generated successfully');
        const pdfOutput = doc.output('datauristring');

        return new Response(
            JSON.stringify({ pdf: pdfOutput }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[ReportFunction] CRITICAL ERROR:', error);
        return new Response(
            JSON.stringify({
                error: error.message || 'Unknown internal error',
                details: error.stack
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

