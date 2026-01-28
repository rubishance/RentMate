
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { targetUserId, clientName } = await req.json();
        const authHeader = req.headers.get('Authorization');

        // Get the admin user who is requesting the export
        const { data: { user: adminUser }, error: adminError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
        if (adminError || !adminUser) throw new Error('Unauthorized');

        // Check if admin has Google Drive enabled AND is actually an admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, google_refresh_token, google_drive_folder_id')
            .eq('id', adminUser.id)
            .single();

        if (profile?.role !== 'admin') {
            throw new Error('Unauthorized: Admin role required');
        }

        if (!profile?.google_refresh_token) {
            throw new Error('Please connect your Google Drive first in System Settings.');
        }

        // Fetch CRM Data
        const { data: interactions, error: fetchError } = await supabase
            .from('crm_interactions')
            .select('*')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Fetch Invoices too
        const { data: invoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

        // Get Google Access Token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: profile.google_refresh_token,
                client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
                client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
                grant_type: 'refresh_token',
            }),
        });
        const tokens = await tokenResponse.json();
        const accessToken = tokens.access_token;

        // Create CSV Content
        let csvContent = `Type,Title,Content,Status,Created At\n`;
        interactions?.forEach(i => {
            csvContent += `"${i.type}","${i.title || ''}","${i.content?.replace(/"/g, '""')}","${i.status}","${i.created_at}"\n`;
        });

        if (invoices && invoices.length > 0) {
            csvContent += `\n\n--- FINANCIAL RECORDS ---\n`;
            csvContent += `Invoice ID,Amount,Status,Date\n`;
            invoices.forEach(inv => {
                csvContent += `"${inv.id}","${inv.amount} ${inv.currency}","${inv.status}","${inv.issue_date}"\n`;
            });
        }

        // Upload to Google Drive as a Spreadsheet
        const metadata = {
            name: `RentMate CRM Export - ${clientName || targetUserId} - ${new Date().toLocaleDateString()}`,
            mimeType: 'application/vnd.google-apps.spreadsheet',
            parents: profile.google_drive_folder_id ? [profile.google_drive_folder_id] : []
        };

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/csv\r\n\r\n' +
            csvContent +
            close_delim;

        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
        });

        const file = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(`Google Upload Failed: ${JSON.stringify(file)}`);

        return new Response(
            JSON.stringify({ success: true, webViewLink: file.webViewLink }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Export Error:', error);
        return new Response(
            JSON.stringify({
                error: error.message,
                details: error.stack,
                hint: 'Check Supabase Edge Function logs for details. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
