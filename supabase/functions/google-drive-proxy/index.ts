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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            throw new Error('Unauthorized');
        }

        const { action, ...params } = await req.json();

        switch (action) {
            case 'exchange_code':
                return await exchangeCodeForTokens(user.id, params.code, supabaseClient);

            case 'upload_file':
                return await uploadFile(user.id, params.file, params.folderId, supabaseClient);

            case 'list_files':
                return await listFiles(user.id, params.folderId, supabaseClient);

            case 'delete_file':
                return await deleteFile(user.id, params.fileId, supabaseClient);

            case 'create_folder':
                return await createFolder(user.id, params.name, params.parentId, supabaseClient);

            default:
                throw new Error('Invalid action');
        }
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

async function exchangeCodeForTokens(userId: string, code: string, supabase: any) {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            redirect_uri: `${Deno.env.get('APP_URL')}/auth/google/callback`,
            grant_type: 'authorization_code',
        }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
        throw new Error(tokens.error_description || 'Failed to exchange code');
    }

    // Create RentMate folder in user's Drive
    const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: 'RentMate',
            mimeType: 'application/vnd.google-apps.folder',
        }),
    });

    const folder = await folderResponse.json();

    // Store refresh token (encrypted) and folder ID
    await supabase
        .from('user_profiles')
        .update({
            google_refresh_token: tokens.refresh_token,
            google_drive_folder_id: folder.id,
            google_drive_enabled: true,
        })
        .eq('id', userId);

    // Audit log
    await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'google_drive_connected',
        details: { folder_id: folder.id },
    });

    return new Response(
        JSON.stringify({ success: true, folderId: folder.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function getAccessToken(userId: string, supabase: any): Promise<string> {
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('google_refresh_token')
        .eq('id', userId)
        .single();

    if (!profile?.google_refresh_token) {
        throw new Error('Google Drive not connected');
    }

    // Refresh access token
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
    return tokens.access_token;
}

async function uploadFile(userId: string, fileData: any, folderId: string, supabase: any) {
    const accessToken = await getAccessToken(userId, supabase);

    // Upload file to Google Drive
    const metadata = {
        name: fileData.name,
        parents: [folderId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileData.content], { type: fileData.mimeType }));

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form,
    });

    const file = await uploadResponse.json();

    return new Response(
        JSON.stringify({ fileId: file.id, name: file.name, webViewLink: file.webViewLink }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function listFiles(userId: string, folderId: string, supabase: any) {
    const accessToken = await getAccessToken(userId, supabase);

    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,createdTime,size,webViewLink)`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const data = await response.json();

    return new Response(
        JSON.stringify({ files: data.files }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function deleteFile(userId: string, fileId: string, supabase: any) {
    const accessToken = await getAccessToken(userId, supabase);

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function createFolder(userId: string, name: string, parentId: string, supabase: any) {
    const accessToken = await getAccessToken(userId, supabase);

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        }),
    });

    const folder = await response.json();

    return new Response(
        JSON.stringify({ folderId: folder.id, name: folder.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}
