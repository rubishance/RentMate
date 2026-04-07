import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import autoTable from 'https://esm.sh/jspdf-autotable@3.5.28';
import { withEdgeMiddleware } from '../_shared/middleware.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const fixRtl = (text: string | null | undefined): string => {
    if (!text) return '';
    const hasHebrew = /[\u0590-\u05FF]/.test(text);
    if (!hasHebrew) return text;
    let reversed = text.split('').reverse().join('');
    reversed = reversed.replace(/([0-9.,%₪$a-zA-Z]+)/g, (match) => {
        return match.split('').reverse().join('');
    });
    return reversed;
};

async function loadFont(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
}

serve(withEdgeMiddleware('generate-protocol-pdf', async (req, logger) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log('[GenerateProtocolPDF] Initializing...');
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        
        const bodyText = await req.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const protocolId = body.protocolId;
        
        if (!protocolId) throw new Error('protocolId is required');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: protocol, error: pError } = await supabase
            .from('property_protocols')
            .select('*, properties(*)')
            .eq('id', protocolId)
            .single();

        if (pError || !protocol) {
            throw new Error(`Protocol not found: ${pError?.message}`);
        }

        const property = protocol.properties;
        const isRtl = true; 
        
        console.log(`[GenerateProtocolPDF] Generating for protocol: ${protocolId}`);
        
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true
        });

        const width = doc.internal.pageSize.getWidth();
        const margin = 20;

        try {
            const fontUrl = 'https://fonts.gstatic.com/s/heebo/v28/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSyccg.ttf';
            const fontBase64 = await loadFont(fontUrl);
            doc.addFileToVFS('Heebo.ttf', fontBase64);
            doc.addFont('Heebo.ttf', 'Heebo', 'normal');
            doc.setFont('Heebo');
        } catch (fontErr) {
            console.error('Failed to load font:', fontErr);
        }

        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, width, 40, 'F');
        doc.setTextColor(255, 255, 255);
        
        doc.setFontSize(22);
        const titleText = protocol.type === 'move_in' ? 'פרוטוקול כניסה לנכס' : 'פרוטוקול עזיבת נכס';
        doc.text(fixRtl(titleText), width - margin, 18, { align: 'right' });
        
        doc.setFontSize(11);
        const propertyAddress = `${property.address}, ${property.city || ''}`;
        doc.text(fixRtl(propertyAddress), width - margin, 27, { align: 'right' });
        doc.text(`ID: ${protocol.id.substring(0, 8).toUpperCase()}`, margin, 27, { align: 'left' });
        
        doc.setTextColor(0, 0, 0);
        let currentY = 55;

        doc.setFontSize(14);
        doc.text(fixRtl('פרטי מסירה:'), width - margin, currentY, { align: 'right' });
        currentY += 8;
        
        const detailsHeaders = [
            [fixRtl('תאריך מסירה'), formatDate(protocol.date)],
            [fixRtl('סטטוס'), fixRtl(protocol.status === 'completed' ? 'חתום ומושלם' : 'ממתין לחתימה')]
        ];
        
        autoTable(doc, {
            startY: currentY,
            body: detailsHeaders,
            theme: 'plain',
            styles: { halign: 'right', font: 'Heebo', fontSize: 11 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 100 } },
            margin: { right: margin }
        });
        currentY = (doc as any).lastAutoTable?.finalY + 15;

        doc.setFontSize(14);
        doc.text(fixRtl('קריאות מונים:'), width - margin, currentY, { align: 'right' });
        currentY += 6;
        
        const meterRows = [];
        if (protocol.meters?.electricity?.value) meterRows.push([fixRtl('חשמל'), protocol.meters.electricity.value]);
        if (protocol.meters?.water?.value) meterRows.push([fixRtl('מים'), protocol.meters.water.value]);
        if (protocol.meters?.gas?.value) meterRows.push([fixRtl('גז'), protocol.meters.gas.value]);
        
        if (meterRows.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [[fixRtl('מונה'), fixRtl('קריאה')]],
                body: meterRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], font: 'Heebo' },
                styles: { halign: 'right', font: 'Heebo', fontSize: 10 },
                margin: { left: margin, right: margin }
            });
            currentY = (doc as any).lastAutoTable?.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(fixRtl('לא נרשמו קריאות מונים'), width - margin, currentY+5, { align: 'right' });
            currentY += 15;
            doc.setTextColor(0, 0, 0);
        }

        doc.setFontSize(14);
        doc.text(fixRtl('תכולה ומצב הנכס:'), width - margin, currentY, { align: 'right' });
        currentY += 6;
        
        const inventoryRows = (protocol.inventory || []).filter((i:any) => i.status !== 'na').map((item:any) => [
            fixRtl(item.label),
            fixRtl(item.status === 'intact' ? 'תקין' : 'פגום'),
            fixRtl(item.note || '-')
        ]);

        if (inventoryRows.length > 0) {
            autoTable(doc, {
                startY: currentY,
                head: [[fixRtl('פריט'), fixRtl('מצב'), fixRtl('הערות')]],
                body: inventoryRows,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], font: 'Heebo' },
                styles: { halign: 'right', font: 'Heebo', fontSize: 10 },
                margin: { left: margin, right: margin }
            });
            currentY = (doc as any).lastAutoTable?.finalY + 20;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text(fixRtl('לא נרשמו פירטי תכולה'), width - margin, currentY+5, { align: 'right' });
            currentY += 20;
            doc.setTextColor(0, 0, 0);
        }

        doc.setFontSize(14);
        doc.text(fixRtl('חתימות מכרות (חתום דיגיטלית):'), width - margin, currentY, { align: 'right' });
        currentY += 10;
        
        const sigWidth = 60;
        const sigHeight = 30;
        
        doc.setFontSize(10);
        doc.text(fixRtl('בעל הנכס:'), width - margin, currentY, { align: 'right' });
        doc.text(fixRtl('שוכר:'), width - margin - 90, currentY, { align: 'right' });
        
        currentY += 5;
        
        if (protocol.landlord_signature && protocol.landlord_signature.startsWith('data:image')) {
            doc.addImage(protocol.landlord_signature, 'PNG', width - margin - sigWidth, currentY, sigWidth, sigHeight);
        } else {
            doc.rect(width - margin - sigWidth, currentY, sigWidth, sigHeight);
            doc.text(fixRtl('אין חתימה'), width - margin - (sigWidth/2), currentY + (sigHeight/2), { align: 'center' });
        }
        
        if (protocol.tenant_signature && protocol.tenant_signature.startsWith('data:image')) {
            doc.addImage(protocol.tenant_signature, 'PNG', width - margin - 90 - sigWidth, currentY, sigWidth, sigHeight);
        } else if (protocol.status === 'completed') {
            doc.rect(width - margin - 90 - sigWidth, currentY, sigWidth, sigHeight);
            doc.text(fixRtl('חתום (קובץ בענן)'), width - margin - 90 - (sigWidth/2), currentY + (sigHeight/2), { align: 'center' });
        } else {
            doc.rect(width - margin - 90 - sigWidth, currentY, sigWidth, sigHeight);
            doc.text(fixRtl('טרם נחתם'), width - margin - 90 - (sigWidth/2), currentY + (sigHeight/2), { align: 'center' });
        }
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('RentMate - Automated Move-in Protocol', width / 2, 285, { align: 'center' });
        doc.text(`Generated at: ${new Date().toISOString()}`, width / 2, 290, { align: 'center' });

        const pdfArrayBuffer = doc.output('arraybuffer');
        
        const fileName = `${property.id}_protocol_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('property_documents')
            .upload(fileName, pdfArrayBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });
            
        if (uploadError) {
            console.error('Doc upload error:', uploadError);
            throw uploadError;
        } else {
            await supabase.from('property_documents').insert({
                user_id: property.user_id,
                property_id: property.id,
                category: 'legal',
                storage_bucket: 'property_documents',
                storage_path: fileName,
                file_name: `Protocol_${formatDate(protocol.date).replace(/\//g,'-')}.pdf`,
                document_date: new Date().toISOString().split('T')[0],
                title: titleText,
            });
        }

        return new Response(
            JSON.stringify({ success: true, message: 'PDF generated successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[GenerateProtocolPDF] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}));
