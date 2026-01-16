import { useUserPreferences } from '../contexts/UserPreferencesContext';

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
    | 'view'
    | 'deleteConfirmation'
    | 'clear'
    | 'generate'
    | 'share'
    | 'print'
    | 'reset'
    | 'download'
    | 'remove'
    | 'yes'
    | 'no'

    // Auth
    | 'login'
    | 'logout'
    | 'welcomeBack'
    | 'welcome'

    // Dashboard
    | 'dashboardTitle'
    | 'totalProperties'
    | 'activeTenants'
    | 'monthlyRevenue'
    | 'occupancyRate'
    | 'recentActivity'
    | 'quickActions'
    | 'monthlyIncome'
    | 'collected'
    | 'pending'
    | 'contractEnded'
    | 'contractEndedDesc'
    | 'archiveAndCalculate'
    | 'welcomeMessage'
    | 'allLooksQuiet'

    // Analytics
    | 'analyticsTitle'
    | 'analyticsSubtitle'
    | 'totalRevenueLTM'
    | 'avgRentPerProperty'
    | 'revenueTrend'
    | 'paymentStatus'
    | 'last12Months'
    | 'vsLastYear'

    // Entities
    | 'properties'
    | 'tenants'
    | 'contracts'
    | 'payments'
    | 'calculator'

    // Payments Page
    | 'paymentsTitle'
    | 'trackFuturePayments'
    | 'addPayment'
    | 'monthlyExpected'
    | 'pendingCollection'
    | 'upcomingPayments'
    | 'noPaymentsFound'
    | 'totalExpected'
    | 'totalActual'
    | 'collectionRate'
    | 'exp' // Expected
    | 'base'
    | 'last3Months'
    | 'last6Months'
    | 'lastYear'
    | 'allTime'
    | 'filters'
    | 'tenant'
    | 'allTenants'
    | 'asset'
    | 'allAssets'
    | 'method'
    | 'allMethods'
    | 'transfer'
    | 'bit'
    | 'paybox'
    | 'check'
    | 'cash'
    | 'creditCard'
    | 'other'
    | 'period'
    | 'from'
    | 'to'

    | 'indexCalculator'
    | 'calculatorDesc'
    | 'standardCalculation'
    | 'paymentReconciliation'
    | 'baseRent'
    | 'linkageType'
    | 'cpi'
    | 'housingServices'
    | 'constructionInputs'
    | 'usdRate'
    | 'eurRate'
    | 'baseDate'
    | 'targetDate'
    | 'selectBaseDate'
    | 'selectTargetDate'
    | 'advancedOptions'
    | 'partialLinkage'
    | 'partialLinkageHelp'
    | 'calculate'
    | 'calculating'
    | 'results'
    | 'newRent'
    | 'linkageCoefficient'
    | 'change'
    | 'percentage'
    | 'formula'
    | 'shareResult'

    // Calculator - Reconciliation
    | 'viewingSharedCalculation'
    | 'sharedCalculationDesc'
    | 'loadFromContract'
    | 'selectContractPlaceholder'
    | 'expectedBaseRent'
    | 'clearList'
    | 'generateList'
    | 'dateAndBaseAmount'
    | 'actualPayments'
    | 'paymentDate'
    | 'paidAmount'
    | 'reconciliationTable'
    | 'month'
    | 'expected'
    | 'index'
    | 'due'
    | 'gap'
    | 'overdue'
    | 'revenue'
    // Wizard Keys
    | 'newContract'
    | 'newContractDesc'
    | 'hideContract'
    | 'showContract'
    | 'aiScanTitle'
    | 'aiScanDesc'
    | 'scanNow'
    | 'contractScannedSuccess'
    | 'propertyDetails'
    | 'chooseProperty'
    | 'selectProperty'
    | 'newProperty'
    | 'existingProperty'
    | 'propertyType'
    | 'apartment'
    | 'penthouse'
    | 'gardenApartment'
    | 'house'
    | 'other'
    | 'rooms'
    | 'sizeSqm'
    | 'parking'
    | 'storage'
    | 'propertyImage'
    | 'uploadFile'
    | 'importFromGoogle'
    | 'clickToUpload'
    | 'uploading'
    | 'tenantDetails'
    | 'newTenant'
    | 'existingTenant'
    | 'chooseTenant'
    | 'fullName'
    | 'idNumber'
    | 'phone'
    | 'email'
    | 'signingDate'
    | 'optionPeriods'
    | 'addPeriod'
    | 'noOptionPeriods'
    | 'months'
    | 'years'
    | 'optionRent'
    | 'startDate'
    | 'endDate'
    | 'contractDuration'
    | 'paymentDetails'
    | 'monthlyRent'
    | 'rentSteps'
    | 'addStep'
    | 'stepDate'
    | 'newAmount'
    | 'linkageAndIndices'
    | 'notLinked'
    | 'linkedToCpi'
    | 'linkedToUsd'
    | 'indexType'
    | 'baseDate'
    | 'ceiling'
    | 'floorIndex'
    | 'paymentFrequency'
    | 'bimonthly'
    | 'monthly'
    | 'paymentMethod'
    | 'bankTransfer'
    | 'check'
    | 'cash'
    | 'bit'
    | 'paybox'
    | 'creditCard'
    | 'securityAndAppendices'
    | 'securityDeposit'
    | 'guarantors'
    | 'guarantorName'
    | 'addGuarantor'
    | 'noGuarantors'
    | 'pets'
    | 'allowed'
    | 'forbidden'
    | 'contractFile'
    | 'savePreferences'
    | 'saveToCloud'
    | 'saveToDevice'
    | 'summary'
    | 'createContract'
    | 'stepTenantProperty'
    | 'stepPeriods'
    | 'stepPayments'
    | 'stepSecurity'
    | 'stepSummary'
    | 'limitReached'
    | 'limitReachedDesc'
    | 'backToContracts'

    | 'addItem'
    | 'totalBase'
    | 'globalBaseRentHelp'
    | 'baseIndexDate'
    | 'noPaymentsListed'
    | 'addFirstPayment'
    | 'manualPaymentHelp'
    | 'periodStart'
    | 'periodEnd'
    | 'advancedLinkageOptions'
    | 'indexSubType'
    | 'knownIndex'
    | 'inRespectOf'
    | 'knownIndexHelp'
    | 'updateFrequency'
    | 'everyMonth'
    | 'quarterly'
    | 'semiannually'
    | 'annually'
    | 'updateFrequencyHelp'
    | 'linkageFloor'
    | 'indexBaseMin'
    | 'indexBaseMinHelp'
    | 'maxIncrease'
    | 'capCeiling'
    | 'calculateBackPay'
    | 'paymentReconciliationResults'
    | 'totalBackPayOwed'
    | 'avgUnderpayment'
    | 'percentageOwed'
    | 'monthlyBreakdown'
    | 'shouldPay'
    | 'paid'
    | 'diff'

    // Table Headers
    | 'name'
    | 'address'
    | 'city'
    | 'status'
    | 'amount'
    | 'date'

    // Empty States
    | 'noActiveContracts'
    | 'noActiveContractsDesc';

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
        view: 'צפה',
        deleteConfirmation: 'האם אתה בטוח שברצונך למחוק? פעולה זו אינה הפיכה.',
        clear: 'נקה',
        generate: 'צור',
        share: 'שתף',
        print: 'הדפס',
        reset: 'אפס',
        download: 'הורד',
        remove: 'הסר',
        yes: 'כן',
        no: 'לא',

        login: 'התחברות',
        logout: 'התנתק',
        welcomeBack: 'ברוך שובך',
        welcome: 'ברוך הבא',

        dashboardTitle: 'לוח בקרה',
        totalProperties: 'סה"כ נכסים',
        activeTenants: 'דיירים פעילים',
        monthlyRevenue: 'הכנסה חודשית',
        occupancyRate: 'תפוסה',
        recentActivity: 'פעילות אחרונה',
        quickActions: 'פעולות מהירות',
        monthlyIncome: 'סה״כ הכנסה חודשית',
        collected: 'שולם',
        pending: 'ממתין',
        contractEnded: 'חוזה הסתיים',
        contractEndedDesc: 'החוזה עבור {address} הסתיים ב-{date}.',
        archiveAndCalculate: 'ארכב וחשב',
        welcomeMessage: 'ברוכים הבאים ל-RentMate',
        allLooksQuiet: 'הכל נראה רגוע כאן.',

        analyticsTitle: 'אנליטיקה',
        analyticsSubtitle: 'סקירת ביצועי פורטפוליו',
        totalRevenueLTM: 'הכנסה שנתית (LTM)',
        avgRentPerProperty: 'שכירות דירה ממוצעת',
        revenueTrend: 'מגמות הכנסה',
        paymentStatus: 'סטטוס תשלומים',
        last12Months: '12 חודשים אחרונים',
        vsLastYear: 'לעומת שנה שעברה',

        properties: 'נכסים',
        tenants: 'דיירים',
        contracts: 'חוזים',
        payments: 'תשלומים',
        calculator: 'מחשבון',

        paymentsTitle: 'תשלומים',
        trackFuturePayments: 'מעקב תשלומים',
        addPayment: 'הוסף תשלום',
        monthlyExpected: 'צפי חודשי',
        pendingCollection: 'ממתין לגבייה',
        upcomingPayments: 'תשלומים קרובים',
        noPaymentsFound: 'לא נמצאו תשלומים.',
        totalExpected: 'סה"כ צפוי',
        totalActual: 'סה"כ בפועל',
        collectionRate: 'שיעור גבייה',
        exp: 'צפוי',
        base: 'בסיס',
        last3Months: '3 חד\' אחרונים',
        last6Months: '6 חד\' אחרונים',
        lastYear: 'שנה אחרונה',
        allTime: 'כל הזמן',
        filters: 'סינונים',
        tenant: 'דייר',
        allTenants: 'כל הדיירים',
        asset: 'נכס',
        allAssets: 'כל הנכסים',
        method: 'שיטה',
        allMethods: 'כל השיטות',
        transfer: 'העברה בנקאית',
        bit: 'ביט',
        paybox: 'פייבוקס',
        check: 'צ\'ק',
        cash: 'מזומן',
        creditCard: 'אשראי',
        other: 'אחר',
        period: 'תקופה',
        from: 'מ-',
        to: 'עד-',

        indexCalculator: 'מחשבון הצמדה',
        calculatorDesc: 'חישוב הפרשי הצמדה למדד והתחשבנות',
        standardCalculation: 'חישוב סטנדרטי',
        paymentReconciliation: 'התחשבנות',
        baseRent: 'שכירות בסיס (₪)',
        linkageType: 'סוג הצמדה',
        cpi: 'מדד המחירים לצרכן',
        housingServices: 'מדד שירותי דיור',
        constructionInputs: 'מדד תשומות הבנייה',
        usdRate: 'דולר',
        eurRate: 'אירו',
        baseDate: 'תאריך בסיס',
        targetDate: 'תאריך יעד',
        selectBaseDate: 'בחר תאריך בסיס',
        selectTargetDate: 'בחר תאריך יעד',
        advancedOptions: 'אפשרויות מתקדמות',
        partialLinkage: 'הצמדה חלקית (%)',
        partialLinkageHelp: 'ברירת מחדל: 100% (הצמדה מלאה).',
        calculate: 'חשב',
        calculating: 'מחשב...',
        results: 'תוצאות',
        newRent: 'שכירות מעודכנת',
        linkageCoefficient: 'מקדם קישור',
        change: 'שינוי',
        percentage: 'אחוז שינוי',
        formula: 'נוסחה:',
        shareResult: 'שתף תוצאה',

        viewingSharedCalculation: 'צופה בחישוב משותף',
        sharedCalculationDesc: 'חישוב זה שותף איתך. ניתן לשנות ערכים ולחשב מחדש.',
        loadFromContract: 'טען מחוזה (אופציונלי)',
        selectContractPlaceholder: 'בחר חוזה למילוי אוטומטי...',
        expectedBaseRent: 'שכירות בסיס צפויה',
        clearList: 'נקה רשימה',
        generateList: 'צור רשימה',
        dateAndBaseAmount: 'תאריך וסכום בסיס',
        actualPayments: 'תשלומים בפועל',
        paymentDate: 'תאריך תשלום',
        paidAmount: 'סכום ששולם',
        reconciliationTable: 'טבלת התחשבנות',
        month: 'חודש',
        expected: 'צפוי',
        index: 'מדד (שינוי)',
        due: 'לתשלום',
        gap: 'הפרש',
        overdue: 'באיחור',
        revenue: 'הכנסה',
        // Wizard Keys
        newContract: 'חוזה חדש',
        newContractDesc: 'יצירת חוזה שכירות חדש',
        hideContract: 'הסתר חוזה',
        showContract: 'הצג חוזה',
        aiScanTitle: 'סריקה חכמה ב-AI',
        aiScanDesc: 'העלה או סרוק חוזה למילוי פרטים אוטומטי',
        scanNow: 'סרוק עכשיו',
        contractScannedSuccess: 'החוזה נסרק ועבר השחרה בהצלחה',
        propertyDetails: 'פרטי הנכס',
        chooseProperty: 'בחר נכס מהרשימה',
        selectProperty: 'בחר נכס...',
        newProperty: 'נכס חדש',
        existingProperty: 'נכס קיים',
        propertyType: 'סוג הנכס',
        apartment: 'דירה',
        penthouse: 'פנטהאוז',
        gardenApartment: 'דירת גן',
        house: 'בית פרטי',

        rooms: 'מס\' חדרים',
        sizeSqm: 'גודל (מ"ר)',
        parking: 'חניה פרטית',
        storage: 'מחסן',
        propertyImage: 'תמונת הנכס',
        uploadFile: 'העלאת קובץ',
        importFromGoogle: 'ייבא מ-Google',
        clickToUpload: 'לחץ להעלאת תמונה',
        uploading: 'מעלה...',
        tenantDetails: 'פרטי הדייר',
        newTenant: 'דייר חדש',
        existingTenant: 'דייר קיים',
        chooseTenant: 'בחר דייר מהרשימה',
        fullName: 'שם מלא',
        idNumber: 'תעודת זהות',
        phone: 'טלפון',
        email: 'אימייל',
        signingDate: 'תאריך חתימה',
        optionPeriods: 'תקופות אופציה',
        addPeriod: 'הוסף תקופה',
        noOptionPeriods: 'לא הוגדרו תקופות אופציה',
        months: 'חודשים',
        years: 'שנים',
        optionRent: 'שכ"ד באופציה',
        startDate: 'תאריך התחלה',
        endDate: 'תאריך סיום',
        contractDuration: 'משך החוזה',
        paymentDetails: 'פרטי תשלום',
        monthlyRent: 'שכר דירה חודשי',
        rentSteps: 'מדרגות שכר דירה',
        addStep: 'הוסף שינוי',
        stepDate: 'תאריך שינוי',
        newAmount: 'סכום חדש',
        linkageAndIndices: 'הצמדה ומדדים',
        notLinked: 'לא צמוד',
        linkedToCpi: 'צמוד מדד (CPI)',
        linkedToUsd: 'צמוד דולר ($)',
        indexType: 'סוג מדד',

        ceiling: 'תקרה (מקסימום %)',
        floorIndex: 'מדד בסיס מהווה רצפה',
        paymentFrequency: 'תדירות תשלום',
        monthly: 'חודשי',
        bimonthly: 'דו חודשי',
        paymentMethod: 'אמצעי תשלום',
        bankTransfer: 'העברה בנקאית',
        securityAndAppendices: 'בטוחות ונספחים',
        securityDeposit: 'פיקדון כספי (מזומן/ערבות)',
        guarantors: 'ערבים',
        guarantorName: 'שם הערב',
        addGuarantor: 'הוסף ערב',
        noGuarantors: 'לא הוגדרו ערבים',
        pets: 'בעלי חיים',
        allowed: 'מותר',
        forbidden: 'אסור',
        contractFile: 'קובץ חוזה',
        savePreferences: 'העדפות שמירה',
        saveToCloud: 'שמור בענן RentMate',
        saveToDevice: 'שמור למכשיר שלי',
        summary: 'סיכום',
        createContract: 'צור חוזה',
        stepTenantProperty: 'שוכר ונכס',
        stepPeriods: 'תקופות',
        stepPayments: 'תשלומים',
        stepSecurity: 'בטוחות',
        stepSummary: 'סיכום',
        limitReached: 'מכסת החוזים מלאה',
        limitReachedDesc: 'הגעת למכסת החוזים המקסימלית בתוכנית שלך.',
        backToContracts: 'חזור לחוזים',
        addItem: 'הוסף פריט',
        totalBase: 'סה"כ בסיס',
        globalBaseRentHelp: 'שכירות בסיס חודשית קבועה (אלא אם הוגדר אחרת ברשימה).',
        baseIndexDate: 'תאריך בסיס למדד',
        noPaymentsListed: 'אין תשלומים ברשימה.',
        addFirstPayment: 'הוסף תשלום ראשון',
        manualPaymentHelp: 'הזן את הסכום החודשי הממוצע ששולם.',
        periodStart: 'תחילת תקופה',
        periodEnd: 'סיום תקופה',
        advancedLinkageOptions: 'אפשרויות הצמדה מתקדמות',
        indexSubType: 'שיטת חישוב מדד',
        knownIndex: 'מדד ידוע',
        inRespectOf: 'מדד בגין',
        knownIndexHelp: '"מדד ידוע": פורסם לפני התשלום. "מדד בגין": לפי חודש התשלום.',
        updateFrequency: 'תדירות עדכון',
        everyMonth: 'כל חודש',
        quarterly: 'רבעוני',
        semiannually: 'חצי-שנתי',
        annually: 'שנתי',
        updateFrequencyHelp: 'כל כמה זמן מתעדכנת ההצמדה.',
        linkageFloor: 'רצפת הצמדה',
        indexBaseMin: 'בסיס המדד הוא המינימום',
        indexBaseMinHelp: 'אם מסומן, השכירות לא תרד מתחת לבסיס גם במדד שלילי.',
        maxIncrease: 'תקרת עלייה (%)',
        capCeiling: 'תקרה לעלייה',
        calculateBackPay: 'חשב הפרשים',
        paymentReconciliationResults: 'תוצאות התחשבנות',
        totalBackPayOwed: 'סה"כ חוב הפרשים',
        avgUnderpayment: 'ממוצע חסר לחודש',
        percentageOwed: 'אחוז חוב',
        monthlyBreakdown: 'פירוט חודשי',
        shouldPay: 'היה צריך לשלם',
        paid: 'שולם',
        diff: 'הפרש',

        name: 'שם',
        address: 'כתובת',
        city: 'עיר',
        status: 'סטטוס',
        amount: 'סכום',
        date: 'תאריך',

        noActiveContracts: 'לא נמצאו חוזים פעילים',
        noActiveContractsDesc: 'אין לך חוזים פעילים כרגע'
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
        view: 'View',
        deleteConfirmation: 'Are you sure you want to delete this item? This action cannot be undone.',
        clear: 'Clear',
        generate: 'Generate',
        share: 'Share',
        print: 'Print',
        reset: 'Reset',
        download: 'Download',
        remove: 'Remove',
        yes: 'Yes',
        no: 'No',

        login: 'Login',
        logout: 'Logout',
        welcomeBack: 'Welcome Back',
        welcome: 'Welcome',

        dashboardTitle: 'Dashboard',
        totalProperties: 'Total Properties',
        activeTenants: 'Active Tenants',
        monthlyRevenue: 'Monthly Revenue',
        occupancyRate: 'Occupancy Rate',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',
        monthlyIncome: 'Total Monthly Income',
        collected: 'Collected',
        pending: 'Pending',
        contractEnded: 'Contract Ended',
        contractEndedDesc: 'Contract for {address} ended on {date}.',
        archiveAndCalculate: 'Archive & Calculate',
        welcomeMessage: 'Welcome to RentMate',
        allLooksQuiet: 'Everything looks quiet here.',

        analyticsTitle: 'Analytics',
        analyticsSubtitle: 'Portfolio performance overview',
        totalRevenueLTM: 'Total Revenue (LTM)',
        avgRentPerProperty: 'Avg. Rent per Property',
        revenueTrend: 'Revenue Trend',
        paymentStatus: 'Payment Status',
        last12Months: 'Last 12 Months',
        vsLastYear: 'vs last year',

        properties: 'Properties',
        tenants: 'Tenants',
        contracts: 'Contracts',
        payments: 'Payments',
        calculator: 'Calculator',

        paymentsTitle: 'Payments',
        trackFuturePayments: 'Track future payments',
        addPayment: 'Add Payment',
        monthlyExpected: 'Monthly Expected',
        pendingCollection: 'Pending Collection',
        upcomingPayments: 'Upcoming Payments',
        noPaymentsFound: 'No payments found.',
        totalExpected: 'Total Expected',
        totalActual: 'Total Actual',
        collectionRate: 'Collection Rate',
        exp: 'Exp',
        base: 'Base',
        last3Months: 'Last 3 Months',
        last6Months: 'Last 6 Months',
        lastYear: 'Last Year',
        allTime: 'All Time',
        filters: 'Filters',
        tenant: 'Tenant',
        allTenants: 'All Tenants',
        asset: 'Asset',
        allAssets: 'All Assets',
        method: 'Method',
        allMethods: 'All Methods',
        transfer: 'Transfer',
        bit: 'Bit',
        paybox: 'Paybox',
        check: 'Check',
        cash: 'Cash',
        creditCard: 'Credit Card',
        other: 'Other',
        period: 'Period',
        from: 'From',
        to: 'To',

        indexCalculator: 'Index Calculator',
        calculatorDesc: 'Calculate rent adjustments and payment reconciliation',
        standardCalculation: 'Standard Calculation',
        paymentReconciliation: 'Payment Reconciliation',
        baseRent: 'Base Rent (₪)',
        linkageType: 'Linkage Type',
        cpi: 'CPI (Consumer Price Index)',
        housingServices: 'Housing Services',
        constructionInputs: 'Construction Inputs',
        usdRate: 'USD Rate',
        eurRate: 'EUR Rate',
        baseDate: 'Base Date',
        targetDate: 'Target Date',
        selectBaseDate: 'Select base date',
        selectTargetDate: 'Select target date',
        advancedOptions: 'Advanced Options',
        partialLinkage: 'Partial Linkage (%)',
        partialLinkageHelp: 'Default: 100% (full linkage).',
        calculate: 'Calculate',
        calculating: 'Calculating...',
        results: 'Results',
        newRent: 'New Rent',
        linkageCoefficient: 'Linkage Coefficient',
        change: 'Change',
        percentage: 'Percentage',
        formula: 'Formula:',
        shareResult: 'Share Calculation Result',

        viewingSharedCalculation: 'Viewing Shared Calculation',
        sharedCalculationDesc: 'This calculation was shared with you. You can modify the values and recalculate.',
        loadFromContract: 'Load from Contract (Optional)',
        selectContractPlaceholder: 'Select a contract to auto-fill...',
        expectedBaseRent: 'Expected Base Rent',
        clearList: 'Clear List',
        generateList: 'Generate List',
        dateAndBaseAmount: 'Date & Base Amount',
        actualPayments: 'Actual Payments',
        paymentDate: 'Payment Date',
        paidAmount: 'Paid Amount',
        reconciliationTable: 'Reconciliation Table',
        month: 'Month',
        expected: 'Expected',
        index: 'Index (Change)',
        due: 'Due',
        gap: 'Gap',
        overdue: 'Overdue',
        revenue: 'Revenue',
        newContract: 'New Contract',
        newContractDesc: 'Drafting a new lease agreement',
        hideContract: 'Hide Contract',
        showContract: 'Show Contract',
        aiScanTitle: 'AI Smart Scan',
        aiScanDesc: 'Upload or scan a contract for auto-filling',
        scanNow: 'Scan Now',
        contractScannedSuccess: 'Contract scanned and redacted successfully',
        propertyDetails: 'Property Details',
        chooseProperty: 'Choose Property',
        selectProperty: 'Select Property...',
        newProperty: 'New Property',
        existingProperty: 'Existing Property',
        propertyType: 'Property Type',
        apartment: 'Apartment',
        penthouse: 'Penthouse',
        gardenApartment: 'Garden Apartment',
        house: 'House',

        rooms: 'Rooms',
        sizeSqm: 'Size (sqm)',
        parking: 'Private Parking',
        storage: 'Storage',
        propertyImage: 'Property Image',
        uploadFile: 'Upload File',
        importFromGoogle: 'Import from Google',
        clickToUpload: 'Click to upload image',
        uploading: 'Uploading...',
        tenantDetails: 'Tenant Details',
        newTenant: 'New Tenant',
        existingTenant: 'Existing Tenant',
        chooseTenant: 'Choose Tenant',
        fullName: 'Full Name',
        idNumber: 'ID Number',
        phone: 'Phone',
        email: 'Email',
        signingDate: 'Signing Date',
        optionPeriods: 'Option Periods',
        addPeriod: 'Add Period',
        noOptionPeriods: 'No option periods defined',
        months: 'Months',
        years: 'Years',
        optionRent: 'Option Rent',
        startDate: 'Start Date',
        endDate: 'End Date',
        contractDuration: 'Contract Duration',
        paymentDetails: 'Payment Details',
        monthlyRent: 'Monthly Rent',
        rentSteps: 'Rent Steps',
        addStep: 'Add Step',
        stepDate: 'Step Date',
        newAmount: 'New Amount',
        linkageAndIndices: 'Linkage & Indices',
        notLinked: 'Not Linked',
        linkedToCpi: 'Linked to CPI',
        linkedToUsd: 'Linked to USD',
        indexType: 'Index Type',

        ceiling: 'Ceiling (Max %)',
        floorIndex: 'Base index is floor',
        paymentFrequency: 'Payment Frequency',
        monthly: 'Monthly',
        bimonthly: 'Bi-monthly',
        paymentMethod: 'Payment Method',
        bankTransfer: 'Bank Transfer',
        securityAndAppendices: 'Security & Appendices',
        securityDeposit: 'Security Deposit',
        guarantors: 'Guarantors',
        guarantorName: 'Guarantor Name',
        addGuarantor: 'Add Guarantor',
        noGuarantors: 'No guarantors defined',
        pets: 'Pets',
        allowed: 'Allowed',
        forbidden: 'Forbidden',
        contractFile: 'Contract File',
        savePreferences: 'Save Preferences',
        saveToCloud: 'Save to RentMate Cloud',
        saveToDevice: 'Save to My Device',
        summary: 'Summary',
        createContract: 'Create Contract',
        stepTenantProperty: 'Tenant & Property',
        stepPeriods: 'Periods',
        stepPayments: 'Payments',
        stepSecurity: 'Security',
        stepSummary: 'Summary',
        limitReached: 'Limit Reached',
        limitReachedDesc: 'You have reached the maximum number of contracts on your plan.',
        backToContracts: 'Back to Contracts',
        addItem: 'Add Item',
        totalBase: 'Total Base',
        globalBaseRentHelp: 'Global base rent (will be used for all months unless overridden by list).',
        baseIndexDate: 'Base Index Date',
        noPaymentsListed: 'No payments listed.',
        addFirstPayment: 'Add your first payment',
        manualPaymentHelp: 'Enter the average amount paid per month manually.',
        periodStart: 'Period Start',
        periodEnd: 'Period End',
        advancedLinkageOptions: 'Advanced Linkage Options',
        indexSubType: 'Index Sub-Type',
        knownIndex: 'Known Index (מדד ידוע)',
        inRespectOf: 'In Respect Of (מדד בגין)',
        knownIndexHelp: '"Known": Index published before payment. "In Respect Of": Index of payment month.',
        updateFrequency: 'Update Frequency',
        everyMonth: 'Every Month',
        quarterly: 'Quarterly',
        semiannually: 'Semiannually',
        annually: 'Annually',
        updateFrequencyHelp: 'How often the rent linkage is recalculated.',
        linkageFloor: 'Linkage Floor',
        indexBaseMin: 'Index Base is Minimum',
        indexBaseMinHelp: 'If checked, rent will never drop below base even if index decreases.',
        maxIncrease: 'Max Increase (%)',
        capCeiling: 'Cap/Ceiling',
        calculateBackPay: 'Calculate Back-Pay',
        paymentReconciliationResults: 'Payment Reconciliation Results',
        totalBackPayOwed: 'Total Back-Pay Owed',
        avgUnderpayment: 'Avg Underpayment',
        percentageOwed: 'Percentage Owed',
        monthlyBreakdown: 'Month-by-Month Breakdown',
        shouldPay: 'Should Pay',
        paid: 'Paid',
        diff: 'Diff',

        name: 'Name',
        address: 'Address',
        city: 'City',
        status: 'Status',
        amount: 'Amount',
        date: 'Date',

        noActiveContracts: 'No active contracts found',
        noActiveContractsDesc: 'You have no active contracts at the moment'
    }
};

type TranslationKey = TranslationKeys;

export function useTranslation() {
    const { preferences } = useUserPreferences();
    const lang = preferences.language;

    /**
     * Translates a key. Falls back to English if key missing in current language.
     * @param key The translation key
     * @param params Optional parameters to inject into string (e.g. "Hello {name}")
     */
    const t = (key: TranslationKey | string, params?: Record<string, string | number>) => {
        // Cast as any because dynamic keys might not match strictly if passed as string
        const dict = translations[lang] || translations.en;
        let text = (dict as any)[key] || (translations.en as any)[key] || key;

        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }

        return text;
    };

    return { t, lang };
}
