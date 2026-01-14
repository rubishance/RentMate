/**
 * RentMate Authentication Utilities
 * Handles authentication state, route protection, user session management, and role-based access control
 */

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
async function isAuthenticated() {
    if (!window.supabaseService || !window.supabaseService.getClient()) {
        return false;
    }

    const { data } = await window.supabaseService.getSession();
    return !!data.session;
}

/**
 * Get current user data with role and profile information
 * @returns {Promise<Object|null>}
 */
async function getCurrentUserData() {
    if (!window.supabaseService || !window.supabaseService.getClient()) {
        return null;
    }

    const { data, error } = await window.supabaseService.getCurrentUser();

    if (error || !data.user) {
        return null;
    }

    // Get user profile with role
    let profile = null;
    try {
        profile = await window.supabaseService.getUserProfile(data.user.id);
    } catch (err) {
        console.warn('Failed to fetch user profile:', err);
    }

    return {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name || data.user.user_metadata?.name || data.user.email.split('@')[0],
        role: profile?.role || 'user',
        is_active: profile?.is_active !== false,
        mfa_enabled: profile?.mfa_enabled || false,
        last_login: profile?.last_login,
        created_at: data.user.created_at
    };
}

/**
 * Get current user's role
 * @returns {Promise<string>} 'user', 'admin', or 'manager'
 */
async function getUserRole() {
    const userData = await getCurrentUserData();
    return userData ? userData.role : 'user';
}

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>}
 */
async function isAdmin() {
    const role = await getUserRole();
    return role === 'admin';
}

/**
 * Check if current user has MFA enabled
 * @returns {Promise<boolean>}
 */
async function checkMFAStatus() {
    const userData = await getCurrentUserData();
    return userData ? userData.mfa_enabled : false;
}

/**
 * Require authentication - redirect to login if not authenticated
 * Call this on protected pages
 * @param {string} requiredRole - Optional role requirement ('admin', 'manager')
 */
async function requireAuth(requiredRole = null) {
    const authenticated = await isAuthenticated();

    if (!authenticated) {
        // Store the current page to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'login.html';
        return false;
    }

    // Check if user is active
    const userData = await getCurrentUserData();
    if (!userData.is_active) {
        alert('חשבונך הושעה. אנא פנה לתמיכה.');
        await logout();
        return false;
    }

    // Check role requirement
    if (requiredRole) {
        const userRole = userData.role;
        if (userRole !== requiredRole && userRole !== 'admin') {
            alert('אין לך הרשאות גישה לדף זה.');
            window.location.href = 'index.html';
            return false;
        }
    }

    // Update last login
    await window.supabaseService.updateLastLogin();

    return true;
}

/**
 * Require admin role - redirect if not admin
 * Call this on admin-only pages
 */
async function requireAdmin() {
    const authenticated = await isAuthenticated();

    if (!authenticated) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'login.html';
        return false;
    }

    const adminStatus = await isAdmin();
    if (!adminStatus) {
        alert('דף זה מיועד למנהלי מערכת בלבד.');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

/**
 * Redirect to dashboard if already authenticated
 * Call this on login/signup pages
 */
async function redirectIfAuthenticated() {
    const authenticated = await isAuthenticated();

    if (authenticated) {
        // Check if there's a redirect URL stored
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || 'index.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectUrl;
    }
}

/**
 * Logout user and redirect to login page
 */
async function logout() {
    if (window.supabaseService) {
        await window.supabaseService.signOut();
    }

    // Clear any local storage
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to login
    window.location.href = 'login.html';
}

/**
 * Update user profile display in the UI
 * @param {Object} user - User data object
 */
function updateUserProfile(user) {
    if (!user) return;

    // Update user name displays
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = user.name;
    });

    // Update avatar with first letter of name
    const avatarElements = document.querySelectorAll('.avatar');
    avatarElements.forEach(el => {
        el.textContent = user.name.charAt(0).toUpperCase();
    });

    // Show admin badge if user is admin
    if (user.role === 'admin') {
        const adminBadges = document.querySelectorAll('.admin-badge');
        adminBadges.forEach(badge => {
            badge.style.display = 'inline-block';
        });

        const adminNavs = document.querySelectorAll('.admin-nav');
        adminNavs.forEach(nav => {
            nav.style.display = 'block';
        });
    }

    // Update welcome messages
    const welcomeElements = document.querySelectorAll('h1');
    welcomeElements.forEach(el => {
        if (el.textContent.includes('ראובן')) {
            el.textContent = el.textContent.replace('ראובן', user.name.split(' ')[0]);
        }
    });
}

/**
 * Initialize authentication state listener
 * Call this on app initialization
 */
function initAuthListener() {
    if (!window.supabaseService || !window.supabaseService.getClient()) {
        return;
    }

    window.supabaseService.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_OUT') {
            // User signed out - redirect to login if on protected page
            const publicPages = ['login.html', 'signup.html', 'reset-password.html'];
            const currentPage = window.location.pathname.split('/').pop();

            if (!publicPages.includes(currentPage)) {
                window.location.href = 'login.html';
            }
        } else if (['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) {
            // User signed in OR page loaded with existing session - update UI with user data
            const userData = await getCurrentUserData();
            if (userData) {
                updateUserProfile(userData);
            }
        }
    });
}

/**
 * Get user ID for database queries
 * @returns {Promise<string|null>}
 */
async function getUserId() {
    const userData = await getCurrentUserData();
    return userData ? userData.id : null;
}

// Export functions to global scope
window.isAuthenticated = isAuthenticated;
window.getCurrentUserData = getCurrentUserData;
window.getUserRole = getUserRole;
window.isAdmin = isAdmin;
window.checkMFAStatus = checkMFAStatus;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.logout = logout;
window.updateUserProfile = updateUserProfile;
window.initAuthListener = initAuthListener;
window.getUserId = getUserId;
