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
    | 'logoutConfirmTitle'
    | 'logoutConfirmMessage'
    | 'confirmLogout'
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
    | 'percentageOwed'

    // Property Types
    | 'apartment'
    | 'penthouse'
    | 'garden'
    | 'house'
    | 'other'

    // Extra labels for Add Property
    | 'addProperty'
    | 'occupied'
    | 'vacant'
    | 'rooms'
    | 'sqm'
    | 'parking'
    | 'monthlyRentLabel'
    | 'createFirstAsset'
    | 'noAssetsFound'
    | 'addFirstPropertyDesc'
    | 'idNumber'
    | 'phone'
    | 'email'
    | 'optional'
    | 'stepDate'
    | 'newAmount'
    | 'linkageAndIndices'
    | 'selectDate'
    | 'friendlyName'
    | 'selectCategory'
    | 'mainApartment'
    | 'stepOptionRent'
    | 'extensionEndDate'
    | 'extensionRent'
    | 'balcony'
    | 'safe_room'
    | 'storage'
    | 'yes'
    | 'no'
    | 'marketIntelligence'
    | 'manageCities'
    | 'noCitiesPinnedDescription'
    | 'chooseCities'
    | 'avgRent'
    | 'manageTrackedCities'
    | 'searchCities'
    | 'currentlyTracking'
    | 'availableCities'
    | 'done'
    | 'noResultsFound'
    | 'performanceTracking';

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
        logoutConfirmTitle: 'התנתקות?',
        logoutConfirmMessage: 'האם אתה בטוח שברצונך להתנתק?',
        confirmLogout: 'כן, התנתק',
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
        percentageOwed: 'אחוז חוב',

        apartment: 'דירה',
        penthouse: 'פנטהאוז',
        garden: 'דירת גן',
        house: 'בית פרטי',
        other: 'אחר',

        addProperty: 'הוסף נכס',
        occupied: 'תפוס',
        vacant: 'פנוי',
        rooms: 'חדרים',
        sqm: 'מ"ר',
        parking: 'חניה',
        monthlyRentLabel: 'שכירות חודשית',
        createFirstAsset: 'צור נכס ראשון',
        noAssetsFound: 'לא נמצאו נכסים',
        addFirstPropertyDesc: 'התחילו בניהול הנכסים שלכם על ידי הוספת הנכס הראשון.',
        idNumber: 'תעודת זהות',
        phone: 'טלפון',
        email: 'אימייל',
        optional: '(אופציונלי)',
        stepDate: 'תאריך',
        newAmount: 'סכום חדש',
        linkageAndIndices: 'הצמדה ומדדים',
        selectDate: 'בחר תאריך...',
        friendlyName: 'כינוי לנכס',
        selectCategory: 'בחר קטגוריה',
        mainApartment: 'דירה ראשית',
        stepOptionRent: 'שכר דירה באופציה',
        extensionEndDate: 'תאריך סיום האופציה',
        extensionRent: 'שכר דירה באופציה',
        balcony: 'מרפסת',
        safe_room: 'ממ"ד',
        storage: 'מחסן',
        yes: 'כן',
        no: 'לא',
        marketIntelligence: 'מודיעין שוק',
        manageCities: 'ניהול ערים',
        noCitiesPinnedDescription: 'טרם בחרתם ערים למעקב. בחרו את הערים המעניינות אתכם כדי לראות מגמות מחירים.',
        chooseCities: 'בחר ערים',
        avgRent: 'שכירות ממוצעת',
        manageTrackedCities: 'ניהול ערים למעקב',
        searchCities: 'חפש עיר...',
        currentlyTracking: 'ערים במעקב',
        availableCities: 'ערים זמינות',
        done: 'סיום',
        noResultsFound: 'לא נמצאו תוצאות',
        performanceTracking: 'מעקב ביצועים'
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
        logoutConfirmTitle: 'Logout?',
        logoutConfirmMessage: 'Are you sure you want to log out?',
        confirmLogout: 'Yes, Logout',
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
        address: 'Street Address',
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
        percentageOwed: 'Debt %',

        apartment: 'Apartment',
        penthouse: 'Penthouse',
        garden: 'Garden Apt',
        house: 'House',
        other: 'Other',

        addProperty: 'Add Property',
        selectCategory: 'Select Category',
        friendlyName: 'Friendly Name',
        mainApartment: 'Main Apartment',
        occupied: 'Occupied',
        vacant: 'Vacant',
        rooms: 'Rooms',
        sqm: 'Size (sqm)',
        parking: 'Parking',
        monthlyRentLabel: 'Current Rent (ILS / Month)',
        createFirstAsset: 'Create First Asset',
        noAssetsFound: 'No assets found',
        addFirstPropertyDesc: 'Start managing your properties by adding your first asset.',
        idNumber: 'ID Number',
        phone: 'Phone',
        email: 'Email',
        optional: '(Optional)',
        stepDate: 'Date',
        newAmount: 'New Amount',
        linkageAndIndices: 'Linkage & Indices',
        selectDate: 'Select Date...',
        stepOptionRent: 'Option Rent',
        extensionEndDate: 'Extension End Date',
        extensionRent: 'Extension Rent',
        balcony: 'Balcony',
        safe_room: 'Safe Room',
        storage: 'Storage',
        yes: 'Yes',
        no: 'No',
        marketIntelligence: 'Market Intelligence',
        manageCities: 'Manage Cities',
        noCitiesPinnedDescription: 'You haven\'t pinned any cities yet. Select cities to track their rental trends at a glance.',
        chooseCities: 'Choose Cities',
        avgRent: 'Average Rent',
        manageTrackedCities: 'Manage Tracked Cities',
        searchCities: 'Search cities...',
        currentlyTracking: 'Currently Tracking',
        availableCities: 'Available Cities',
        done: 'Done',
        noResultsFound: 'No results found',
        performanceTracking: 'Performance Tracking'
    }
};
