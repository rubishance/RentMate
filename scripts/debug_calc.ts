import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Must load .env.local to get Supabase keys
dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCalc() {
    // Find any active contract with linkage
    const { data: contracts } = await supabase
        .from('contracts')
        .select('*, user_profiles(email)')
        .eq('status', 'active')
        .neq('linkage_type', 'none')
        .not('base_index_date', 'is', null)
        .limit(5);
        
    if (!contracts || contracts.length === 0) return console.log("No indexed contracts found");
    
    for (const c of contracts || []) {
        if (c.linkage_type === 'none' || !c.base_index_date) continue;
        
        console.log(`Contract ID: ${c.id}`);
        console.log(`Base Rent: ${c.base_rent}`);
        console.log(`Linkage Type: ${c.linkage_type}`);
        console.log(`Linkage Sub Type: ${c.linkage_sub_type}`);
        console.log(`Base Date: ${c.base_index_date}`);

        const { data: payments } = await supabase.from('payments').select('*').eq('contract_id', c.id).eq('status', 'pending');
        
        let targetMonthStr = "2026-03"; // Simulating current month in UI
        const expectedPayment = payments?.find(p => p.due_date.startsWith(targetMonthStr));
        
        if (expectedPayment) {
            console.log(`Target Month: ${targetMonthStr}, Due Date: ${expectedPayment.due_date}`);
            
            // To simulate calculating... I'll just fetch the records from index_data.
            const { data: indices } = await supabase.from('index_data').select('*').eq('index_type', c.linkage_type);
            
            console.log(`Index DB has ${indices?.length || 0} records for ${c.linkage_type}`);
            
            // Replicating useIndexedPayments logic logic:
            const targetDateStr = expectedPayment.due_date.substring(0, 7);
            const baseDateStr = c.base_index_date.substring(0, 7);
            
            let adjustedTargetDate = targetDateStr;
            let adjustedBaseDate = baseDateStr;
            
            console.log(`Initial Target Date: ${targetDateStr}`);
            console.log(`Initial Base Date: ${baseDateStr}`);
            
            if (c.linkage_sub_type === 'known') {
                const parseISO = (s: string) => new Date(s + '-01');
                const tDateObj = parseISO(targetDateStr);
                const bDateObj = parseISO(baseDateStr);
                
                tDateObj.setMonth(tDateObj.getMonth() - 1);
                bDateObj.setMonth(bDateObj.getMonth() - 1);
                
                adjustedTargetDate = `${tDateObj.getFullYear()}-${(tDateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                adjustedBaseDate = `${bDateObj.getFullYear()}-${(bDateObj.getMonth() + 1).toString().padStart(2, '0')}`;
            }

            console.log(`Adjusted Target Date (Known index shifted): ${adjustedTargetDate}`);
            console.log(`Adjusted Base Date (Known index shifted): ${adjustedBaseDate}`);

            const getIndex = (dateStr: string) => {
                return indices?.find(i => i.date === dateStr)?.value || null;
            };

            const baseIndexVal = getIndex(adjustedBaseDate);
            let targetIndexVal = getIndex(adjustedTargetDate);

            console.log(`Base Index Value for ${adjustedBaseDate}: ${baseIndexVal}`);
            console.log(`Target Index Value for ${adjustedTargetDate}: ${targetIndexVal}`);

            if (!targetIndexVal) {
                console.log('Target index null, trying fallback...');
                for(let i=1; i<=2; i++) {
                    const tDateObj = new Date(adjustedTargetDate + '-01');
                    tDateObj.setMonth(tDateObj.getMonth() - i);
                    const fallbackDate = `${tDateObj.getFullYear()}-${(tDateObj.getMonth() + 1).toString().padStart(2, '0')}`;
                    const fallbackVal = getIndex(fallbackDate);
                    console.log(`Fallback ${i} (${fallbackDate}): ${fallbackVal}`);
                    if (fallbackVal) {
                        targetIndexVal = fallbackVal;
                        break;
                    }
                }
            }

            if (baseIndexVal && targetIndexVal) {
                const rawRatio = targetIndexVal / baseIndexVal;
                const linkageCoefficient = (rawRatio - 1) * 100;
                
                let newRent = c.base_rent * (1 + (linkageCoefficient / 100));
                
                // Let's check chaining config...
                console.log(`rawRatio: ${rawRatio}, Coefficient: ${linkageCoefficient}%`);
                console.log(`CALCULATED RENT: ${Math.round(newRent)} (Base: ${c.base_rent})`);
            } else {
                console.log(`COULD NOT CALCULATE: missing base or target index.`);
            }
        }
        console.log('---');
    }
}

debugCalc().catch(console.error);
