import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) process.exit(1);

import { calculateStandard } from '../src/services/calculator.service';

async function testCalc() {
    try {
        console.log("Testing calculation matching 1b3e6d42-942d-4e13-92fe-3be4446e0a96");
        const result = await calculateStandard({
            baseRent: 6000,
            linkageType: 'cpi',
            baseDate: '2025-12',
            targetDate: '2026-03',
            linkageSubType: 'known',
            linkageCeiling: undefined,
            isIndexBaseMinimum: false, // The subagent said "No"
            partialLinkage: 100
        });
        
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("calculateStandard thrown error:", e);
    }
}
testCalc().catch(console.error);
