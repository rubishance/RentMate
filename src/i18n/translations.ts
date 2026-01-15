import type { Language } from '../types/database';

export type TranslationKeys =
    // Common
    | 'appName'
    | 'loading'
    | 'error'
    | 'save'
    | 'cancel'
    | 'edit'
    | 'delete'
    | 'add'
    | 'search'
    | 'actions'

    // Auth
    | 'login'
    | 'logout'
    | 'welcomeBack'

    // Dashboard
    | 'dashboardTitle'
    | 'totalProperties'
    | 'activeTenants'
    | 'monthlyRevenue'
    | 'occupancyRate'
    | 'recentActivity'
    | 'quickActions'

    // Entities
    | 'properties'
    | 'tenants'
    | 'contracts'
    | 'payments'
    | 'calculator' // Added missing key

    // Table Headers
    | 'name'
    | 'address'
    | 'city'
    | 'status'
    | 'amount'
    | 'date'

    // Settings
    | 'settings'
    | 'manageAccount'
    | 'account'
    | 'profile'
    | 'managePersonalInfo'
    | 'notifications'
    | 'configureAlerts'
    | 'privacySecurity'
    | 'controlData'
    | 'languageLocalization'
    | 'language'
    | 'gender'
    | 'genderForHebrew'
    | 'male'
    | 'female'
    | 'unspecified'
    | 'support'
    | 'contactSupport'
    | 'contactSupportDesc'
    | 'typeMessageHere'
    | 'sendMessage'
    | 'sending'
    | 'messageSent'
    | 'orEmailDirectly'
    | 'signOut'
    | 'appVersion'

    // Subscription
    | 'currentPlan'
    | 'freeForever'
    | 'greatForGettingStarted'
    | 'upgradeToPro'
    | 'unlockMoreLimits'

    // Contracts
    | 'noActiveContracts'
    | 'noActiveContractsDesc'
    | 'expectedBaseRent'
    | 'generateList';

