/**
 * User Management Admin Panel
 * Handles loading, displaying, and managing users for admin users
 */

// Load all users from the database
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');

    try {
        // Fetch all users from user_profiles table
        const { data: users, error } = await window.supabaseService.getClient()
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading users:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-danger);">
                        <i class="ph ph-warning-circle" style="font-size: 2rem;"></i>
                        <p>שגיאה בטעינת משתמשים</p>
                    </td>
                </tr>
            `;
            return;
        }

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">
                        <i class="ph ph-users" style="font-size: 2rem; color: var(--color-text-secondary);"></i>
                        <p>אין משתמשים במערכת</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Render users table
        tbody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}">
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="avatar" style="width: 32px; height: 32px; font-size: 0.85rem;">
                            ${user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <strong>${user.full_name || 'ללא שם'}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <select class="role-select" data-user-id="${user.id}" data-current-role="${user.role}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>משתמש</option>
                        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>מנהל</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>מנהל מערכת</option>
                    </select>
                </td>
                <td>
                    <span class="${user.is_active ? 'user-status-active' : 'user-status-inactive'}">
                        ${user.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                </td>
                <td>${user.last_login ? formatDate(user.last_login) : 'מעולם לא'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-toggle-status" data-user-id="${user.id}" data-is-active="${user.is_active}" title="${user.is_active ? 'השבת משתמש' : 'הפעל משתמש'}">
                            <i class="ph ${user.is_active ? 'ph-lock' : 'ph-lock-open'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners for role changes
        document.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', handleRoleChange);
        });

        // Add event listeners for status toggle
        document.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', handleStatusToggle);
        });

    } catch (err) {
        console.error('Error in loadUsers:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-danger);">
                    <i class="ph ph-warning-circle" style="font-size: 2rem;"></i>
                    <p>שגיאה בטעינת משתמשים</p>
                </td>
            </tr>
        `;
    }
}

// Handle role change
async function handleRoleChange(event) {
    const select = event.target;
    const userId = select.dataset.userId;
    const newRole = select.value;
    const oldRole = select.dataset.currentRole;

    if (newRole === oldRole) return;

    // Confirm change
    if (!confirm(`האם אתה בטוח שברצונך לשנות את התפקיד ל-${getRoleLabel(newRole)}?`)) {
        select.value = oldRole;
        return;
    }

    try {
        // Update role in database
        const { error } = await window.supabaseService.getClient()
            .from('user_profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) throw error;

        // Update current role data attribute
        select.dataset.currentRole = newRole;

        // Log to audit logs
        await logAuditAction('user_role_changed', {
            user_id: userId,
            old_role: oldRole,
            new_role: newRole
        });

        showToast('התפקיד עודכן בהצלחה', 'success');
    } catch (err) {
        console.error('Error updating role:', err);
        select.value = oldRole;
        showToast('שגיאה בעדכון תפקיד', 'error');
    }
}

// Handle status toggle (activate/deactivate user)
async function handleStatusToggle(event) {
    const btn = event.currentTarget;
    const userId = btn.dataset.userId;
    const isActive = btn.dataset.isActive === 'true';
    const newStatus = !isActive;

    // Confirm change
    if (!confirm(`האם אתה בטוח שברצונך ${newStatus ? 'להפעיל' : 'להשבית'} משתמש זה?`)) {
        return;
    }

    try {
        // Update status in database
        const { error } = await window.supabaseService.getClient()
            .from('user_profiles')
            .update({ is_active: newStatus })
            .eq('id', userId);

        if (error) throw error;

        // Log to audit logs
        await logAuditAction('user_status_changed', {
            user_id: userId,
            new_status: newStatus ? 'active' : 'inactive'
        });

        // Reload users to refresh the table
        await loadUsers();

        showToast(`המשתמש ${newStatus ? 'הופעל' : 'הושבת'} בהצלחה`, 'success');
    } catch (err) {
        console.error('Error toggling status:', err);
        showToast('שגיאה בעדכון סטטוס משתמש', 'error');
    }
}

// Log action to audit logs
async function logAuditAction(action, details) {
    try {
        const currentUser = await getCurrentUserData();
        if (!currentUser) return;

        await window.supabaseService.getClient()
            .from('audit_logs')
            .insert({
                user_id: currentUser.id,
                action: action,
                details: details,
                ip_address: null // Could be populated from server-side
            });
    } catch (err) {
        console.error('Error logging audit action:', err);
    }
}

// Helper: Get role label in Hebrew
function getRoleLabel(role) {
    const labels = {
        'user': 'משתמש',
        'manager': 'מנהל',
        'admin': 'מנהל מערכת'
    };
    return labels[role] || role;
}

// Helper: Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Helper: Show toast notification
function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="ph ${type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Search users
function setupSearch() {
    const searchInput = document.getElementById('searchUsers');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#usersTableBody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
});

// Export functions
window.loadUsers = loadUsers;
