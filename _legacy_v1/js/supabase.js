
/**
 * RentMate Supabase Client Wrapper
 * Handles authenticating and interacting with the backend database.
 */

class SupabaseService {
    constructor() {
        this.client = null;
    }

    /**
     * Initialize the Supabase client
     * Expects CONFIG global to be available
     */
    init() {
        if (!CONFIG.supabaseUrl || CONFIG.supabaseUrl.includes('YOUR_SUPABASE') ||
            !CONFIG.supabaseKey || CONFIG.supabaseKey.includes('YOUR_SUPABASE')) {
            console.warn('Supabase not configured. Using local mode.');
            return false;
        }

        if (typeof supabase === 'undefined') {
            console.error('Supabase SDK not loaded.');
            return false;
        }

        this.client = supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
        console.log('Supabase client initialized');
        return true;
    }

    /**
     * Get Client Instance
     */
    getClient() {
        return this.client;
    }

    /**
     * Generic Select
     */
    async get(table, select = '*') {
        if (!this.client) return { error: 'Not initialized' };
        return await this.client.from(table).select(select);
    }

    /**
     * Generic Insert
     */
    async add(table, data) {
        if (!this.client) return { error: 'Not initialized' };
        return await this.client.from(table).insert(data).select();
    }

    /**
     * Generic Update
     */
    async update(table, id, data) {
        if (!this.client) return { error: 'Not initialized' };
        return await this.client.from(table).update(data).eq('id', id).select();
    }

    /**
     * Upload File to Storage
     */
    async uploadFile(bucket, path, file) {
        if (!this.client) return { error: 'Not initialized' };

        // Upload
        const { data, error } = await this.client.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) return { error };

        // Get Public URL
        const { data: { publicUrl } } = this.client.storage.from(bucket).getPublicUrl(path);

        return { data: { ...data, publicUrl } };
    }

    /**
     * Authentication Methods
     */

    /**
     * Sign up a new user
     */
    async signUp(email, password, name) {
        if (!this.client) return { error: 'Not initialized' };

        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });

        return { data, error };
    }

    /**
     * Sign in an existing user
     */
    async signIn(email, password) {
        if (!this.client) return { error: 'Not initialized' };

        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        return { data, error };
    }

    /**
     * Sign out the current user
     */
    async signOut() {
        if (!this.client) return { error: 'Not initialized' };

        const { error } = await this.client.auth.signOut();
        return { error };
    }

    /**
     * Send password reset email
     */
    async resetPassword(email) {
        if (!this.client) return { error: 'Not initialized' };

        const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });

        return { data, error };
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        if (!this.client) return { data: { user: null }, error: null };

        const { data, error } = await this.client.auth.getUser();
        return { data, error };
    }

    /**
     * Get current session
     */
    async getSession() {
        if (!this.client) return { data: { session: null }, error: null };

        const { data, error } = await this.client.auth.getSession();
        return { data, error };
    }

    /**
     * Listen for auth state changes
     */
    onAuthStateChange(callback) {
        if (!this.client) return { data: { subscription: null } };

        const { data } = this.client.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });

        return data;
    }

    /**
     * Generic Delete
     */
    async delete(table, id) {
        if (!this.client) return { error: 'Not initialized' };
        return await this.client.from(table).delete().eq('id', id);
    }

    /**
     * Get One Record
     */
    async getOne(table, id) {
        if (!this.client) return { error: 'Not initialized' };
        const { data, error } = await this.client.from(table).select('*').eq('id', id).single();
        return error ? null : data;
    }

    /**
     * USER PROFILE MANAGEMENT
     */

    /**
     * Get user profile by ID
     */
    async getUserProfile(userId) {
        if (!this.client) return null;

        const { data, error } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        return error ? null : data;
    }

    /**
     * Get all users (admin only)
     */
    async getAllUsers() {
        if (!this.client) return { data: [], error: 'Not initialized' };

        return await this.client
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
    }

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId, role) {
        if (!this.client) return { error: 'Not initialized' };

        // Call the database function
        const { data, error } = await this.client.rpc('set_user_role', {
            target_user_id: userId,
            new_role: role
        });

        return { data, error };
    }

    /**
     * Toggle user active status (admin only)
     */
    async toggleUserActive(userId, isActive) {
        if (!this.client) return { error: 'Not initialized' };

        // Call the database function
        const { data, error } = await this.client.rpc('toggle_user_active', {
            target_user_id: userId,
            active_status: isActive
        });

        return { data, error };
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin() {
        if (!this.client) return { error: 'Not initialized' };

        const { data, error } = await this.client.rpc('update_last_login');
        return { data, error };
    }

    /**
     * Log admin action to audit log
     */
    async logAdminAction(action, details = {}) {
        if (!this.client) return { error: 'Not initialized' };

        const { data, error } = await this.client.rpc('log_admin_action', {
            action_name: action,
            action_details: details
        });

        return { data, error };
    }

    /**
     * Get audit logs (admin only)
     */
    async getAuditLogs(limit = 50) {
        if (!this.client) return { data: [], error: 'Not initialized' };

        return await this.client
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
    }
}

// Global instance
window.supabaseService = new SupabaseService();
