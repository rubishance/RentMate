// import { Language } from '../types/database';

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
    | 'addItem'
    | 'expectedBaseRent'
    | 'actualPayments'
    | 'totalBase'
    | 'totalActual'
    | 'advancedReconciliationOptions'

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

    // Table Headers
    | 'name'
    | 'address'
    | 'city'
    | 'status'
    | 'amount'
    | 'date'
    | 'avgUnderpayment'
    | 'percentageOwed';

export const translations: Record<string, Record<TranslationKeys, string>> = {
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

        addItem: 'הוסף פריט',
        expectedBaseRent: 'חיובים לפי החוזה',
        actualPayments: 'תשלומים בפועל',
        totalBase: 'סה"כ בסיס',
        totalActual: 'סה"כ שולם בפועל',
        advancedReconciliationOptions: 'אפשרויות התחשבנות מתקדמות',
        avgUnderpayment: 'ממוצע חסר לחודש',
        percentageOwed: 'אחוז חוב'
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

        addItem: 'Add Item',
        expectedBaseRent: 'Expected Charges',
        actualPayments: 'Actual Payments',
        totalBase: 'Total Base',
        totalActual: 'Total Paid',
        advancedReconciliationOptions: 'Advanced Reconciliation',
        avgUnderpayment: 'Avg Underpayment',
        percentageOwed: 'Debt %'
    }
};
