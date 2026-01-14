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
    | 'date';

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
        date: 'תאריך'
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
        date: 'Date'
    }
};
