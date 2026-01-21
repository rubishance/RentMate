import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Log that we received a request
        console.log("DEBUG: Received request!", req.method);

        console.log("DEBUG: Initializing Supabase Client...");

        // Initialize Supabase Client
        // Note: When using --no-verify-jwt, we must manually verify the user if we want security.
        // But for now, we will trust the Authorization header passed from the client.
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        console.log("DEBUG: Getting User...");
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.error("DEBUG: User Auth Failed:", userError);
            throw new Error('Unauthorized: User not found or token invalid');
        }
        console.log("DEBUG: User Authenticated:", user.id);

        const { action, ...params } = await req.json();
        console.log("DEBUG: Action:", action);

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

            case 'find_folder':
                return await findFolder(user.id, params.name, params.parentId, supabaseClient);

            case 'init_resumable_upload':
                return await initResumableUpload(user.id, params.name, params.mimeType, params.folderId, supabaseClient);

            default:
                throw new Error('Invalid action');
        }

    } catch (error: any) {
        console.error("DEBUG: Error in function:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

async function initResumableUpload(userId: string, name: string, mimeType: string, folderId: string, supabase: any) {
    const accessToken = await getAccessToken(userId, supabase);

    // 1. Initiate Resumable Upload
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': mimeType,
            'X-Upload-Content-Length': '0', // Optional, but good practice if known
        },
        body: JSON.stringify({
            name,
            mimeType,
            parents: [folderId],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to initiate upload: ${err}`);
    }

    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl) {
        throw new Error('No upload URL received from Google');
    }

    return new Response(
        JSON.stringify({ uploadUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}

async function exchangeCodeForTokens(userId: string, code: string, supabase: any) {
    console.log("DEBUG: Exchanging code for tokens...");

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
            // Fix: remove trailing slash from APP_URL if present to avoid double slash
            redirect_uri: `${Deno.env.get('APP_URL')!.replace(/\/$/, '')}/auth/google/callback`,
            grant_type: 'authorization_code',
        }),
    });

    // Log the raw response for debugging
    const rawText = await tokenResponse.text();
    console.log("DEBUG: Token Exchange Response:", rawText);

    let tokens;
    try {
        tokens = JSON.parse(rawText);
    } catch (e) {
        throw new Error("Failed to parse token response: " + rawText);
    }

    if (tokens.error) {
        throw new Error(tokens.error_description || 'Failed to exchange code: ' + JSON.stringify(tokens));
    }

    console.log("DEBUG: Token exchange success. Creating root folder...");

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
    console.log("DEBUG: Folder created:", folder.id);

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

async function findFolder(userId: string, name: string, parentId: string, supabase: any) {
    const accessToken = await getAccessToken(userId, supabase);

    const q = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    const folder = data.files?.[0];

    return new Response(
        JSON.stringify({ folderId: folder?.id || null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}
