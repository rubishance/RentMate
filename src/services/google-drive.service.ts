import { supabase } from '../lib/supabase';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    createdTime: string;
    size?: string;
    webViewLink: string;
}

class GoogleDriveService {
    private readonly clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    private readonly redirectUri = `${window.location.origin}/auth/google/callback`;
    private readonly scope = 'https://www.googleapis.com/auth/drive.file';

    /**
     * Initiate OAuth flow to connect Google Drive
     */
    async connectGoogleDrive(): Promise<void> {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', this.scope);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        window.location.href = authUrl.toString();
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    async handleCallback(code: string): Promise<{ success: boolean; folderId?: string }> {
        const { data, error } = await supabase.functions.invoke('google-drive-proxy', {
            body: { action: 'exchange_code', code },
        });

        if (error) throw error;
        return data;
    }

    /**
     * Upload file to Google Drive
     */
    async uploadFile(file: File, folderId?: string): Promise<{ fileId: string; name: string; webViewLink?: string }> {
        // Convert file to base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke('google-drive-proxy', {
            body: {
                action: 'upload_file',
                file: {
                    name: file.name,
                    mimeType: file.type,
                    content: fileData.split(',')[1], // Remove data URL prefix
                },
                folderId: folderId || await this.getRentMateFolderId(),
            },
        });

        if (error) throw error;
        return data;
    }

    /**
     * List files in a folder
     */
    async listFiles(folderId?: string): Promise<DriveFile[]> {
        const { data, error } = await supabase.functions.invoke('google-drive-proxy', {
            body: {
                action: 'list_files',
                folderId: folderId || await this.getRentMateFolderId(),
            },
        });

        if (error) throw error;
        return data.files;
    }

    /**
     * Delete a file
     */
    async deleteFile(fileId: string): Promise<void> {
        const { error } = await supabase.functions.invoke('google-drive-proxy', {
            body: { action: 'delete_file', fileId },
        });

        if (error) throw error;
    }

    /**
     * Create a folder
     */
    async createFolder(name: string, parentId?: string): Promise<{ folderId: string; name: string }> {
        const { data, error } = await supabase.functions.invoke('google-drive-proxy', {
            body: {
                action: 'create_folder',
                name,
                parentId: parentId || await this.getRentMateFolderId(),
            },
        });

        if (error) throw error;
        return data;
    }

    /**
     * Get RentMate folder ID from user profile
     */
    private async getRentMateFolderId(): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('google_drive_folder_id')
            .eq('id', user.id)
            .single();

        if (error || !profile?.google_drive_folder_id) {
            throw new Error('Google Drive not connected');
        }

        return profile.google_drive_folder_id;
    }

    /**
     * Check if Google Drive is connected
     */
    async isConnected(): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('google_drive_enabled')
            .eq('id', user.id)
            .single();

        return profile?.google_drive_enabled || false;
    }

    /**
     * Disconnect Google Drive
     */
    async disconnect(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        await supabase
            .from('user_profiles')
            .update({
                google_drive_enabled: false,
                google_refresh_token: null,
                google_drive_folder_id: null,
            })
            .eq('id', user.id);
    }
}

export const googleDriveService = new GoogleDriveService();
