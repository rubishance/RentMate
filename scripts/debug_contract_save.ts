
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugContractSave() {
    console.log('--- Starting Contract Save Debug ---');

    // 1. Get a user and property
    const { data: userData, error: userError } = await supabase.from('user_profiles').select('id').limit(1).single();
    if (userError || !userData) {
        console.error('Failed to get user:', userError);
        return;
    }
    const userId = userData.id;

    const { data: propData, error: propError } = await supabase.from('properties').select('id').limit(1).single();
    if (propError || !propData) {
        console.error('Failed to get property:', propError);
        return;
    }
    const propertyId = propData.id;

    console.log(`Using userId: ${userId}, propertyId: ${propertyId}`);

    // 2. Define Sanitization Logic (copied from AddContract.tsx)
    const sanitizePayload = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (obj instanceof Date) return obj.toISOString();
        if (typeof obj === 'number') return (isNaN(obj) || !isFinite(obj)) ? null : obj;
        if (Array.isArray(obj)) return obj.map(sanitizePayload);
        if (typeof obj === 'object') {
            if (obj.constructor && obj.constructor.name !== 'Object') return null;
            const sanitized: any = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    sanitized[key] = sanitizePayload(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };

    // 3. Construct Payload with problematic values
    const contractPayload = {
        property_id: propertyId,
        tenant_id: null, // Test null handling
        tenants: [
            { name: 'Test Tenant', id_number: '123456789', email: 'test@example.com', phone: '050-000-0000' },
            { name: 'Empty Fields', id_number: '', email: null, phone: undefined }
        ],
        signing_date: new Date().toISOString().split('T')[0],
        start_date: '2026-02-01',
        end_date: '2027-01-31',
        base_rent: 5500,
        currency: 'ILS',
        payment_frequency: 'monthly',
        payment_day: 1,
        linkage_type: 'cpi',
        linkage_sub_type: 'known',
        linkage_ceiling: 5,
        linkage_floor: 0,
        base_index_date: '2026-01-01',
        base_index_value: 105.5,
        security_deposit_amount: 11000,
        status: 'active',
        option_periods: [
            { length: 12, unit: 'months', rentAmount: NaN, currency: 'ILS' } // Test NaN
        ],
        rent_periods: [
            { startDate: '2026-02-01', amount: Infinity, currency: 'ILS' } // Test Infinity
        ],
        user_id: userId,
        needs_painting: true
    };

    const sanitizedPayload = sanitizePayload(contractPayload);
    console.log('Sanitized Payload:', JSON.stringify(sanitizedPayload, null, 2));

    // 4. Attempt Insertion
    console.log('Attempting Supabase insertion...');
    const { data: newContract, error: contractError } = await supabase
        .from('contracts')
        .insert(sanitizedPayload)
        .select()
        .single();

    if (contractError) {
        console.error('FAILED TO INSERT:', contractError);
        console.error('Details:', contractError.details);
        console.error('Hint:', contractError.hint);
    } else {
        console.log('SUCCESS! Contract created with ID:', newContract.id);

        // Clean up
        const { error: deleteError } = await supabase.from('contracts').delete().eq('id', newContract.id);
        if (deleteError) {
            console.error('Failed to clean up test contract:', deleteError);
        } else {
            console.log('Test contract cleaned up successfully.');
        }
    }
    console.log('--- Debug Complete ---');
}

debugContractSave().catch(console.error);
