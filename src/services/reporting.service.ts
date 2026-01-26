import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import type { Property, PropertyDocument, Payment } from '../types/database';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export interface ReportData {
    property: Property;
    periodStart: string;
    periodEnd: string;
    payments: Payment[];
    utilities: PropertyDocument[];
    totals: {
        income: number;
        expenses: number;
        net: number;
    };
}

export const ReportService = {
    /**
     * Aggregates data for a specific property and time range
     */
    async fetchReportData(propertyId: string, startDate: string, endDate: string): Promise<ReportData> {
        // 1. Fetch Property
        const { data: property } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (!property) throw new Error('Property not found');

        // 2. Fetch Payments in range
        const { data: payments } = await supabase
            .from('payments')
            .select('*')
            .eq('contract_id', (await supabase.from('contracts').select('id').eq('property_id', propertyId).limit(1).single()).data?.id || '') // Simplification for now
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        // 3. Fetch Utilities in range
        const { data: utilities } = await supabase
            .from('property_documents')
            .select('*')
            .eq('property_id', propertyId)
            .like('category', 'utility_%')
            .gte('document_date', startDate)
            .lte('document_date', endDate);

        const totalIncome = (payments || []).reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0);
        const totalExpenses = (utilities || []).reduce((sum, u) => sum + (u.amount || 0), 0);

        return {
            property,
            periodStart: startDate,
            periodEnd: endDate,
            payments: payments || [],
            utilities: utilities || [],
            totals: {
                income: totalIncome,
                expenses: totalExpenses,
                net: totalIncome - totalExpenses
            }
        };
    },

    /**
     * Generates a professional PDF report
     */
    generatePDF(data: ReportData, lang: 'he' | 'en' = 'he') {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true
        });

        // RTL Support (Simple)
        const isRtl = lang === 'he';
        const margin = 20;
        const width = doc.internal.pageSize.getWidth();

        // Colors
        const primaryColor = [15, 23, 42]; // Slate 900
        const accentColor = [79, 70, 229]; // Indigo 600

        // Header Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, width, 40, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        const title = isRtl ? 'דוח ביצועים חודשי' : 'Monthly Performance Report';
        doc.text(title, isRtl ? width - margin : margin, 20, { align: isRtl ? 'right' : 'left' });

        doc.setFontSize(10);
        const subtitle = `${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`;
        doc.text(subtitle, isRtl ? width - margin : margin, 32, { align: isRtl ? 'right' : 'left' });

        // Property Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(14);
        doc.text(data.property.address, isRtl ? width - margin : margin, 55, { align: isRtl ? 'right' : 'left' });
        doc.setFontSize(10);
        doc.text(data.property.city, isRtl ? width - margin : margin, 62, { align: isRtl ? 'right' : 'left' });

        // Financial Summary Cards (Simulated with Rects)
        const cardWidth = (width - (margin * 3)) / 2;

        // Income Card
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(margin, 70, cardWidth, 30, 3, 3);
        doc.setFontSize(10);
        doc.text(isRtl ? 'סה"כ הכנסות' : 'Total Income', margin + 5, 80);
        doc.setFontSize(14);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`${data.totals.income.toLocaleString()} ILS`, margin + 5, 90);

        // Net Card
        doc.setTextColor(50, 50, 50);
        doc.roundedRect(margin + cardWidth + margin / 2, 70, cardWidth, 30, 3, 3);
        doc.setFontSize(10);
        doc.text(isRtl ? 'רווח נקי (לפני מס)' : 'Net Cash Flow', margin + cardWidth + margin / 2 + 5, 80);
        doc.setFontSize(14);
        const netColor = data.totals.net >= 0 ? [16, 185, 129] : [239, 68, 68];
        doc.setTextColor(netColor[0], netColor[1], netColor[2]);
        doc.text(`${data.totals.net.toLocaleString()} ILS`, margin + cardWidth + margin / 2 + 5, 90);

        // Detailed Table - Income
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(12);
        doc.text(isRtl ? 'פירוט תקבולים' : 'Income Details', isRtl ? width - margin : margin, 115, { align: isRtl ? 'right' : 'left' });

        const incomeRows = data.payments.map(p => [
            formatDate(p.due_date),
            p.status,
            `${(p.paid_amount || p.amount).toLocaleString()} ILS`
        ]);

        doc.autoTable({
            startY: 120,
            head: [[isRtl ? 'תאריך' : 'Date', isRtl ? 'סטטוס' : 'Status', isRtl ? 'סכום' : 'Amount']],
            body: incomeRows,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            styles: { halign: isRtl ? 'right' : 'left' }
        });

        // Detailed Table - Utilities
        const utilitiesStartY = (doc as any).lastAutoTable.finalY + 15;
        doc.text(isRtl ? 'הוצאות ושירותים' : 'Utility Expenses', isRtl ? width - margin : margin, utilitiesStartY, { align: isRtl ? 'right' : 'left' });

        const utilityRows = data.utilities.map(u => [
            formatDate(u.document_date),
            u.category.replace('utility_', ''),
            `${u.amount?.toLocaleString()} ILS`
        ]);

        doc.autoTable({
            startY: utilitiesStartY + 5,
            head: [[isRtl ? 'תאריך' : 'Date', isRtl ? 'קטגוריה' : 'Category', isRtl ? 'סכום' : 'Amount']],
            body: utilityRows,
            theme: 'striped',
            headStyles: { fillColor: [100, 116, 139] },
            styles: { halign: isRtl ? 'right' : 'left' }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by RentMate - The Smart Property Management App', width / 2, 285, { align: 'center' });

        doc.save(`RentMate_Report_${data.property.address.replace(/\s+/g, '_')}_${data.periodStart}.pdf`);
    }
};
