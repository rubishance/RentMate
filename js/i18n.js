/**
 * RentMate Internationalization (i18n) System
 * Supports Hebrew (M/F), English, and Russian
 */

class I18n {
    constructor() {
        this.currentLang = 'he-m'; // default: Hebrew masculine
        this.translations = {};
    }

    /**
     * Initialize i18n system
     */
    async init() {
        // Load language preference from IndexedDB
        if (window.rentMateDB && window.rentMateDB.db) {
            const savedLang = await window.rentMateDB.getSetting('language');
            if (savedLang) {
                this.currentLang = savedLang;
            }
        }

        // Load translation file
        await this.loadTranslations(this.currentLang);

        // Update DOM
        this.updateDOM();
    }

    /**
     * Load translation file
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/translations/${lang}.json`);
            this.translations = await response.json();
            this.currentLang = lang;
        } catch (error) {
            console.error(`Failed to load translations for ${lang}:`, error);
            // Fallback to Hebrew masculine
            if (lang !== 'he-m') {
                await this.loadTranslations('he-m');
            }
        }
    }

    /**
     * Get translation by key
     */
    t(key, params = {}) {
        let text = this.getNestedValue(this.translations, key) || key;

        // Replace parameters
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });

        return text;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Change language
     */
    async changeLanguage(lang) {
        await this.loadTranslations(lang);

        // Save to IndexedDB
        if (window.rentMateDB && window.rentMateDB.db) {
            await window.rentMateDB.saveSetting('language', lang);
        }

        // Update DOM
        this.updateDOM();

        // Update HTML lang and dir attributes
        document.documentElement.lang = lang.startsWith('he') ? 'he' : lang.startsWith('ru') ? 'ru' : 'en';
        document.documentElement.dir = lang.startsWith('he') ? 'rtl' : 'ltr';
    }

    /**
     * Update all elements with data-i18n attribute
     */
    updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return [
            { code: 'he-m', name: 'עברית (זכר)', nativeName: 'עברית (זכר)' },
            { code: 'he-f', name: 'עברית (נקבה)', nativeName: 'עברית (נקבה)' },
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'ru', name: 'Русский', nativeName: 'Русский' }
        ];
    }

    /**
     * Get current language code
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Check if Hebrew is selected (for gender UI)
     */
    isHebrew() {
        return this.currentLang.startsWith('he');
    }
}

// Create global instance
window.i18n = new I18n();
