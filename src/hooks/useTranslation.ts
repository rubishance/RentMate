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

    // Properties Page
    | 'addProperty'
    | 'noAssetsFound'
    | 'addFirstPropertyDesc'
    | 'createFirstAsset'
    | 'occupied'
    | 'vacant'
    | 'sqm'
    | 'monthlyRentLabel'
    | 'tenantsToBeDisconnected'
    | 'unnamed'
    | 'unknown'
    | 'addProperty_female'
    | 'addFirstPropertyDesc_female'
    | 'createFirstAsset_female'
    | 'archiveAndCalculate_female'

    // Tenants Page
    | 'myTenants'
    | 'manageTenantsDesc'
    | 'addTenant'
    | 'addTenant_female'
    | 'noTenantsFound'
    | 'addFirstTenantDesc'
    | 'addFirstTenantDesc_female'
    | 'addNewTenant'
    | 'addNewTenant_female'
    | 'deleteTenantError'
    | 'noPhone'

    // Contracts Page
    | 'contractsTitle'
    | 'contractsSubtitle'
    | 'all'
    | 'active'
    | 'archived'
    | 'tenantDisconnectedWarning'
    | 'paymentsDeletedWarning'
    | 'deleteContractTitle'
    | 'deleteContractMessage'
    | 'deleteContractMessage_female'
    | 'calculationFailed'
    | 'deletePaymentConfirmation'
    | 'deleteExpectedConfirmation'
    | 'calculateLinkageAndMore'

    // Settings Page
    | 'settings'
    | 'manageAccount'
    | 'managePersonalInfo'
    | 'managePersonalInfo_female'
    | 'configureAlerts'
    | 'configureAlerts_female'
    | 'controlData'
    | 'controlData_female'
    | 'contactSupportDesc'
    | 'contactSupportDesc_female'
    | 'logout_female'
    | 'accessibilityStatement'
    | 'languageLocalization'
    | 'language'
    | 'genderForHebrew'
    | 'support'
    | 'contactSupport'
    | 'typeMessageHere'
    | 'orEmailDirectly'
    | 'appVersion'
    | 'profile'
    | 'notifications'
    | 'privacySecurity'

    // Legacy / Migrated from i18n
    | 'sendMessage'
    | 'sending'
    | 'messageSent'
    | 'unspecified'
    | 'gender'
    | 'male'
    | 'female'
    | 'currentPlan'
    | 'freeForever'
    | 'greatForGettingStarted'
    | 'upgradeToPro'
    | 'unlockMoreLimits'
    | 'noActiveContracts'
    | 'noActiveContractsDesc'
    | 'unlockPotential'
    | 'unlockPotential_female'
    | 'requestUpgrade'
    | 'requestUpgrade_female'
    | 'maybeLater'
    | 'requestSent'
    | 'requestSentDesc'
    | 'requestSentDesc_female'
    | 'gotItThanks'
    | 'feature'
    | 'free'
    | 'pro'
    | 'unlimited'
    | 'prioritySupport'
    | 'dataExport'
    | 'contactSupport_female'
    | 'typeMessageHere_female'
    | 'orEmailDirectly_female'
    | 'upgradeToPro_female'
    | 'unlockMoreLimits_female'
    | 'properties_female'
    | 'tenants_female'
    | 'contracts_female'

    // Female Variants
    | 'loading_female'
    | 'save_female'
    | 'edit_female'
    | 'delete_female'
    | 'add_female'
    | 'view_female'
    | 'deleteConfirmation_female'
    | 'clear_female'
    | 'generate_female'
    | 'share_female'
    | 'print_female'
    | 'reset_female'
    | 'download_female'
    | 'remove_female'
    | 'welcomeBack_female'
    | 'welcome_female'
    | 'addPayment_female'
    | 'selectBaseDate_female'
    | 'selectTargetDate_female'
    | 'chooseProperty_female'
    | 'selectProperty_female'
    | 'chooseTenant_female'
    | 'addPeriod_female'
    | 'addStep_female'
    | 'addGuarantor_female'
    | 'createContract_female'
    | 'addItem_female'
    | 'addFirstPayment_female'
    | 'generateList_female'

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
    | 'noActiveContractsDesc'

    // AddTenantModal
    | 'viewTenantDetails'
    | 'editTenant'
    | 'viewContactInfo'
    | 'updateTenantDetails'
    | 'addTenantToContacts'
    | 'assignedAsset'
    | 'noAssetsFoundDesc'
    | 'goToAssetsPage'
    | 'planLimitReached'
    | 'planLimitReachedTenantDesc'
    | 'saving'
    | 'adding'
    | 'saveChanges'
    | 'close'
    | 'editTenant_female'
    | 'viewContactInfo_female'
    | 'updateTenantDetails_female'
    | 'addTenantToContacts_female'
    | 'goToAssetsPage_female'
    | 'saving_female'
    | 'adding_female'
    | 'saveChanges_female'
    | 'runningBalance';

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
        noActiveContractsDesc: 'אין לך חוזים פעילים כרגע',

        // Gender Variants (Female)
        loading_female: 'טוענת...',
        save_female: 'שמרי',
        edit_female: 'ערכי',
        delete_female: 'מחקי',
        add_female: 'הוסיפי',
        view_female: 'צפי',
        deleteConfirmation_female: 'האם את בטוחה שברצונך למחוק? פעולה זו אינה הפיכה.',
        clear_female: 'נקי',
        generate_female: 'צרי',
        share_female: 'שתפי',
        print_female: 'הדפיסי',
        reset_female: 'אפסי',
        download_female: 'הורידי',
        remove_female: 'הסירי',

        welcomeBack_female: 'ברוכה השבה',
        welcome_female: 'ברוכה הבאה',

        addPayment_female: 'הוסיפי תשלום',
        selectBaseDate_female: 'בחרי תאריך בסיס',
        selectTargetDate_female: 'בחרי תאריך יעד',

        chooseProperty_female: 'בחרי נכס מהרשימה',
        selectProperty_female: 'בחרי נכס...',

        chooseTenant_female: 'בחרי דייר מהרשימה',

        addPeriod_female: 'הוסיפי תקופה',
        addStep_female: 'הוסיפי שינוי',
        addGuarantor_female: 'הוסיפי ערב',

        createContract_female: 'צרי חוזה',
        addItem_female: 'הוסיפי פריט',
        addFirstPayment_female: 'הוסיפי תשלום ראשון',

        generateList_female: 'צרי רשימה',

        // Properties Page & Others
        addProperty: 'הוסף נכס',
        addProperty_female: 'הוסיפי נכס',
        noAssetsFound: 'אין נכסים עדיין',
        addFirstPropertyDesc: 'הוסף את הנכס הראשון שלך כדי להתחיל',
        addFirstPropertyDesc_female: 'הוסיפי את הנכס הראשון שלך כדי להתחיל',
        createFirstAsset: '+ צור נכס חדש',
        createFirstAsset_female: '+ צרי נכס חדש',
        occupied: 'מושכר',
        vacant: 'פנוי',
        sqm: 'מ״ר',
        monthlyRentLabel: 'שכר דירה',
        tenantsToBeDisconnected: 'דיירים ינותקו מהנכס',
        unnamed: 'ללא שם',
        unknown: 'לא ידוע',
        archiveAndCalculate_female: 'ארכבי וחשבי',

        // Tenants Page
        myTenants: 'הדיירים שלי',
        manageTenantsDesc: 'ניהול ספר טלפונים ודיירים',
        addTenant: 'הוסף דייר',
        addTenant_female: 'הוסיפי דייר',
        noTenantsFound: 'אין דיירים ברשימה',
        addFirstTenantDesc: 'הוסף דיירים כדי לנהל אותם בקלות',
        addFirstTenantDesc_female: 'הוסיפי דיירים כדי לנהל אותם בקלות',
        addNewTenant: '+ הוסף דייר חדש',
        addNewTenant_female: '+ הוסיפי דייר חדש',
        deleteTenantError: 'לא ניתן למחוק דייר שיש לו חוזים או תשלומים מקושרים. יש למחוק אותם תחילה.',
        noPhone: 'ללא טלפון',

        // Contracts Page
        contractsTitle: 'חוזי שכירות',
        contractsSubtitle: 'ניהול חוזים ותקופות שכירות',
        all: 'הכל',
        active: 'פעיל',
        archived: 'ארכיון',
        tenantDisconnectedWarning: 'דייר ינותק מחוזה זה',
        paymentsDeletedWarning: 'תשלומים ימחקו לצמיתות',
        deleteContractTitle: 'מחיקת חוזה',
        deleteContractMessage: 'האם את/ה בטוח/ה שברצונך למחוק חוזה זה?',
        deleteContractMessage_female: 'האם את בטוחה שברצונך למחוק חוזה זה?',
        calculationFailed: 'החישוב נכשל. נא לבדוק את הנתונים.',
        deletePaymentConfirmation: 'האם את/ה בטוח/ה שברצונך למחוק תשלום זה?',
        deleteExpectedConfirmation: 'האם את/ה בטוח/ה שברצונך למחוק שורה זו?',
        calculateLinkageAndMore: 'חישוב הפרשי הצמדה ועוד',

        // Settings
        settings: 'הגדרות',
        manageAccount: 'ניהול חשבון',
        managePersonalInfo: 'ניהול מידע אישי',
        managePersonalInfo_female: 'נהלי את המידע האישי שלך',
        configureAlerts: 'הגדרת התראות',
        configureAlerts_female: 'הגדירי התראות ותזכורות',
        controlData: 'שליטה במידע',
        controlData_female: 'שלטי במידע ובגישה שלך',
        contactSupportDesc: 'יש לך שאלה? נשמח לעזור.',
        contactSupportDesc_female: 'יש לך שאלה או את צריכה עזרה? שלחי לנו הודעה ונחזור אלייך בהקדם.',
        logout_female: 'התנתקי',
        accessibilityStatement: 'הצהרת נגישות',
        languageLocalization: 'שפה ואזור',
        language: 'שפה',
        genderForHebrew: 'מגדר (עבור עברית)',
        support: 'תמיכה',
        contactSupport: 'צור קשר',
        contactSupport_female: 'צרי קשר',
        typeMessageHere: 'כתוב את ההודעה כאן...',
        typeMessageHere_female: 'כתבי את ההודעה כאן...',
        orEmailDirectly: 'או שלח מייל ישירות ל-',
        orEmailDirectly_female: 'או שלחי מייל ישירות ל-',
        appVersion: 'גרסת אפליקציה',
        profile: 'פרופיל',
        notifications: 'התראות',
        privacySecurity: 'פרטיות ואבטחה',

        // Upgrade / Pricing
        unlockPotential: 'ממש את הפוטנציאל המלא של RentMate',
        unlockPotential_female: 'ממשי את הפוטנציאל המלא של RentMate',

        requestUpgrade: 'בקש שדרוג',
        requestUpgrade_female: 'בקשי שדרוג',
        maybeLater: 'אולי אחר כך',
        requestSent: 'הבקשה נשלחה!',
        requestSentDesc: 'קיבלנו את בקשת השדרוג שלך. הצוות שלנו יצור איתך קשר בהקדם.',
        requestSentDesc_female: 'קיבלנו את בקשת השדרוג שלך. הצוות שלנו יצור איתך קשר בהקדם.', // Neutral enough? "Itach" is female. "Ittcha" is male.
        // "יצור איתך קשר" - itcha (M) / itach (F). Spelling is same! 
        // But let's be safe.
        gotItThanks: 'הבנתי, תודה',

        feature: 'תכונה',
        free: 'חינם',
        pro: 'Pro',
        unlimited: 'ללא הגבלה',
        prioritySupport: 'תמיכה בעדיפות',
        dataExport: 'ייצוא נתונים',
        sending: 'שולח...',
        messageSent: 'ההודעה נשלחה!',
        unspecified: 'מעדיף/ה לא לציין',
        gender: 'מגדר',
        male: 'זכר',
        female: 'נקבה',
        currentPlan: 'תוכנית נוכחית',
        freeForever: 'חינם לתמיד',
        greatForGettingStarted: 'מעולה להתחלה',
        upgradeToPro: 'שדרג ל-Pro',
        upgradeToPro_female: 'שדרגי ל-Pro',
        unlockMoreLimits: 'פתח יותר אפשרויות',
        unlockMoreLimits_female: 'פתחי יותר אפשרויות',
        properties_female: 'נכסים', // Plural usually neutral, but if context is imperative "Manage Properties"?
        // "Properties" (Title) is Noun. "Hanechasim".
        // Keep neutral if noun.
        tenants_female: 'דיירים',
        contracts_female: 'חוזים',

        // AddTenantModal
        viewTenantDetails: 'פרטי דייר',
        editTenant: 'ערוך דייר',
        editTenant_female: 'ערכי דייר',
        viewContactInfo: 'צפה בפרטי הקשר',
        viewContactInfo_female: 'צפי בפרטי הקשר',
        updateTenantDetails: 'עדכן פרטי דייר',
        updateTenantDetails_female: 'עדכני פרטי דייר',
        addTenantToContacts: 'הוסף דייר חדש לאנשי הקשר',
        addTenantToContacts_female: 'הוסיפי דייר חדש לאנשי הקשר',
        assignedAsset: 'נכס משויך',
        noAssetsFoundDesc: 'לא נמצאו נכסים. יש ליצור נכס לפני הוספת דייר.',
        goToAssetsPage: 'עבור לעמוד הנכסים',
        goToAssetsPage_female: 'עברי לעמוד הנכסים',
        planLimitReached: 'הגעת למכסה',
        planLimitReachedTenantDesc: 'הגעת לכמות הדיירים המקסימלית בתוכנית {planName}. שדרג/י כדי להוסיף עוד.',
        saving: 'שומר...',
        saving_female: 'שומרת...',
        adding: 'מוסיף...',
        adding_female: 'מוסיפה...',
        saveChanges: 'שמור שינויים',
        saveChanges_female: 'שמרי שינויים',
        close: 'סגור',

        runningBalance: 'יתרה מצטברת',

        // Missing keys to satisfy Record<TranslationKeys, string>
        sendMessage: 'שלח הודעה',
        // sendMessage is missing from earlier, so we keep it. 
        // noActiveContractsDesc is at line 706, so we remove it here.
        sendMessage: 'שלח הודעה',
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
        noActiveContractsDesc: 'You have no active contracts at the moment',

        // Gender Support (Mapped to neutral English)
        loading_female: 'Loading...',
        save_female: 'Save',
        edit_female: 'Edit',
        delete_female: 'Delete',
        add_female: 'Add',
        view_female: 'View',
        deleteConfirmation_female: 'Are you sure you want to delete this item? This action cannot be undone.',
        clear_female: 'Clear',
        generate_female: 'Generate',
        share_female: 'Share',
        print_female: 'Print',
        reset_female: 'Reset',
        download_female: 'Download',
        remove_female: 'Remove',

        welcomeBack_female: 'Welcome Back',
        welcome_female: 'Welcome',

        addPayment_female: 'Add Payment',
        selectBaseDate_female: 'Select base date',
        selectTargetDate_female: 'Select target date',

        chooseProperty_female: 'Choose Property',
        selectProperty_female: 'Select Property...',

        chooseTenant_female: 'Choose Tenant',

        addPeriod_female: 'Add Period',
        addStep_female: 'Add Step',
        addGuarantor_female: 'Add Guarantor',

        createContract_female: 'Create Contract',
        addItem_female: 'Add Item',
        addFirstPayment_female: 'Add your first payment',

        generateList_female: 'Generate List',

        // Properties Page & Others
        addProperty: 'Add Property',
        addProperty_female: 'Add Property',
        noAssetsFound: 'No Assets Found',
        addFirstPropertyDesc: 'Add your first property to get started',
        addFirstPropertyDesc_female: 'Add your first property to get started',
        createFirstAsset: '+ Create New Asset',
        createFirstAsset_female: '+ Create New Asset',
        occupied: 'Occupied',
        vacant: 'Vacant',
        sqm: 'm²',
        monthlyRentLabel: 'Monthly Rent',
        tenantsToBeDisconnected: 'Tenants to be disconnected',
        unnamed: 'Unnamed',
        unknown: 'Unknown',
        archiveAndCalculate_female: 'Archive & Calculate',

        // Tenants Page
        myTenants: 'My Tenants',
        manageTenantsDesc: 'Manage your tenants and contacts',
        addTenant: 'Add Tenant',
        addTenant_female: 'Add Tenant',
        noTenantsFound: 'No Tenants Found',
        addFirstTenantDesc: 'Add your first tenant to get started',
        addFirstTenantDesc_female: 'Add your first tenant to get started',
        addNewTenant: '+ Add New Tenant',
        addNewTenant_female: '+ Add New Tenant',
        deleteTenantError: 'Cannot delete tenant associated with contracts or payments. Please delete them first.',
        noPhone: 'No phone',

        // Contracts Page
        contractsTitle: 'Contracts',
        contractsSubtitle: 'Manage lease agreements and terms',
        all: 'All',
        active: 'Active',
        archived: 'Archived',
        tenantDisconnectedWarning: 'Tenant will be disconnected from this contract',
        paymentsDeletedWarning: 'Payments will be permanently deleted',
        deleteContractTitle: 'Delete Contract',
        deleteContractMessage: 'Are you sure you want to delete this contract?',
        deleteContractMessage_female: 'Are you sure you want to delete this contract?',
        calculationFailed: 'Calculation failed. Please check your inputs.',
        deletePaymentConfirmation: 'Are you sure you want to delete this payment?',
        deleteExpectedConfirmation: 'Are you sure you want to delete this expected item?',
        calculateLinkageAndMore: 'Calculate linkage and more',

        // Settings
        settings: 'Settings',
        manageAccount: 'Manage Account',
        managePersonalInfo: 'Manage personal info',
        managePersonalInfo_female: 'Manage personal info',
        configureAlerts: 'Configure alerts and reminders',
        configureAlerts_female: 'Configure alerts and reminders',
        controlData: 'Control specific data points',
        controlData_female: 'Control specific data points',
        contactSupportDesc: 'Have a question? We are here to help.',
        contactSupportDesc_female: 'Have a question? We are here to help.',
        logout_female: 'Logout',
        accessibilityStatement: 'Accessibility Statement',
        languageLocalization: 'Language & Localization',
        language: 'Language',
        genderForHebrew: 'Gender (for Hebrew)',
        support: 'Support',
        contactSupport: 'Contact Support',
        typeMessageHere: 'Type your message here...',
        orEmailDirectly: 'Or email us directly at',
        appVersion: 'App Version',
        profile: 'Profile',
        notifications: 'Notifications',
        privacySecurity: 'Privacy & Security',

        // Legacy Migrated
        sendMessage: 'Send Message',
        sending: 'Sending...',
        messageSent: 'Message sent!',
        unspecified: 'Unspecified',
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        currentPlan: 'Current Plan',
        freeForever: 'Free Forever',
        greatForGettingStarted: 'Great for getting started',
        upgradeToPro: 'Upgrade to Pro',
        unlockMoreLimits: 'Unlock more limits',

        // Missing keys added to match type definition
        noActiveContractsDesc: 'You have no active contracts',
        unlockPotential: 'Unlock the full potential of RentMate',
        unlockPotential_female: 'Unlock the full potential of RentMate',
        requestUpgrade: 'Request Upgrade',
        requestUpgrade_female: 'Request Upgrade',
        maybeLater: 'Maybe Later',
        requestSent: 'Request Sent!',
        requestSentDesc: 'We have received your upgrade request. Our team will contact you shortly.',
        requestSentDesc_female: 'We have received your upgrade request. Our team will contact you shortly.',
        gotItThanks: 'Got it, thanks',
        feature: 'Feature',
        free: 'Free',
        pro: 'Pro',
        unlimited: 'Unlimited',
        prioritySupport: 'Priority Support',
        dataExport: 'Data Export',
        contactSupport_female: 'Contact Support',
        typeMessageHere_female: 'Type your message here...',
        orEmailDirectly_female: 'Or email us directly at',
        upgradeToPro_female: 'Upgrade to Pro',
        unlockMoreLimits_female: 'Unlock more limits',
        properties_female: 'Properties',
        tenants_female: 'Tenants',
        contracts_female: 'Contracts',

        // AddTenantModal
        viewTenantDetails: 'View Tenant Details',
        editTenant: 'Edit Tenant',
        viewContactInfo: 'View contact information',
        updateTenantDetails: 'Update tenant details',
        addTenantToContacts: 'Add a new tenant to your contacts',
        assignedAsset: 'Assigned Asset',
        noAssetsFoundDesc: 'No assets found. You must create an asset before adding a tenant.',
        goToAssetsPage: 'Go to Assets Page',
        planLimitReached: 'Plan Limit Reached',
        planLimitReachedTenantDesc: 'You have reached the maximum number of tenants for your {planName} plan. Please upgrade your subscription.',
        saving: 'Saving...',
        adding: 'Adding...',
        saveChanges: 'Save Changes',
        close: 'Close',

        // Gender mappings (neutral for English)
        editTenant_female: 'Edit Tenant',
        viewContactInfo_female: 'View contact information',
        updateTenantDetails_female: 'Update tenant details',
        addTenantToContacts_female: 'Add a new tenant to your contacts',
        goToAssetsPage_female: 'Go to Assets Page',
        saving_female: 'Saving...',
        adding_female: 'Adding...',
        saveChanges_female: 'Save Changes',

        runningBalance: 'Running Balance',
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

        // Automatic gender handling for Hebrew
        let effectiveKey = key;
        const gender = preferences.gender;
        if (lang === 'he' && gender === 'female') {
            const femaleKey = `${key}_female`;
            // Check if female variant exists in the dictionary
            if ((dict as any)[femaleKey]) {
                effectiveKey = femaleKey;
            }
        }

        let text = (dict as any)[effectiveKey] || (dict as any)[key] || (translations.en as any)[key] || key;

        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }

        return text;
    };

    return { t, lang };
}
