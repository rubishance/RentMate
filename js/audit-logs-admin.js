/**
 * Audit Logs Admin Panel
 * Handles loading, displaying, and filtering audit logs for admin users
 */

let currentPage = 1;
const logsPerPage = 50;
let allLogs = [];
let filteredLogs = [];

// Load audit logs from the database
async function loadAuditLogs() {
    const tbody = document.getElementById('auditLogsTableBody');

    try {
        // Fetch all audit logs with user information
        const { data: logs, error } = await window.supabaseService.getClient()
            .from('audit_logs')
            .select(`
                *,
                user_profiles (
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading audit logs:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-danger);">
                        <i class="ph ph-warning-circle" style="font-size: 2rem;"></i>
                        <p>שגיאה בטעינת יומני ביקורת</p>
                    </td>
                </tr>
            `;
            return;
        }

        allLogs = logs || [];
        filteredLogs = allLogs;

        // Populate user filter dropdown
        populateUserFilter();

        // Render logs
        renderLogs();

    } catch (err) {
        console.error('Error in loadAuditLogs:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-danger);">
                    <i class="ph ph-warning-circle" style="font-size: 2rem;"></i>
                    <p>שגיאה בטעינת יומני ביקורת</p>
                </td>
            </tr>
        `;
    }
}

// Render logs to table
function renderLogs() {
    const tbody = document.getElementById('auditLogsTableBody');
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem;">
                    <i class="ph ph-clipboard-text" style="font-size: 2rem; color: var(--color-text-secondary);"></i>
                    <p>אין יומני ביקורת להצגה</p>
                </td>
            </tr>
        `;
        pagination.style.display = 'none';
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = Math.min(startIndex + logsPerPage, filteredLogs.length);
    const logsToShow = filteredLogs.slice(startIndex, endIndex);

    // Render table rows
    tbody.innerHTML = logsToShow.map(log => `
        <tr>
            <td>${formatDateTime(log.created_at)}</td>
            <td>
                <div>
                    <strong>${log.user_profiles?.full_name || 'לא ידוע'}</strong>
                    <br>
                    <small style="color: var(--color-text-secondary);">${log.user_profiles?.email || ''}</small>
                </div>
            </td>
            <td>${getActionLabel(log.action)}</td>
            <td>${formatDetails(log.details)}</td>
            <td>${log.ip_address || '-'}</td>
        </tr>
    `).join('');

    // Update pagination
    if (filteredLogs.length > logsPerPage) {
        pagination.style.display = 'flex';
        paginationInfo.textContent = `מציג ${startIndex + 1}-${endIndex} מתוך ${filteredLogs.length}`;

        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');

        btnPrev.disabled = currentPage === 1;
        btnNext.disabled = endIndex >= filteredLogs.length;
    } else {
        pagination.style.display = 'none';
    }
}

// Populate user filter dropdown
function populateUserFilter() {
    const filterUser = document.getElementById('filterUser');
    const users = new Map();

    allLogs.forEach(log => {
        if (log.user_profiles && !users.has(log.user_id)) {
            users.set(log.user_id, log.user_profiles);
        }
    });

    const options = Array.from(users.values())
        .map(user => `<option value="${user.email}">${user.full_name || user.email}</option>`)
        .join('');

    filterUser.innerHTML = '<option value="">הכל</option>' + options;
}

// Apply filters
function applyFilters() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const action = document.getElementById('filterAction').value;
    const userEmail = document.getElementById('filterUser').value;

    filteredLogs = allLogs.filter(log => {
        // Date filter
        if (startDate && new Date(log.created_at) < new Date(startDate)) return false;
        if (endDate && new Date(log.created_at) > new Date(endDate + 'T23:59:59')) return false;

        // Action filter
        if (action && log.action !== action) return false;

        // User filter
        if (userEmail && log.user_profiles?.email !== userEmail) return false;

        return true;
    });

    currentPage = 1;
    renderLogs();
}

// Clear filters
function clearFilters() {
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('filterAction').value = '';
    document.getElementById('filterUser').value = '';

    filteredLogs = allLogs;
    currentPage = 1;
    renderLogs();
}

// Export to CSV
function exportToCSV() {
    if (filteredLogs.length === 0) {
        alert('אין נתונים לייצוא');
        return;
    }

    const headers = ['תאריך ושעה', 'משתמש', 'אימייל', 'פעולה', 'פרטים', 'כתובת IP'];
    const rows = filteredLogs.map(log => [
        formatDateTime(log.created_at),
        log.user_profiles?.full_name || 'לא ידוע',
        log.user_profiles?.email || '',
        getActionLabel(log.action),
        formatDetailsForCSV(log.details),
        log.ip_address || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Hebrew support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper: Get action label in Hebrew
function getActionLabel(action) {
    const labels = {
        'user_role_changed': 'שינוי תפקיד משתמש',
        'user_status_changed': 'שינוי סטטוס משתמש',
        'user_created': 'משתמש נוצר',
        'user_deleted': 'משתמש נמחק',
        'login': 'התחברות',
        'logout': 'התנתקות',
        'property_created': 'נכס נוצר',
        'property_updated': 'נכס עודכן',
        'property_deleted': 'נכס נמחק',
        'contract_created': 'חוזה נוצר',
        'contract_updated': 'חוזה עודכן',
        'contract_deleted': 'חוזה נמחק'
    };
    return labels[action] || action;
}

// Helper: Format details object
function formatDetails(details) {
    if (!details) return '-';
    if (typeof details === 'string') return details;

    const formatted = Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

    return formatted || '-';
}

// Helper: Format details for CSV
function formatDetailsForCSV(details) {
    if (!details) return '';
    if (typeof details === 'string') return details;

    return JSON.stringify(details);
}

// Helper: Format date and time
function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Filter buttons
    document.getElementById('btnApplyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('btnClearFilters')?.addEventListener('click', clearFilters);

    // Export button
    document.getElementById('btnExportLogs')?.addEventListener('click', exportToCSV);

    // Pagination buttons
    document.getElementById('btnPrevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderLogs();
        }
    });

    document.getElementById('btnNextPage')?.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredLogs.length / logsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderLogs();
        }
    });
});

// Export functions
window.loadAuditLogs = loadAuditLogs;
