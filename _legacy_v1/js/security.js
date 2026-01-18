/**
 * RentMate Security Utilities
 * Provides input sanitization, file validation, and security helpers
 */

/**
 * INPUT SANITIZATION
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Create a temporary div element
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Sanitize HTML while allowing safe tags
 * @param {string} html - HTML to sanitize
 * @param {Array} allowedTags - Tags to allow (default: ['b', 'i', 'em', 'strong'])
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html, allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br']) {
    if (typeof html !== 'string') return html;

    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove all tags except allowed ones
    const allElements = div.querySelectorAll('*');
    allElements.forEach(el => {
        if (!allowedTags.includes(el.tagName.toLowerCase())) {
            el.replaceWith(el.textContent);
        }
    });

    return div.innerHTML;
}

/**
 * Escape special characters for safe display
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
    if (typeof str !== 'string') return str;

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, char => escapeMap[char]);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Israeli format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
function validatePhone(phone) {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');

    // Israeli phone: 10 digits starting with 0
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(cleaned);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, strength: string, message: string }
 */
function validatePassword(password) {
    const result = {
        valid: false,
        strength: 'weak',
        message: ''
    };

    if (password.length < 8) {
        result.message = 'הסיסמה חייבת להכיל לפחות 8 תווים';
        return result;
    }

    let strength = 0;

    // Check criteria
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
        result.strength = 'weak';
        result.message = 'סיסמה חלשה - הוסף אותיות גדולות, מספרים ותווים מיוחדים';
    } else if (strength === 3) {
        result.strength = 'medium';
        result.valid = true;
        result.message = 'סיסמה בינונית';
    } else {
        result.strength = 'strong';
        result.valid = true;
        result.message = 'סיסמה חזקה';
    }

    return result;
}

/**
 * FILE VALIDATION
 */

/**
 * Allowed file types for uploads
 */
const ALLOWED_FILE_TYPES = {
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    all: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * Maximum file sizes (in bytes)
 */
const MAX_FILE_SIZES = {
    image: 10 * 1024 * 1024,      // 10MB
    document: 20 * 1024 * 1024,   // 20MB
    default: 10 * 1024 * 1024     // 10MB
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, error: string }
 */
function validateFile(file, options = {}) {
    const {
        allowedTypes = ALLOWED_FILE_TYPES.all,
        maxSize = MAX_FILE_SIZES.default,
        category = 'all'
    } = options;

    const result = {
        valid: false,
        error: ''
    };

    // Check if file exists
    if (!file) {
        result.error = 'לא נבחר קובץ';
        return result;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        result.error = 'סוג קובץ לא נתמך. אנא העלה PDF או תמונה';
        return result;
    }

    // Check file size
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        result.error = `הקובץ גדול מדי. גודל מקסימלי: ${maxSizeMB}MB`;
        return result;
    }

    // Check file name
    const fileName = file.name;
    if (fileName.length > 255) {
        result.error = 'שם הקובץ ארוך מדי';
        return result;
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (dangerousExtensions.includes(fileExtension)) {
        result.error = 'סוג קובץ מסוכן';
        return result;
    }

    result.valid = true;
    return result;
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension (lowercase, without dot)
 */
function getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "2.5 MB")
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * RATE LIMITING (Client-side)
 */

const rateLimitStore = {};

/**
 * Check if action is rate limited
 * @param {string} action - Action identifier
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remainingAttempts: number, resetTime: Date }
 */
function checkRateLimit(action, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const key = action;

    if (!rateLimitStore[key]) {
        rateLimitStore[key] = {
            attempts: 0,
            resetTime: now + windowMs
        };
    }

    const store = rateLimitStore[key];

    // Reset if window has passed
    if (now > store.resetTime) {
        store.attempts = 0;
        store.resetTime = now + windowMs;
    }

    // Increment attempts
    store.attempts++;

    const allowed = store.attempts <= maxAttempts;
    const remainingAttempts = Math.max(0, maxAttempts - store.attempts);

    return {
        allowed,
        remainingAttempts,
        resetTime: new Date(store.resetTime)
    };
}

/**
 * Reset rate limit for an action
 * @param {string} action - Action identifier
 */
function resetRateLimit(action) {
    delete rateLimitStore[action];
}

/**
 * CSRF PROTECTION
 */

/**
 * Generate CSRF token
 * @returns {string} CSRF token
 */
function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store CSRF token in session
 * @param {string} token - CSRF token
 */
function storeCSRFToken(token) {
    sessionStorage.setItem('csrf_token', token);
}

/**
 * Get CSRF token from session
 * @returns {string|null} CSRF token
 */
function getCSRFToken() {
    return sessionStorage.getItem('csrf_token');
}

/**
 * Validate CSRF token
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid
 */
function validateCSRFToken(token) {
    const storedToken = getCSRFToken();
    return storedToken && storedToken === token;
}

/**
 * SECURITY HELPERS
 */

/**
 * Check if running on HTTPS
 * @returns {boolean} True if HTTPS
 */
function isSecureConnection() {
    return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

/**
 * Warn if not on HTTPS (except localhost)
 */
function enforceHTTPS() {
    if (!isSecureConnection() && window.location.hostname !== 'localhost') {
        console.warn('⚠️ WARNING: Not using HTTPS! This is insecure for production.');

        // Optionally redirect to HTTPS
        if (confirm('האתר אינו מאובטח. האם להעביר ל-HTTPS?')) {
            window.location.href = window.location.href.replace('http://', 'https://');
        }
    }
}

/**
 * Generate random ID
 * @param {number} length - Length of ID
 * @returns {string} Random ID
 */
function generateRandomId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Debounce function to limit rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export to global scope
window.securityUtils = {
    // Input sanitization
    sanitizeInput,
    sanitizeHTML,
    escapeHTML,
    validateEmail,
    validatePhone,
    validatePassword,

    // File validation
    validateFile,
    getFileExtension,
    formatFileSize,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZES,

    // Rate limiting
    checkRateLimit,
    resetRateLimit,

    // CSRF protection
    generateCSRFToken,
    storeCSRFToken,
    getCSRFToken,
    validateCSRFToken,

    // Security helpers
    isSecureConnection,
    enforceHTTPS,
    generateRandomId,
    debounce
};

console.log('Security utilities loaded');
