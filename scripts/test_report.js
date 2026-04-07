import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const propertyId = '0a319f7e-bb7e-46aa-ac0d-5bd7972baae7';

const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

async function test() {
    try {
        console.log("Generating report...");
        
        const { data, error } = await supabase.functions.invoke('generate-report', {
            body: {
                propertyId,
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                lang: 'he',
                includeAssetDetails: true,
                includeExpenses: true,
                selectedExpenseIds: [] 
            }
        });

        if (error) {
            console.error("FUNCTION ERROR:", error);
            return;
        }

        console.log("SUCCESS. PDF Returned! Length:", data?.pdf?.length);
        if (data?.pdf) {
             const base64Data = data.pdf.replace(/^data:application\/pdf;filename=generated.pdf;base64,/, '').replace(/^data:application\/pdf;base64,/, '');
             fs.writeFileSync('out.pdf', base64Data, 'base64');
             console.log("Saved to out.pdf");
        }

    } catch (err) {
        console.error("FATAL ERROR:", err);
    }
}
test();