export const translations: Record<Language, Record<TranslationKeys, string>> = {
    he: {
        appName: 'RentMate',
        loading: 'טוען...',
        error: 'שגיאה',
        save: 'שמור',
        cancel: 'ביטול',
        edit: 'ערוך',
        delete: 'מחק',
        add: 'הוסף',
        search: 'חיפוש...',
        actions: 'פעולות',

        login: 'התחברות',
        logout: 'התנתק',
        welcomeBack: 'ברוך שובך',

        dashboardTitle: 'לוח בקרה',
        totalProperties: 'סה"כ נכסים',
        activeTenants: 'דיירים פעילים',
        monthlyRevenue: 'הכנסה חודשית',
        occupancyRate: 'תפוסה',
        recentActivity: 'פעילות אחרונה',
        quickActions: 'פעולות מהירות',

        properties: 'נכסים',
        tenants: 'דיירים',
        contracts: 'חוזים',
        payments: 'תשלומים',
        calculator: 'מחשבון',

        name: 'שם',
        address: 'כתובת',
        city: 'עיר',
        status: 'סטטוס',
        amount: 'סכום',
        date: 'תאריך',

        settings: 'הגדרות',
        manageAccount: 'נהל את החשבון וההעדפות שלך',
        account: 'חשבון',
        profile: 'פרופיל',
        managePersonalInfo: 'נהל את המידע האישי שלך',
        notifications: 'התראות',
        configureAlerts: 'הגדר התראות ותזכורות',
        privacySecurity: 'פרטיות ואבטחה',
        controlData: 'שלוט במידע ובגישה שלך',
        languageLocalization: 'שפה ולוקליזציה',
        language: 'שפה',
        gender: 'מגדר',
        genderForHebrew: 'מגדר (לטקסט בעברית)',
        male: 'זכר',
        female: 'נקבה',
        unspecified: 'מעדיף/ה לא לציין',
        support: 'תמיכה',
        contactSupport: 'צור קשר עם התמיכה',
        contactSupportDesc: 'יש לך שאלה או צריך עזרה? שלח לנו הודעה ונחזור אליך בהקדם.',
        typeMessageHere: 'הקלד את ההודעה שלך כאן...',
        sendMessage: 'שלח הודעה',
        sending: 'שולח...',
        messageSent: 'ההודעה נשלחה!',
        orEmailDirectly: 'או שלח לנו מייל ישירות ל:',
        signOut: 'התנתק',
        appVersion: 'RentMate v2.0 • Build 2026.01',

        currentPlan: 'תוכנית נוכחית',
        freeForever: 'חינם לתמיד',
        greatForGettingStarted: 'מעולה להתחלה',
        upgradeToPro: 'שדרג ל-Pro',
        unlockMoreLimits: 'פתח יותר אפשרויות',

        noActiveContracts: 'לא נמצאו חוזים פעילים',
        noActiveContractsDesc: 'אין לך חוזים פעילים כרגע',
        expectedBaseRent: 'דמי שכירות בסיס צפויים',
        generateList: 'צור רשימה'
    },
    en: {
        appName: 'RentMate',
        loading: 'Loading...',
        error: 'Error',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        add: 'Add',
        search: 'Search...',
        actions: 'Actions',

        login: 'Login',
        logout: 'Logout',
        welcomeBack: 'Welcome Back',

        dashboardTitle: 'Dashboard',
        totalProperties: 'Total Properties',
        activeTenants: 'Active Tenants',
        monthlyRevenue: 'Monthly Revenue',
        occupancyRate: 'Occupancy Rate',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',

        properties: 'Properties',
        tenants: 'Tenants',
        contracts: 'Contracts',
        payments: 'Payments',
        calculator: 'Calculator',

        name: 'שם',
        address: 'כתובת',
        city: 'עיר',
        status: 'סטטוס',
        amount: 'סכום',
        date: 'תאריך',

        settings: 'הגדרות',
        manageAccount: 'נהל את החשבון וההעדפות שלך',
        account: 'חשבון',
        profile: 'פרופיל',
        managePersonalInfo: 'נהל את המידע האישי שלך',
        notifications: 'התראות',
        configureAlerts: 'הגדר התראות ותזכורות',
        privacySecurity: 'פרטיות ואבטחה',
        controlData: 'שלוט במידע ובגישה שלך',
        languageLocalization: 'שפה ולוקליזציה',
        language: 'שפה',
        gender: 'מגדר',
        genderForHebrew: 'מגדר (לטקסט בעברית)',
        male: 'זכר',
        female: 'נקבה',
        unspecified: 'מעדיף/ה לא לציין',
        support: 'תמיכה',
        contactSupport: 'צור קשר עם התמיכה',
        contactSupportDesc: 'יש לך שאלה או צריך עזרה? שלח לנו הודעה ונחזור אליך בהקדם.',
        typeMessageHere: 'הקלד את ההודעה שלך כאן...',
        sendMessage: 'שלח הודעה',
        sending: 'שולח...',
        messageSent: 'ההודעה נשלחה!',
        orEmailDirectly: 'או שלח לנו מייל ישירות ל:',
        signOut: 'התנתק',
        appVersion: 'RentMate v2.0 • Build 2026.01',

        currentPlan: 'תוכנית נוכחית',
        freeForever: 'חינם לתמיד',
        greatForGettingStarted: 'מעולה להתחלה',
        upgradeToPro: 'שדרג ל-Pro',
        unlockMoreLimits: 'פתח יותר אפשרויות',

        noActiveContracts: 'לא נמצאו חוזים פעילים',
        noActiveContractsDesc: 'אין לך חוזים פעילים כרגע',
        expectedBaseRent: 'דמי שכירות בסיס צפויים',
        generateList: 'צור רשימה'
    },
    en: {
        appName: 'RentMate',
        loading: 'Loading...',
        error: 'Error',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        add: 'Add',
        search: 'Search...',
        actions: 'Actions',

        login: 'Login',
        logout: 'Logout',
        welcomeBack: 'Welcome Back',

        dashboardTitle: 'Dashboard',
        totalProperties: 'Total Properties',
        activeTenants: 'Active Tenants',
        monthlyRevenue: 'Monthly Revenue',
        occupancyRate: 'Occupancy Rate',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',

        properties: 'Properties',
        tenants: 'Tenants',
        contracts: 'Contracts',
        payments: 'Payments',
        calculator: 'Calculator',

        name: 'Name',
        address: 'Address',
        city: 'City',
        status: 'Status',
        amount: 'Amount',
        date: 'Date',

        settings: 'Settings',
        manageAccount: 'Manage your account and preferences',
        account: 'Account',
        profile: 'Profile',
        managePersonalInfo: 'Manage your personal information',
        notifications: 'Notifications',
        configureAlerts: 'Configure alerts and reminders',
        privacySecurity: 'Privacy & Security',
        controlData: 'Control your data and access',
        languageLocalization: 'Language & Localization',
        language: 'Language',
        gender: 'Gender',
        genderForHebrew: 'Gender (for Hebrew text)',
        male: 'Male',
        female: 'Female',
        unspecified: 'Rather Not Say',
        support: 'Support',
        contactSupport: 'Contact Support',
        contactSupportDesc: 'Have a question or need help? Send us a message and we\'ll get back to you soon.',
        typeMessageHere: 'Type your message here...',
        sendMessage: 'Send Message',
        sending: 'Sending...',
        messageSent: 'Message Sent!',
        orEmailDirectly: 'Or email us directly at:',
        signOut: 'Sign Out',
        appVersion: 'RentMate v2.0 • Build 2026.01',

        currentPlan: 'Current Plan',
        freeForever: 'Free Forever',
        greatForGettingStarted: 'Great for getting started',
        upgradeToPro: 'Upgrade to Pro',
        unlockMoreLimits: 'Unlock more limits',

        noActiveContracts: 'No active contracts found',
        noActiveContractsDesc: 'You have no active contracts at the moment',
        expectedBaseRent: 'Expected Base Rent',
        generateList: 'Generate List'
    }
};

// Hook to use translations in components
import { useUserPreferences } from '../contexts/UserPreferencesContext';

export function useTranslation() {
    const { preferences } = useUserPreferences();

    const t = (key: TranslationKeys): string => {
        return translations[preferences.language][key];
    };

    return { t };
}

