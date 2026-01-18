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
    | 'calculator'
    | 'apartment'
    | 'penthouse'
    | 'garden'
    | 'house'
    | 'other'

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
        apartment: 'דירה',
        penthouse: 'פנטהאוז',
        garden: 'דירת גן',
        house: 'בית פרטי',
        other: 'אחר',

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
        apartment: 'Apartment',
        penthouse: 'Penthouse',
        garden: 'Garden Apartment',
        house: 'Private House',
        other: 'Other',

        name: 'Name',
        address: 'Address',
        city: 'City',
        status: 'Status',
        amount: 'Amount',
        date: 'Date',

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

        noActiveContracts: 'No Active Contracts Found',
        noActiveContractsDesc: 'You have no active contracts at the moment',
        expectedBaseRent: 'דמי שכירות בסיס צפויים',
        generateList: 'צור רשימה'
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

