import { useUserPreferences } from '../contexts/UserPreferencesContext';

export type TranslationKeys =
    // Common
    | 'appName'
    | 'loading' | 'loading_female'
    | 'error'
    | 'save' | 'save_female'
    | 'cancel'
    | 'edit' | 'edit_female'
    | 'delete' | 'delete_female'
    | 'add' | 'add_female'
    | 'search'
    | 'actions'
    | 'view' | 'view_female'
    | 'deleteConfirmation' | 'deleteConfirmation_female'
    | 'clear' | 'clear_female'
    | 'generate' | 'generate_female'
    | 'share' | 'share_female'
    | 'print' | 'print_female'
    | 'reset' | 'reset_female'
    | 'download' | 'download_female'
    | 'remove' | 'remove_female'
    | 'yes'
    | 'no'
    | 'close'
    | 'saving' | 'saving_female'
    | 'adding' | 'adding_female'
    | 'saveChanges' | 'saveChanges_female'
    | 'addItem' | 'addItem_female'
    | 'name'
    | 'address'
    | 'city'
    | 'status'
    | 'amount'
    | 'currency'
    | 'date'
    | 'period'
    | 'from'
    | 'to'
    | 'month'
    | 'note'
    | 'vendorName'
    | 'optionalFolderNote'
    | 'eg_january_bill'
    | 'eg_electric_corp'
    | 'contractDetails'
    | 'editContract'
    | 'contractPeriodStatus'
    | 'paymentFreq'
    | 'paymentDay'
    | 'day'
    | 'rentStepsVariable'
    | 'addRentStep'
    | 'linkageAdjustments'
    | 'subType'
    | 'mos'
    | 'yrs'
    | 'addOptionPeriod'
    | 'depositAmount'
    | 'reference'
    | 'referencePlaceholder'
    | 'dueDate'
    | 'paidDate'
    | 'selectContract'
    | 'saveAndAddAnother'
    | 'createAndClose'
    | 'addPaymentTitle'
    | 'optional'
    | 'endOfForm'
    | 'namePhoneRequired'
    | 'mustBeLoggedIn'
    | 'leaseTimeline'
    | 'viewAll'
    | 'upcomingAlerts'
    | 'addAsset'
    | 'systemStatus'
    | 'location'
    | 'specifications'
    | 'visuals'
    | 'saveRequired'
    | 'savePropertyToAttachDocs'

    // Auth & Navigation
    | 'login'
    | 'logout' | 'logout_female'
    | 'welcomeBack' | 'welcomeBack_female'
    | 'welcome' | 'welcome_female'
    | 'dashboardTitle'
    | 'properties' | 'properties_female'
    | 'tenants' | 'tenants_female'
    | 'contracts' | 'contracts_female'
    | 'payments'
    | 'calculator'
    | 'settings'
    | 'profile'
    | 'notifications'
    | 'notificationsTitle'
    | 'markAllRead'
    | 'noNotifications'
    | 'enablePush'
    | 'privacySecurity'
    | 'cookieConsentTitle'
    | 'cookieConsentDesc'
    | 'cookieConsentPrivacyPolicy'
    | 'cookieConsentClose'
    | 'cookieConsentAccept'
    | 'manageAccount'
    | 'managePersonalInfo' | 'managePersonalInfo_female'
    | 'configureAlerts' | 'configureAlerts_female'
    | 'controlData' | 'controlData_female'
    | 'agreeToTerms'
    | 'marketingConsent'
    | 'legalDocs'
    | 'privacyPolicy'
    | 'termsOfService'

    // Dashboard
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
    | 'archiveAndCalculate' | 'archiveAndCalculate_female'
    | 'welcomeMessage'
    | 'allLooksQuiet'
    | 'paymentPendingTitle'
    | 'paymentPendingDesc'
    | 'sendReminder' | 'sendReminder_female'
    | 'activeMaintenanceTitle'
    | 'activeMaintenanceDesc'
    | 'viewRequests' | 'viewRequests_female'
    | 'smartRecommendation'
    | 'alerts'
    | 'manageStorage' | 'manageStorage_female'
    | 'items'
    | 'now'
    | 'addContractDesc'
    | 'organizeDocsTitle'
    | 'organizeDocsDesc'
    | 'uploadNow' | 'uploadNow_female'

    // Analytics
    | 'analyticsTitle'
    | 'analyticsSubtitle'
    | 'totalRevenueLTM'
    | 'avgRentPerProperty'
    | 'revenueTrend'
    | 'paymentStatus'
    | 'last12Months'
    | 'vsLastYear'

    // Missing Keys
    | 'manualRate'
    | 'byDate'
    | 'linkageCeiling'
    | 'maxRisePercentage'
    | 'needsPainting'
    | 'contractReadySummary'
    | 'contractReadySummaryDesc'
    | 'dataSummary'
    | 'linkedToIndex'
    | 'linkedToDollar'
    | 'knownIndexLabel'
    | 'respectOfLabel'
    | 'restrictions'
    | 'ceilingLabel'
    | 'floorLabel'
    | 'payment'
    | 'contract'
    | 'asset'
    | 'guaranteesLabel'
    | 'petsLabel'
    | 'saveContractFileQuery'
    | 'storageRentMateCloud'
    | 'storageRentMateCloudDesc'
    | 'storageThisDevice'
    | 'storageThisDeviceDesc'
    | 'storageBoth'
    | 'storageBothDesc'
    | 'storageCloudPolicy'
    | 'storageDevicePolicy'
    | 'storageBothPolicy'
    | 'originalContract'
    | 'openInNewWindow'
    | 'goBack'
    | 'savingEllipsis'
    | 'next'
    | 'overlapWarningTitle'
    | 'overlapWarningDesc'
    | 'existingContract'
    | 'rentyMantra'
    | 'generateReport'
    | 'done'
    | 'customize'
    | 'myPortfolio'
    | 'leaseEnds'
    | 'deleteAsset'
    | 'deleteAssetConfirm'
    | 'rentmateUser'
    | 'rentmateDashboard'

    // Payments Page
    | 'paymentsTitle'
    | 'trackFuturePayments'
    | 'allTypes'
    | 'rent'
    | 'bills'
    | 'paymentType'
    | 'addPayment' | 'addPayment_female'
    | 'monthlyExpected'
    | 'pendingCollection'
    | 'upcomingPayments'
    | 'noPaymentsFound'
    | 'totalExpected'
    | 'totalActual'
    | 'collectionRate'
    | 'exp'
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

    // Calculator & Reconciliation
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
    | 'baseIndexDate'
    | 'targetDate'
    | 'selectBaseDate' | 'selectBaseDate_female'
    | 'selectTargetDate' | 'selectTargetDate_female'
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
    | 'viewingSharedCalculation'
    | 'sharedCalculationDesc'
    | 'loadFromContract'
    | 'selectContractPlaceholder'
    | 'expectedBaseRent'
    | 'clearList'
    | 'generateList' | 'generateList_female'
    | 'dateAndBaseAmount'
    | 'actualPayments'
    | 'paymentDate'
    | 'paidAmount'
    | 'reconciliationTable'
    | 'expected'
    | 'index'
    | 'due'
    | 'gap'
    | 'overdue'
    | 'revenue'
    | 'calculateBackPay'
    | 'advancedReconciliationOptions'
    | 'paymentReconciliationResults'
    | 'totalBackPayOwed'
    | 'monthlyBreakdown'
    | 'shouldPay'
    | 'paid'
    | 'diff'
    | 'knownIndex'
    | 'inRespectOf'
    | 'knownIndexHelp'
    | 'updateFrequency'
    | 'everyMonth'
    | 'quarterly'
    | 'annually'
    | 'updateFrequencyHelp'
    | 'linkageFloor'
    | 'indexBaseMin'
    | 'indexBaseMinHelp'
    | 'maxIncrease'
    | 'capCeiling'
    | 'periodStart'
    | 'periodEnd'
    | 'avgUnderpayment'
    | 'percentageOwed'
    | 'globalBaseRentHelp'
    | 'noPaymentsListed'
    | 'addFirstPayment' | 'addFirstPayment_female'
    | 'manualPaymentHelp'
    | 'totalBase'
    | 'runningBalance'
    | 'linkageCalculationMethod'
    | 'advancedLinkageOptions'
    | 'indexSubType'

    // Property & Contract Wizards
    | 'newContract'
    | 'newContractDesc'
    | 'hideContract'
    | 'showContract'
    | 'aiScanTitle'
    | 'aiScanDesc'
    | 'scanNow'
    | 'contractScannedSuccess'
    | 'propertyDetails'
    | 'chooseProperty' | 'chooseProperty_female'
    | 'selectProperty' | 'selectProperty_female'
    | 'newProperty'
    | 'existingProperty'
    | 'propertyType'
    | 'apartment'
    | 'penthouse'
    | 'gardenApartment'
    | 'house'
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
    | 'chooseTenant' | 'chooseTenant_female'
    | 'fullName'
    | 'idNumber'
    | 'phone'
    | 'email'
    | 'signingDate'
    | 'optionPeriods'
    | 'addPeriod' | 'addPeriod_female'
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
    | 'addStep' | 'addStep_female'
    | 'stepDate'
    | 'newAmount'
    | 'linkageAndIndices'
    | 'notLinked'
    | 'linkedToCpi'
    | 'linkedToUsd'
    | 'linkedToEur'
    | 'linkedToHousing'
    | 'linkedToConstruction'
    | 'indexType'
    | 'ceiling'
    | 'floorIndex'
    | 'paymentFrequency'
    | 'bimonthly'
    | 'monthly'
    | 'paymentMethod'
    | 'securityAndAppendices'
    | 'securityDeposit'
    | 'guarantors'
    | 'guarantorName'
    | 'addGuarantor' | 'addGuarantor_female'
    | 'noGuarantors'
    | 'pets'
    | 'allowed'
    | 'forbidden'
    | 'contractFile'
    | 'savePreferences'
    | 'saveToCloud'
    | 'saveToDevice'
    | 'summary'
    | 'createContract' | 'createContract_female'
    | 'stepAsset'
    | 'stepTenant'
    | 'stepPeriods'
    | 'stepPayments'
    | 'stepSecurity'
    | 'stepSummary'
    | 'limitReached'
    | 'limitReachedDesc'
    | 'backToContracts'
    | 'transfer'
    | 'check'
    | 'cash'
    | 'bit'
    | 'paybox'
    | 'creditCard'
    | 'other'
    | 'semiAnnually'
    | 'bimonthly'
    | 'contractIsIndexed'
    | 'and'
    | 'days'
    | 'enterAddressAndCityFirst'
    | 'needsPaintingMsg'

    // Tenant Modal & Limits
    | 'viewTenantDetails'
    | 'editTenant' | 'editTenant_female'
    | 'viewContactInfo' | 'viewContactInfo_female'
    | 'updateTenantDetails' | 'updateTenantDetails_female'
    | 'addTenantToContacts' | 'addTenantToContacts_female'
    | 'assignedAsset'
    | 'noAssetsFoundDesc'
    | 'goToAssetsPage' | 'goToAssetsPage_female'
    | 'planLimitReached'
    | 'planLimitReachedTenantDesc'
    | 'planName'
    | 'foreignCurrency'
    | 'baseIndexValue'
    | 'indexOption'
    | 'linkageCategory'
    | 'propertySpecs'
    | 'leaseTerms'
    | 'financials'
    | 'partiesInvolved'
    | 'option'
    | 'periods'

    // Subscription & Plan
    | 'unlockPotential' | 'unlockPotential_female'
    | 'requestUpgrade' | 'requestUpgrade_female'
    | 'maybeLater'
    | 'requestSent'
    | 'requestSentDesc' | 'requestSentDesc_female'
    | 'gotItThanks'
    | 'feature'
    | 'free'
    | 'pro'
    | 'unlimited'
    | 'prioritySupport'
    | 'dataExport'
    | 'contactSupport' | 'contactSupport_female'
    | 'contactSupportDesc' | 'contactSupportDesc_female'
    | 'typeMessageHere' | 'typeMessageHere_female'
    | 'orEmailDirectly' | 'orEmailDirectly_female'
    | 'upgradeToPro' | 'upgradeToPro_female'
    | 'unlockMoreLimits' | 'unlockMoreLimits_female'
    | 'currentPlan'
    | 'freeForever'
    | 'greatForGettingStarted'

    // Misc
    | 'noActiveContracts'
    | 'noActiveContractsDesc'
    | 'sendMessage' | 'sendMessage_female'
    | 'sending'
    | 'messageSent'
    | 'unspecified'
    | 'gender'
    | 'male'
    | 'female'
    | 'appVersion'
    | 'accessibilityStatement'
    | 'languageLocalization'
    | 'language'
    | 'genderForHebrew'
    | 'support'
    | 'calculationFailed'
    | 'deletePaymentConfirmation'
    | 'deleteExpectedConfirmation'
    | 'calculateLinkageAndMore'
    | 'tenantDisconnectedWarning'
    | 'paymentsDeletedWarning'
    | 'deleteContractTitle'
    | 'deleteContractMessage' | 'deleteContractMessage_female'
    | 'noPhone'
    | 'deleteTenantError'
    | 'addNewTenant' | 'addNewTenant_female'
    | 'myTenants'
    | 'manageTenantsDesc'
    | 'addProperty' | 'addProperty_female'
    | 'noAssetsFound'
    | 'addFirstPropertyDesc' | 'addFirstPropertyDesc_female'
    | 'createFirstAsset' | 'createFirstAsset_female'
    | 'occupied'
    | 'vacant'
    | 'sqm'
    | 'monthlyRentLabel'
    | 'tenantsToBeDisconnected'
    | 'unnamed'
    | 'unknown'
    | 'addTenant' | 'addTenant_female'
    | 'addFirstTenantDesc' | 'addFirstTenantDesc_female'
    | 'noTenantsFound'
    | 'contractsTitle'
    | 'contractsSubtitle'
    | 'all'
    | 'active'
    | 'archived'
    | 'storageUsage'
    | 'totalStorage'
    | 'usedStorage'
    | 'mediaStorage'
    | 'utilitiesStorage'
    | 'maintenanceStorage'
    | 'documentsStorage'
    | 'storageLimitReached'
    | 'storageLimitReachedDesc'
    | 'storageNearLimit'
    | 'storageNearLimitDesc'
    | 'maxStorage'
    | 'maxMediaStorage'
    | 'maxUtilitiesStorage'
    | 'maxMaintenanceStorage'
    | 'maxDocumentsStorage'
    | 'maxFileSize'
    | 'unlimitedSymbol'
    | 'photosAndVideos'
    | 'mediaGalleryDesc'
    | 'uploadingMedia'
    | 'uploadMedia' | 'uploadMedia_female'
    | 'noMediaYet'
    | 'uploadMediaDesc'
    | 'deleteFileConfirmation' | 'deleteFileConfirmation_female'
    | 'utilityWater'
    | 'utilityElectric'
    | 'utilityGas'
    | 'utilityMunicipality'
    | 'utilityManagement'
    | 'totalBills'
    | 'unpaid'
    | 'uploadNewBill' | 'uploadNewBill_female'
    | 'uploadBillTitle'
    | 'billDate'
    | 'markAsPaid' | 'markAsPaid_female'
    | 'markAsUnpaid' | 'markAsUnpaid_female'
    | 'deleteBillConfirmation' | 'deleteBillConfirmation_female'
    | 'noBillsYet'
    | 'maintenanceDesc'
    | 'totalSpent'
    | 'addMaintenanceRecord' | 'addMaintenanceRecord_female'
    | 'newMaintenanceRecord'
    | 'fileInvoiceReceipt'
    | 'description'
    | 'issueType'
    | 'selectType'
    | 'vendor'
    | 'cost'
    | 'noMaintenanceRecordsYet'
    | 'deleteMaintenanceRecordConfirmation' | 'deleteMaintenanceRecordConfirmation_female'
    | 'issuePlumbing'
    | 'issueElectrical'
    | 'issueHVAC'
    | 'issuePainting'
    | 'issueCarpentry'
    | 'issueAppliance'
    | 'issueOther'
    | 'addRecord' | 'addRecord_female'
    | 'documentsDesc'
    | 'documentsCount'
    | 'uploadDocument' | 'uploadDocument_female'
    | 'newDocument'
    | 'category'
    | 'catInsurance'
    | 'catWarranty'
    | 'catLegal'
    | 'catInvoice'
    | 'catReceipt'
    | 'catOther'
    | 'noDocumentsYet'
    | 'deleteDocumentConfirmation' | 'deleteDocumentConfirmation_female'
    | 'storageQuotaExceeded'
    | 'storageLow'
    | 'storageQuotaExceededDesc'
    | 'storageLowDesc'
    | 'breakdownMedia'
    | 'breakdownUtilities'
    | 'breakdownMaintenance'
    | 'breakdownDocuments'
    | 'newAlbum'
    | 'createAlbumDesc'
    | 'albumName'
    | 'optionalAlbumNote'
    | 'mediaFiles'
    | 'saveAlbum'
    | 'deleteAlbum'
    | 'unsortedMedia'
    | 'createNewAlbum'
    | 'createBillFolder'
    | 'newBillEntry'
    | 'subject'
    | 'saveBillEntry'
    | 'createMaintenanceFolder'
    | 'newMaintenanceEntry'
    | 'saveRecord'
    | 'clickToUploadDrag'
    | 'unsortedRecords'
    | 'unsortedFiles'
    | 'deleteFolder'
    | 'averageMonthly' | 'averageMonthly_female'
    | 'trend' | 'trend_female'
    | 'increasing' | 'increasing_female'
    | 'decreasing' | 'decreasing_female' | 'decreasing_male'
    | 'stable' | 'stable_female' | 'stable_male'
    | 'enablePush'
    | 'knowledgeBase'
    | 'lp_new_scan'
    | 'lp_hero_title_1'
    | 'lp_hero_title_2'
    | 'lp_hero_subtitle'
    | 'lp_btn_start'
    | 'lp_btn_features'
    | 'lp_trusted_by'
    | 'lp_annual_yield'
    | 'lp_nav_features'
    | 'lp_nav_pricing'
    | 'lp_nav_about'
    | 'lp_footer_product'
    | 'lp_footer_company'
    | 'lp_footer_legal'
    | 'lp_all_rights'
    | 'lp_systems_operational'
    | 'lp_fe_features_title'
    | 'lp_fe_features_subtitle'
    | 'lp_fe_cpi_title'
    | 'lp_fe_cpi_desc'
    | 'lp_fe_ai_title'
    | 'lp_fe_ai_desc'
    | 'lp_fe_tenants_title'
    | 'lp_fe_alerts_title'
    | 'lp_fe_alerts_desc'
    | 'lp_cta_title_1'
    | 'lp_cta_title_2'
    | 'lp_cta_subtitle'
    | 'lp_cta_btn'
    | 'auth_welcome_back'
    | 'auth_join'
    | 'auth_email'
    | 'auth_password'
    | 'auth_forgot_password'
    | 'auth_sign_in'
    | 'auth_create_account'
    | 'auth_or_continue'
    | 'auth_no_account'
    | 'auth_have_account'
    | 'auth_check_inbox'
    | 'auth_confirmation_sent'
    | 'user_generic'
    | 'passwordRequirementLength'
    | 'passwordRequirementUppercase'
    | 'passwordRequirementLowercase'
    | 'passwordRequirementNumber'
    | 'passwordRequirementSpecial'
    | 'passwordStrength'
    | 'passwordWeak'
    | 'passwordMedium'
    | 'passwordStrong'
    | 'passwordVeryStrong'
    | 'shared_calc_loading'
    | 'shared_calc_not_found'
    | 'shared_calc_not_found_desc'
    | 'shared_calc_go_home'
    | 'shared_calc_official_reconciliation'
    | 'shared_calc_official_index'
    | 'shared_calc_updated_rent'
    | 'shared_calc_base_rent'
    | 'shared_calc_linkage'
    | 'shared_calc_base_date'
    | 'shared_calc_target_date'
    | 'shared_calc_index_change'
    | 'shared_calc_amount_added'
    | 'shared_calc_total_backpay'
    | 'shared_calc_months'
    | 'shared_calc_avg_month'
    | 'shared_calc_monthly_breakdown'
    | 'shared_calc_month'
    | 'shared_calc_diff'
    | 'shared_calc_disclaimer'
    | 'shared_calc_cta'
    | 'shared_calc_cta_link'
    | 'pricing_title'
    | 'pricing_subtitle'
    | 'pricing_monthly'
    | 'pricing_yearly'
    | 'pricing_save'
    | 'pricing_most_popular'
    | 'pricing_per_month'
    | 'pricing_billed_yearly'
    | 'pricing_properties'
    | 'pricing_tenants'
    | 'pricing_data_export'
    | 'pricing_priority_support'
    | 'pricing_api_access'
    | 'pricing_get_started'
    | 'pricing_contact_sales'
    | 'pricing_custom_plan'
    | 'pricing_storage'
    | 'settings_help_resources'
    | 'settings_admin_dashboard'
    | 'settings_admin_desc'
    | 'settings_sent'
    | 'lp_footer_careers'
    | 'lp_footer_contact'
    | 'lp_footer_security'
    | 'contractExpiringSoon'
    | 'viewContract'
    | 'paymentOverdue'
    | 'paymentDueSoon'
    | 'viewPayments'
    | 'scanningBill'
    | 'autoFilledByGemini'
    | 'organizeDocsTitle'
    | 'organizeDocsDesc'
    | 'uploadNow'
    | 'smartRecommendation'
    | 'knowledgeBaseDesc'
    | 'privacySecurityTitle'
    | 'privacySecuritySubtitle'
    | 'changePassword'
    | 'changePasswordBtn'
    | 'deleteAccount'
    | 'deletionProcessTitle'
    | 'deletionStep1'
    | 'deletionStep2'
    | 'deletionStep3'
    | 'deletionStep4'
    | 'deletionStep5'
    | 'suspendAccountBtn'
    | 'newPassword'
    | 'confirmPassword'
    | 'enterNewPassword'
    | 'enterPasswordAgain'
    | 'passwordChangedSuccess'
    | 'passwordLengthError'
    | 'passwordsDoNotMatch'
    | 'errorChangingPassword'
    | 'accountSuspendedSuccess'
    | 'errorSuspendingAccount'
    | 'suspendConfirmation'
    | 'indexWatcherTitle'
    | 'liveUpdate'
    | 'currentRent'
    | 'projectedRent'
    | 'newIndexPublished'
    | 'noLinkedContracts'
    | 'linkageStatus'
    | 'calculatingProjection'
    | 'backToDashboard'
    | 'appearance'
    | 'theme'
    | 'chooseTheme'
    | 'chooseLanguage'
    | 'preferencesAndAccount'
    | 'stepOptionRent'
    | 'extensionEndDate'
    | 'extensionRent'
    | 'maxIncrease'
    | 'floorIndex'
    | 'indexBaseMin'
    | 'monthlyRent'
    ;

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
        cookieConsentTitle: 'אנחנו משתמשים ב-Cookies',
        cookieConsentDesc: 'אנחנו משתמשים בקבצי עוגיות כדי לשפר את החוויה שלך באתר. בגלישה באתר הנך מסכים ל',
        cookieConsentPrivacyPolicy: 'מדיניות הפרטיות',
        cookieConsentClose: 'סגור',
        cookieConsentAccept: 'אני מסכים',

        agreeToTerms: 'אני מסכים ל{terms} ול{privacy}',
        marketingConsent: 'אני מאשר קבלת עדכונים ותכנים שיווקיים (ניתן לבטל בכל עת)',
        legalDocs: 'מסמכים משפטיים',
        privacyPolicy: 'מדיניות פרטיות',
        termsOfService: 'תנאי שימוש',

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
        paymentPendingTitle: 'תשלום ממתין',
        paymentPendingDesc: 'יש לך חוב של ₪{amount} שטרם נגבה',
        sendReminder: 'שלח תזכורת',
        sendReminder_female: 'שלחי תזכורת',
        activeMaintenanceTitle: 'קריאות שירות פתוחות',
        activeMaintenanceDesc: 'יש לך {count} קריאות שירות הממתינות לטיפול',
        viewRequests: 'צפה בקריאות',
        viewRequests_female: 'צפי בקריאות',
        smartRecommendation: 'המלצה חכמה',
        alerts: 'התראות',
        contractExpiringSoon: 'חוזה מסתיים בקרוב',
        viewContract: 'צפה בחוזה',
        paymentOverdue: 'תשלום באיחור',
        paymentDueSoon: 'תשלום בקרוב',
        viewPayments: 'צפה בתשלומים',
        scanningBill: 'Gemini מנתח את המסמך...',
        autoFilledByGemini: 'מולא אוטומטית על ידי AI',
        manageStorage: 'ניהול אחסון',
        manageStorage_female: 'ניהול אחסון',
        items: 'פריטים',
        now: 'עכשיו',
        addContractDesc: 'הוסף את החוזה הראשון שלך כדי להתחיל לעקוב',
        organizeDocsTitle: 'ארגן את המסמכים שלך',
        organizeDocsDesc: 'העלה קבלות וחשבונות למקום אחד מסודר',
        uploadNow: 'העלה עכשיו',
        uploadNow_female: 'העלה עכשיו',
        leaseTimeline: 'ציר זמן שכירות',
        viewAll: 'צפה בכל',
        upcomingAlerts: 'התראות קרובות',
        addAsset: 'הוסף נכס',
        systemStatus: 'סטטוס מערכת',
        location: 'מיקום',
        specifications: 'מפרט',
        visuals: 'תמונות',
        saveRequired: 'יש לשמור קודם',
        savePropertyToAttachDocs: 'שמור את הנכס כדי לצרף מסמכים',
        knowledgeBaseDesc: 'מאגר ידע חכם לניהול נכסים',
        indexWatcherTitle: 'מעקב מדדים חי',
        liveUpdate: 'עדכון חי',
        currentRent: 'שכירות נוכחית',
        projectedRent: 'שכירות צפויה',
        newIndexPublished: 'פורסם מדד חדש!',
        noLinkedContracts: 'אין חוזים צמודי מדד פעילים',
        linkageStatus: 'סטטוס הצמדה',
        calculatingProjection: 'מחשב תחזית...',

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
        contract: 'חוזה',

        paymentsTitle: 'תשלומים',
        trackFuturePayments: 'מעקב תשלומים',
        allTypes: 'כל הסוגים',
        rent: 'שכירות',
        bills: 'חשבונות',
        paymentType: 'סוג תשלום',
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
        period: 'תקופה',
        from: 'מ-',
        to: 'עד-',

        indexCalculator: 'מחשבון הצמדה',
        calculatorDesc: 'חישוב הפרשי הצמדה למדד והתחשבנות',
        standardCalculation: 'חישוב רגיל',
        paymentReconciliation: 'התחשבנות (רטרו)',
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
        linkedToCpi: 'מדד המחירים לצרכן',
        linkedToUsd: 'צמוד דולר ($)',
        linkedToEur: 'צמוד אירו (€)',
        linkedToHousing: 'מדד מחירי הדיור',
        linkedToConstruction: 'מדד תשומות הבנייה',
        indexType: 'סוג מדד',

        ceiling: 'תקרה (מקסימום %)',
        floorIndex: 'מדד בסיס מהווה רצפה',
        paymentFrequency: 'תדירות תשלום',
        monthly: 'חודשי',
        bimonthly: 'דו חודשי',
        paymentMethod: 'אמצעי תשלום',
        transfer: 'העברה בנקאית',
        check: 'צ\'ק',
        cash: 'מזומן',
        bit: 'Bit',
        paybox: 'PayBox',
        creditCard: 'כרטיס אשראי',
        other: 'אחר',
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
        stepAsset: 'פרטי נכס',
        stepTenant: 'פרטי דייר',
        stepPeriods: 'תקופות',
        stepPayments: 'תשלומים',
        stepSecurity: 'בטוחות',
        stepSummary: 'סיכום',
        limitReached: 'מכסת החוזים מלאה',
        limitReachedDesc: 'הגעת למכסת החוזים המקסימלית בתוכנית שלך.',
        backToContracts: 'חזור לחוזים',
        contractDetails: 'פרטי חוזה',
        editContract: 'ערוך חוזה',
        contractPeriodStatus: 'תקופת חוזה וסטטוס',
        paymentFreq: 'תדירות תשלום',
        paymentDay: 'יום תשלום',
        day: 'יום',
        rentStepsVariable: 'מדרגות שכר דירה (משתנה)',
        addRentStep: '+ הוסף מדרגת שכר דירה',
        linkageAdjustments: 'הצמדה והתאמות',
        subType: 'תת-סוג',
        mos: 'חוד\'',
        yrs: 'שנים',
        addOptionPeriod: '+ הוסף תקופת אופציה',
        depositAmount: 'סכום הפיקדון',
        reference: 'אסמכתא',
        referencePlaceholder: 'קוד אישור, מספר צ\'ק...',
        dueDate: 'תאריך פירעון',
        paidDate: 'תאריך תשלום',
        selectContract: 'בחר חוזה...',
        saveAndAddAnother: 'שמור והוסף נוסף',
        createAndClose: 'צור וסגור',
        addPaymentTitle: 'הוספת תשלום',
        optional: 'רשות',
        endOfForm: 'סוף הטופס',
        namePhoneRequired: 'שם וטלפון הם שדות חובה',
        mustBeLoggedIn: 'עליך להיות מחובר כדי להוסיף שוכר',
        addItem: 'הוסף פריט',
        globalBaseRentHelp: 'שכירות בסיס חודשית קבועה (אלא אם הוגדר אחרת ברשימה).',
        baseIndexDate: 'תאריך בסיס למדד',
        baseIndexValue: 'ערך מדד בסיס',
        noPaymentsListed: 'אין תשלומים ברשימה.',
        addFirstPayment: 'הוסף תשלום ראשון',
        manualPaymentHelp: 'הזן את הסכום החודשי הממוצע ששולם.',
        periodStart: 'תחילת תקופה',
        periodEnd: 'סיום תקופה',
        vendorName: 'שם הספק',
        optionalFolderNote: 'הערה אופציונלית',
        eg_january_bill: 'לדוגמה: חשבון ינואר',
        eg_electric_corp: 'לדוגמה: חברת החשמל',
        calculateBackPay: 'חשב הפרשים',
        advancedReconciliationOptions: 'אפשרויות התחשבנות מתקדמות',
        paymentReconciliationResults: 'תוצאות התחשבנות',
        totalBackPayOwed: 'סה"כ חוב הפרשים',
        monthlyBreakdown: 'פירוט התחשבנות',
        shouldPay: 'היה צריך לשלם',
        paid: 'שולם',
        diff: 'הפרש',
        knownIndex: 'מדד ידוע',
        inRespectOf: 'מדד בגין',
        knownIndexHelp: '"מדד ידוע": פורסם לפני התשלום. "מדד בגין": לפי חודש התשלום.',
        updateFrequency: 'תדירות עדכון',
        everyMonth: 'כל חודש',
        quarterly: 'רבעוני',
        semiAnnually: 'חצי-שנתי',
        annually: 'שנתי',
        updateFrequencyHelp: 'כל כמה זמן מתעדכנת ההצמדה.',
        linkageFloor: 'רצפת הצמדה',
        indexBaseMin: 'מדד בסיס הוא מדד מינימום',
        indexBaseMinHelp: 'אם מסומן, השכירות לא תרד מתחת לבסיס גם במדד שלילי.',
        maxIncrease: 'תקרת עלייה (%)',
        capCeiling: 'תקרה לעלייה',
        linkageCalculationMethod: 'שיטת חישוב הצמדה',
        advancedLinkageOptions: 'אפשרויות הצמדה מתקדמות',
        indexSubType: 'סוג מדד הצמדה',
        avgUnderpayment: 'ממוצע חסר לחודש',
        percentageOwed: 'אחוז חוב',
        foreignCurrency: 'מט"ח',
        indexOption: 'מדד',
        linkageCategory: 'סוג הצמדה',
        propertySpecs: 'מפרט הנכס',
        leaseTerms: 'תנאי השכירות',
        financials: 'פרטים פיננסיים',
        partiesInvolved: 'הצדדים לחוזה',
        option: 'אופציה',
        periods: 'תקופות',

        name: 'שם',
        address: 'כתובת',
        city: 'עיר',
        status: 'סטטוס',
        amount: 'סכום',
        currency: 'מטבע',
        date: 'תאריך',

        note: 'הערה',
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
        contactSupport: 'צור קשר עם התמיכה',
        contactSupport_female: 'צרי קשר עם התמיכה',
        typeMessageHere: 'כתוב את ההודעה כאן...',
        typeMessageHere_female: 'כתבי את ההודעה כאן...',
        orEmailDirectly: 'או שלח מייל ישירות ל-',
        orEmailDirectly_female: 'או שלחי מייל ישירות ל-',
        appVersion: 'גרסת אפליקציה',
        profile: 'פרופיל',
        notifications: 'התראות',
        privacySecurity: 'פרטיות ואבטחה',
        appearance: 'נראות אפליקציה',
        chooseTheme: 'בחר ערכת נושא להצגה',
        chooseLanguage: 'בחר שפת ממשק',
        preferencesAndAccount: 'העדפות וחשבון',
        theme: 'עיצוב',

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
        totalBase: 'בסיס סה"כ',
        planName: 'תוכנית',
        sendMessage: 'שלח הודעה',
        sendMessage_female: 'שלחי הודעה',
        // Storage
        storageUsage: 'שימוש באחסון',
        totalStorage: 'סה"כ אחסון',
        usedStorage: 'אחסון בשימוש',
        mediaStorage: 'מדיה (תמונות/וידאו)',
        utilitiesStorage: 'חשבונות ותשלומים',
        maintenanceStorage: 'תחזוקה',
        documentsStorage: 'מסמכים כלליים',
        storageLimitReached: 'מכסת האחסון הסתיימה',
        storageLimitReachedDesc: 'הגעת למכסת האחסון שלך. יש למחוק קבצים או לשדרג תוכנית כדי להמשיך להעלות.',
        storageNearLimit: 'שטח האחסון עומד להסתיים',
        storageNearLimitDesc: 'ניצלת את {percent}% מנפח האחסון הזמין שלך.',
        maxStorage: 'אחסון סה"כ',
        maxMediaStorage: 'מכסת מדיה',
        maxUtilitiesStorage: 'מכסת חשבונות',
        maxMaintenanceStorage: 'מכסת תחזוקה',
        maxDocumentsStorage: 'מכסת מסמכים',
        maxFileSize: 'גודל קובץ מקסימלי',
        unlimitedSymbol: '∞',
        photosAndVideos: 'תמונות וסרטונים',
        mediaGalleryDesc: 'תיעוד ומדיה של הנכס',
        uploadingMedia: 'מעלה {current}/{total}',
        uploadMedia: 'העלה מדיה',
        uploadMedia_female: 'הוסיפי מדיה',
        noMediaYet: 'אין מדיה עדיין',
        uploadMediaDesc: 'העלה תמונות וסרטונים של הנכס',
        deleteFileConfirmation: 'האם אתה בטוח שברצונך למחוק קובץ זה?',
        deleteFileConfirmation_female: 'האם את בטוחה שברצונך למחוק קובץ זה?',
        utilityWater: 'מים',
        utilityElectric: 'חשמל',
        utilityGas: 'גז',
        utilityMunicipality: 'ארנונה',
        utilityManagement: 'דמי ניהול',
        totalBills: 'סה"כ חשבונות',
        unpaid: 'לא שולם',
        uploadNewBill: 'העלה חשבון חדש',
        uploadNewBill_female: 'העלי חשבון חדש',
        uploadBillTitle: 'העלאת חשבון {type}',
        billDate: 'תאריך החשבון',
        markAsPaid: 'סמן כשולם',
        markAsPaid_female: 'סמני כשולם',
        markAsUnpaid: 'סמן כלא שולם',
        markAsUnpaid_female: 'סמני כלא שולם',
        deleteBillConfirmation: 'למחוק את החשבון הזה?',
        deleteBillConfirmation_female: 'למחוק את החשבון הזה?',
        noBillsYet: 'אין חשבונות {type} עדיין',
        maintenanceDesc: 'תיקונים, חשבוניות ורישומי שירות',
        totalSpent: 'סה"כ הוצאות',
        addMaintenanceRecord: 'הוסף רישום תחזוקה',
        addMaintenanceRecord_female: 'הוסיפי רישום תחזוקה',
        newMaintenanceRecord: 'רישום תחזוקה חדש',
        fileInvoiceReceipt: 'קובץ (חשבונית/קבלה)',
        description: 'תיאור',
        issueType: 'סוג תקלה',
        selectType: 'בחר סוג',
        vendor: 'ספק שירות',
        cost: 'עלות',
        noMaintenanceRecordsYet: 'אין רישומי תחזוקה עדיין',
        deleteMaintenanceRecordConfirmation: 'למחוק את רישום התחזוקה הזה?',
        deleteMaintenanceRecordConfirmation_female: 'למחוק את רישום התחזוקה הזה?',
        issuePlumbing: 'אינסטלציה',
        issueElectrical: 'חשמל',
        issueHVAC: 'מיזוג אוויר',
        issuePainting: 'צבע',
        issueCarpentry: 'נגרות',
        issueAppliance: 'מכשירי חשמל',
        issueOther: 'אחר',
        addRecord: 'הוסף רישום',
        addRecord_female: 'הוסיפי רישום',
        documentsDesc: 'ביטוח, אחריות, מסמכים משפטיים ועוד',
        documentsCount: '{count} מסמכים',
        uploadDocument: 'העלה מסמך',
        uploadDocument_female: 'העלי מסמך',
        newDocument: 'מסמך חדש',
        category: 'קטגוריה',
        catInsurance: 'ביטוח',
        catWarranty: 'אחריות',
        catLegal: 'משפטי',
        catInvoice: 'חשבונית',
        catReceipt: 'קבלה',
        catOther: 'אחר',
        noDocumentsYet: 'אין מסמכים עדיין',
        deleteDocumentConfirmation: 'למחוק את המסמך הזה?',
        deleteDocumentConfirmation_female: 'למחוק את המסמך הזה?',
        storageQuotaExceeded: 'חריגה ממכסת האחסון',
        storageLow: 'שטח האחסון אוזל',
        storageQuotaExceededDesc: 'הגעת למגבלת האחסון שלך. מחק קבצים או שדרג את התוכנית כדי להמשיך להעלות.',
        storageLowDesc: 'ניצלת {percent}% משטח האחסון הפנוי שלך.',
        breakdownMedia: 'מדיה',
        breakdownUtilities: 'חשבונות',
        breakdownMaintenance: 'תחזוקה',
        breakdownDocuments: 'מסמכים',

        // Media Gallery
        newAlbum: 'אלבום חדש',
        createAlbumDesc: 'צור אלבום חדש לתמונות וסרטונים',
        albumName: 'שם אלבום',
        optionalAlbumNote: 'הערת אלבום (אופציונלי)',
        mediaFiles: 'קבצי מדיה',
        saveAlbum: 'שמור אלבום',
        deleteAlbum: 'מחק אלבום',
        unsortedMedia: 'מדיה לא ממוינת',
        createNewAlbum: '+ צור אלבום חדש',

        // Utilities & Maintenance
        createBillFolder: '+ צור תיקיית חשבונות',
        newBillEntry: 'רשומת חשבונים חדשה',
        subject: 'נושא',
        saveBillEntry: 'שמור תיקייה',
        createMaintenanceFolder: '+ צור תיקיית תחזוקה',
        newMaintenanceEntry: 'רשומת תחזוקה חדשה',
        saveRecord: 'שמור רשומה',
        clickToUploadDrag: 'לחץ להעלאה או גרור קבצים לכאן',
        unsortedRecords: 'רשומות לא ממוינות',
        unsortedFiles: 'קבצים לא ממוינים',
        deleteFolder: 'מחק תיקייה',
        averageMonthly: 'ממוצע חודשי',
        averageMonthly_female: 'ממוצעת חודשית',
        trend: 'מגמה',
        trend_female: 'מגמה',
        increasing: 'עולה',
        increasing_female: 'עולה',
        decreasing: 'יורד',
        decreasing_female: 'יורדת',
        decreasing_male: 'יורד',
        stable: 'יציב',
        stable_female: 'יציבה',
        stable_male: 'יציב',
        knowledgeBase: 'מרכז מידע',
        notificationsTitle: 'התראות',
        markAllRead: 'סמן הכל כנקרא',
        noNotifications: 'אין התראות עדיין',
        enablePush: 'הפעל התראות פוש',
        lp_new_scan: 'חדש: סריקת חוזים ב-AI ✨',
        lp_hero_title_1: 'ניהול נכסים,',
        lp_hero_title_2: 'פשוט וחכם.',
        lp_hero_subtitle: 'הפלטפורמה המובילה לניהול שכירות. חישוב הצמדות אוטומטי, יצירת חוזים, ומעקב תשלומים - הכל במקום אחד, בטוח ומאובטח.',
        lp_btn_start: 'התחילו ניסיון חינם',
        lp_btn_features: 'גלו את הפיצ\'רים',
        lp_trusted_by: 'בשימוש חברות הניהול המובילות',
        lp_annual_yield: 'תשואה שנתית',
        lp_nav_features: 'פיצ\'רים',
        lp_nav_pricing: 'מחירים',
        lp_nav_about: 'אודות',
        lp_footer_product: 'המוצר',
        lp_footer_company: 'חברה',
        lp_footer_legal: 'משפטי',
        lp_all_rights: 'כל הזכויות שמורות.',
        lp_systems_operational: 'מערכות פועלות כסדרן',
        lp_fe_features_title: 'הכלים שאתם צריכים',
        lp_fe_features_subtitle: 'במעטפת אחת פשוטה וחכמה. ללא סיבוכים, ללא בירוקרטיה.',
        lp_fe_cpi_title: 'מדד המחירים לצרכן',
        lp_fe_cpi_desc: 'חישוב הצמדות אוטומטי בזמן אמת. המערכת שואבת נתונים ישירות מהלמ"ס ומעדכנת את שכר הדירה.',
        lp_fe_ai_title: 'סורק חוזים AI',
        lp_fe_ai_desc: 'העלו קובץ PDF והמערכת תחלץ אוטומטית את כל נתוני החוזה, התשלומים והמועדים.',
        lp_fe_tenants_title: 'ניהול דיירים',
        lp_fe_alerts_title: 'התראות חכמות',
        lp_fe_alerts_desc: 'רנט-מייט תזכיר לך כשצריך לחדש חוזה או לגבות צ\'ק.',
        lp_cta_title_1: 'מוכנים לנהל את הנכסים שלכם',
        lp_cta_title_2: 'כמו מקצוענים?',
        lp_cta_subtitle: 'הצטרפו למאות משכירים שכבר נהנים משקט נפשי, חוזים חכמים, וניהול פיננסי אוטומטי. ההרשמה חינם וללא התחייבות.',
        lp_cta_btn: 'התחילו עכשיו בחינם',
        auth_welcome_back: 'ברוכים השבים',
        auth_join: 'הצטרפו ל-RentMate',
        auth_email: 'כתובת אימייל',
        auth_password: 'סיסמה',
        auth_forgot_password: 'שכחת סיסמה?',
        auth_sign_in: 'התחברות',
        auth_create_account: 'יצירת חשבון',
        auth_or_continue: 'או המשך עם',
        auth_no_account: 'אין לך חשבון? הרשמה',
        auth_have_account: 'כבר יש לך חשבון? התחברות',
        auth_check_inbox: 'בדוק את תיבת הדואר שלך',
        auth_confirmation_sent: 'שלחנו קישור אישור ל-{email}. אנא אשר את המייל כדי לפתוח את החשבון.',

        // Dashboard Extras
        user_generic: 'משתמש',
        passwordRequirementLength: 'לפחות 8 תווים',
        passwordRequirementUppercase: 'אות גדולה (A-Z)',
        passwordRequirementLowercase: 'אות קטנה (a-z)',
        passwordRequirementNumber: 'מספר (0-9)',
        passwordRequirementSpecial: 'תו מיוחד (!@#$%)',
        passwordStrength: 'חוזק סיסמה',
        passwordWeak: 'חלשה',
        passwordMedium: 'בינונית',
        passwordStrong: 'חזקה',
        passwordVeryStrong: 'חזקה מאוד',

        // Shared Calculation
        shared_calc_loading: 'טוען חישוב...',
        shared_calc_not_found: 'חישוב לא נמצא',
        shared_calc_not_found_desc: 'החישוב המבוקש לא נמצא. ייתכן שהוא נמחק או שהקישור אינו תקין.',
        shared_calc_go_home: 'חזרה לדף הבית',
        shared_calc_official_reconciliation: 'דו״ח התחשבנות רשמי',
        shared_calc_official_index: 'חישוב הצמדה למדד רשמי',
        shared_calc_updated_rent: 'סכום שכירות מעודכן',
        shared_calc_base_rent: 'שכירות בסיס',
        shared_calc_linkage: 'סוג הצמדה',
        shared_calc_base_date: 'מדד בסיס',
        shared_calc_target_date: 'מדד יעד',
        shared_calc_index_change: 'שינוי במדד',
        shared_calc_amount_added: 'סכום שנוסף',
        shared_calc_total_backpay: 'סך חוב רטרואקטיבי',
        shared_calc_months: 'חודשים',
        shared_calc_avg_month: 'ממוצע לחודש',
        shared_calc_monthly_breakdown: 'פירוט חודשי',
        shared_calc_month: 'חודש',
        shared_calc_diff: 'הפרש',
        shared_calc_disclaimer: 'חישוב זה הופק באופן אוטומטי בהתבסס על נתוני מדד המחירים לצרכן כפי שפורסמו על ידי הלשכה המרכזית לסטטיסטיקה.',
        shared_calc_cta: 'משכירים ב-RentMate?',
        shared_calc_cta_link: 'צרו חישוב משלכם',
        pricing_title: 'חבילות ומחירים',
        pricing_subtitle: 'בחרו את התוכנית המתאימה לצרכי ניהול הנכסים שלכם. התחילו בחינם, שדרגו בכל עת.',
        pricing_monthly: 'חודשי',
        pricing_yearly: 'שנתי',
        pricing_save: 'חסכון של 20%',
        pricing_most_popular: 'הכי פופולרי',
        pricing_per_month: '/חודש',
        pricing_billed_yearly: 'מחויב ${price}/שנה',
        pricing_properties: 'נכסים',
        pricing_tenants: 'דיירים',
        pricing_data_export: 'ייצוא נתונים (CSV/PDF)',
        pricing_priority_support: 'תמיכה בעדיפות',
        pricing_api_access: 'גישת API',
        pricing_get_started: 'התחילו עכשיו',
        pricing_contact_sales: 'צרו קשר עם מחלקת המכירות',
        pricing_custom_plan: 'זקוקים לתוכנית מותאמת אישית?',
        pricing_storage: 'נפח אחסון ({quota})',
        settings_help_resources: 'עזרה ומשאבים',
        settings_admin_dashboard: 'לוח בקרה למנהל',
        settings_admin_desc: 'ניהול משתמשים, חשבוניות והגדרות מערכת',
        settings_sent: 'נשלח',
        lp_footer_careers: 'קריירה',
        lp_footer_contact: 'צור קשר',
        lp_footer_security: 'אבטחת מידע',
        privacySecurityTitle: 'פרטיות ואבטחה',
        privacySecuritySubtitle: 'נהלו את הגדרות האבטחה שלכם',
        changePassword: 'שינוי סיסמה',
        changePasswordBtn: 'שינוי סיסמה',
        deleteAccount: 'מחיקת חשבון',
        deletionProcessTitle: 'תהליך מחיקת חשבון:',
        deletionStep1: 'החשבון יושעה למשך 14 ימים',
        deletionStep2: 'לא תוכלו להתחבר במהלך תקופה זו',
        deletionStep3: 'הנתונים שלכם יישמרו',
        deletionStep4: 'ניתן לבטל את התהליך על ידי פנייה לתמיכה',
        deletionStep5: 'לאחר 14 ימים - מחיקה לצמיתות',
        suspendAccountBtn: 'השעיית חשבון',
        newPassword: 'סיסמה חדשה',
        confirmPassword: 'אישור סיסמה',
        enterNewPassword: 'הזינו סיסמה חדשה',
        enterPasswordAgain: 'הזינו את הסיסמה שוב',
        passwordChangedSuccess: 'הסיסמה שונתה בהצלחה!',
        passwordLengthError: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        passwordsDoNotMatch: 'הסיסמאות אינן תואמות',
        errorChangingPassword: 'שגיאה בשינוי הסיסמה',
        accountSuspendedSuccess: 'החשבון הושעה בהצלחה. תקבלו אימייל עם פרטים נוספים.',
        errorSuspendingAccount: 'שגיאה בהשעיית החשבון',
        suspendConfirmation: 'חשבונכם יושעה למשך 14 ימים.\n\nבמהלך תקופה זו:\n• לא תוכלו להתחבר למערכת\n• הנתונים שלכם יישמרו\n• תוכלו לבטל את ההשעיה על ידי פנייה לתמיכה\n\nלאחר 14 ימים, החשבון והנתונים יימחקו לצמיתות.\n\nהאם להמשיך?',
        backToDashboard: 'חזרה ללוח הבקרה',
        stepOptionRent: 'שכר דירה באופציה',
        extensionEndDate: 'תאריך סיום האופציה',
        extensionRent: 'שכר דירה באופציה',
        manualRate: 'שער ידני',
        byDate: 'לפי תאריך',
        linkageCeiling: 'תקרת הצמדה',
        maxRisePercentage: 'מקסימום עלייה (%)',
        needsPainting: 'האם נדרש צבע?',
        contractReadySummary: 'החוזה מוכן!',
        contractReadySummaryDesc: 'כל הפרטים הוזנו ונסרקו בהצלחה. ניתן לצפות בסיכום הנתונים למטה.',
        dataSummary: 'סיכום נתונים',
        linkedToIndex: 'צמוד למדד',
        linkedToDollar: 'צמוד לדולר',
        knownIndexLabel: 'מדד ידוע',
        respectOfLabel: 'מדד בגין',
        restrictions: 'מגבלות',
        ceilingLabel: 'תקרה',
        floorLabel: 'רצפה',
        payment: 'תשלום',
        guaranteesLabel: 'ערבויות',
        petsLabel: 'בעלי חיים',
        saveContractFileQuery: 'היכן תרצה לשמור את קובץ החוזה?',
        storageRentMateCloud: 'ענן RentMate',
        storageRentMateCloudDesc: 'גישה מכל מקום, גיבוי מאובטח',
        storageThisDevice: 'מכשיר זה בלבד',
        storageThisDeviceDesc: 'פרטיות מקסימלית, ללא גיבוי ענן',
        storageBoth: 'גם וגם',
        storageBothDesc: 'הכי בטוח, נגיש ופרטי',
        storageCloudPolicy: 'צפייה וגישה מכל מכשיר. הקובץ מוצפן מקצה לקצה.',
        storageDevicePolicy: 'הקובץ יישמר במאגר המקומי של הדפדפן שלך בלבד.',
        storageBothPolicy: 'גיבוי מאובטח בענן בתוספת עותק מקומי למהירות מרבית.',
        originalContract: 'חוזה מקורי',
        openInNewWindow: 'פתח בחלון חדש',
        goBack: 'חזור',
        savingEllipsis: 'שומר...',
        next: 'הבא',
        overlapWarningTitle: 'שימו לב: חפיפת תאריכים',
        overlapWarningDesc: 'קיימים חוזים אחרים באותם תאריכים עבור נכס זה.',
        existingContract: 'חוזה קיים',
        rentyMantra: 'ניהול נכסים חכם עם Renty',
        generateReport: 'הפקת דוח',
        done: 'סיום',
        customize: 'התאמה אישית',
        myPortfolio: 'הפורטפוליו שלי',
        leaseEnds: 'סיום חוזה',
        deleteAsset: 'מחיקת נכס',
        deleteAssetConfirm: 'האם אתה בטוח שברצונך למחוק נכס זה? כל החוזים והתשלומים הקשורים יימחקו.',
        rentmateUser: 'משתמש RentMate',
        rentmateDashboard: 'לוח הבקרה של RentMate',
        contractIsIndexed: 'החוזה מוצמד למדד?',
        needsPaintingMsg: 'הדירה דורשת צביעה?',
        and: 'ו-',
        days: 'ימים',
        enterAddressAndCityFirst: 'נא להזין כתובת ועיר קודם',
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
        cookieConsentTitle: 'We use Cookies',
        cookieConsentDesc: 'We use cookies to improve your experience. By browsing, you agree to our',
        cookieConsentPrivacyPolicy: 'Privacy Policy',
        cookieConsentClose: 'Close',
        cookieConsentAccept: 'I Agree',

        agreeToTerms: 'I agree to the {terms} and {privacy}',
        marketingConsent: 'I agree to receive updates and marketing content (unsubscribe anytime)',
        legalDocs: 'Legal Documents',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',

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
        paymentPendingTitle: 'Payment Pending',
        paymentPendingDesc: 'You have ₪{amount} pending collection',
        sendReminder: 'Send Reminder',
        sendReminder_female: 'Send Reminder',
        activeMaintenanceTitle: 'Open Maintenance',
        activeMaintenanceDesc: 'You have {count} active maintenance calls',
        viewRequests: 'View Requests',
        viewRequests_female: 'View Requests',
        smartRecommendation: 'Smart Recommendation',
        alerts: 'Alerts',
        contractExpiringSoon: 'Contract Expiring Soon',
        viewContract: 'View Contract',
        paymentOverdue: 'Payment Overdue',
        paymentDueSoon: 'Payment Due Soon',
        viewPayments: 'View Payments',
        scanningBill: 'Gemini is analyzing the document...',
        autoFilledByGemini: 'Auto-filled by AI',
        manageStorage: 'Manage Storage',
        manageStorage_female: 'Manage Storage',
        items: 'items',
        now: 'Now',
        addContractDesc: 'Add your first contract to start tracking',
        organizeDocsTitle: 'Organize Your Docs',
        organizeDocsDesc: 'Upload receipts and bills to one place',
        uploadNow: 'Upload Now',
        uploadNow_female: 'Upload Now',

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

        contract: 'Contract',

        paymentsTitle: 'Payments',
        trackFuturePayments: 'Track future payments',
        allTypes: 'All Types',
        rent: 'Rent',
        bills: 'Bills',
        paymentType: 'Type',
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
        indexWatcherTitle: 'Live Index Watcher',
        liveUpdate: 'Live Update',
        currentRent: 'Current Rent',
        projectedRent: 'Projected Rent',
        newIndexPublished: 'New Index Published!',
        noLinkedContracts: 'No active linked contracts',
        linkageStatus: 'Linkage Status',
        calculatingProjection: 'Calculating...',
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
        linkedToEur: 'Linked to EUR',
        linkedToHousing: 'Housing Index',
        linkedToConstruction: 'Construction Index',
        indexType: 'Index Type',

        ceiling: 'Ceiling (Max %)',
        floorIndex: 'Base index is floor',
        paymentFrequency: 'Payment Frequency',
        monthly: 'Monthly',
        bimonthly: 'Bi-monthly',
        paymentMethod: 'Payment Method',
        transfer: 'Bank Transfer',
        check: 'Check',
        cash: 'Cash',
        bit: 'Bit',
        paybox: 'PayBox',
        creditCard: 'Credit Card',
        other: 'Other',
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
        stepAsset: 'Asset Details',
        stepTenant: 'Tenant Details',
        stepPeriods: 'Periods',
        stepPayments: 'Payments',
        stepSecurity: 'Security',
        stepSummary: 'Summary',
        limitReached: 'Limit Reached',
        limitReachedDesc: 'You have reached the maximum number of contracts on your plan.',
        backToContracts: 'Back to Contracts',
        contractDetails: 'Contract Details',
        editContract: 'Edit Contract',
        contractPeriodStatus: 'Contract Period & Status',
        paymentFreq: 'Payment Freq.',
        paymentDay: 'Payment Day',
        day: 'Day',
        rentStepsVariable: 'Rent Steps (Variable Rent)',
        addRentStep: '+ Add Rent Step',
        linkageAdjustments: 'Linkage & Adjustments',
        subType: 'Sub-Type',
        mos: 'Mos',
        yrs: 'Yrs',
        addOptionPeriod: '+ Add Option Period',
        depositAmount: 'Deposit Amount',
        reference: 'Reference',
        referencePlaceholder: 'Confirmation code, check number...',
        dueDate: 'Due Date',
        paidDate: 'Paid Date',
        selectContract: 'Select a contract...',
        saveAndAddAnother: 'Save & Add Another',
        createAndClose: 'Create & Close',
        addPaymentTitle: 'Add Payment',
        optional: 'Optional',
        endOfForm: 'End of Form',
        namePhoneRequired: 'Name and Phone are required',
        mustBeLoggedIn: 'You must be logged in to add a tenant',
        addItem: 'Add Item',
        totalBase: 'Total Base',
        globalBaseRentHelp: 'Global base rent (will be used for all months unless overridden by list).',
        baseIndexDate: 'Base Index Date',
        baseIndexValue: 'Base Index Value',
        noPaymentsListed: 'No payments listed.',
        addFirstPayment: 'Add your first payment',
        manualPaymentHelp: 'Enter the average amount paid per month manually.',
        periodStart: 'Period Start',
        periodEnd: 'Period End',
        vendorName: 'Vendor Name',
        optionalFolderNote: 'Optional note',
        eg_january_bill: 'e.g. January Bill',
        eg_electric_corp: 'e.g. Electric Corp',
        advancedLinkageOptions: 'Advanced Linkage Options',
        advancedReconciliationOptions: 'Advanced Reconciliation Options',
        linkageCalculationMethod: 'Linkage Calculation Method',
        indexSubType: 'Index Sub-Type',
        knownIndex: 'Known Index (מדד ידוע)',
        inRespectOf: 'In Respect Of (מדד בגין)',
        knownIndexHelp: '"Known": Index published before payment. "In Respect Of": Index of payment month.',
        updateFrequency: 'Update Frequency',
        everyMonth: 'Every Month',
        quarterly: 'Quarterly',
        semiAnnually: 'Semiannually',
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
        foreignCurrency: 'Foreign Currency',
        indexOption: 'Index',
        linkageCategory: 'Linkage Type',
        propertySpecs: 'Property Specs',
        leaseTerms: 'Lease Terms',
        financials: 'Financial Details',
        partiesInvolved: 'Parties Involved',
        option: 'Option',
        periods: 'Periods',
        monthlyBreakdown: 'Month-by-Month Breakdown',
        shouldPay: 'Should Pay',
        paid: 'Paid',
        diff: 'Diff',

        name: 'Name',
        address: 'Address',
        city: 'City',
        status: 'Status',
        amount: 'Amount',
        currency: 'Currency',
        date: 'Date',
        note: 'Note',

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
        appearance: 'App Appearance',
        theme: 'Theme',
        chooseTheme: 'Choose your preferred theme',
        chooseLanguage: 'Choose your interface language',
        preferencesAndAccount: 'Preferences & Account',

        // Legacy Migrated
        sendMessage: 'Send Message',
        sendMessage_female: 'Send Message',
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
        editTenant_female: 'Edit Tenant',
        viewContactInfo: 'View contact information',
        viewContactInfo_female: 'View contact information',
        updateTenantDetails: 'Update tenant details',
        updateTenantDetails_female: 'Update tenant details',
        addTenantToContacts: 'Add a new tenant to your contacts',
        addTenantToContacts_female: 'Add a new tenant to your contacts',
        assignedAsset: 'Assigned Asset',
        noAssetsFoundDesc: 'No assets found. You must create an asset before adding a tenant.',
        goToAssetsPage: 'Go to Assets Page',
        goToAssetsPage_female: 'Go to Assets Page',
        planLimitReached: 'Plan Limit Reached',
        planLimitReachedTenantDesc: 'You have reached the maximum number of tenants for your {planName} plan. Please upgrade your subscription.',
        close: 'Close',
        saving: 'Saving...',
        saving_female: 'Saving...',
        adding: 'Adding...',
        adding_female: 'Adding...',
        saveChanges: 'Save Changes',
        saveChanges_female: 'Save Changes',
        planName: 'Plan Name',
        runningBalance: 'Running Balance',

        // Storage
        storageUsage: 'Storage Usage',
        totalStorage: 'Total Storage',
        usedStorage: 'Used Storage',
        mediaStorage: 'Photos & Videos',
        utilitiesStorage: 'Bills',
        maintenanceStorage: 'Maintenance',
        documentsStorage: 'Documents',
        storageLimitReached: 'Storage Quota Exceeded',
        storageLimitReachedDesc: 'You have reached your storage limit. Delete some files or upgrade your plan to continue uploading.',
        storageNearLimit: 'Storage Space Running Low',
        storageNearLimitDesc: 'You\'ve used {percent}% of your available storage.',
        maxStorage: 'Total Storage',
        maxMediaStorage: 'Media Limit',
        maxUtilitiesStorage: 'Utilities Limit',
        maxMaintenanceStorage: 'Maintenance Limit',
        maxDocumentsStorage: 'Documents Limit',
        maxFileSize: 'Max File Size',
        unlimitedSymbol: '∞',
        photosAndVideos: 'Photos & Videos',
        mediaGalleryDesc: 'Property documentation and media',
        uploadingMedia: 'Uploading {current}/{total}',
        uploadMedia: 'Upload Media',
        uploadMedia_female: 'Upload Media',
        noMediaYet: 'No media yet',
        uploadMediaDesc: 'Upload photos and videos of the property',
        deleteFileConfirmation: 'Are you sure you want to delete this file?',
        deleteFileConfirmation_female: 'Are you sure you want to delete this file?',
        utilityWater: 'Water',
        utilityElectric: 'Electric',
        utilityGas: 'Gas',
        utilityMunicipality: 'Municipality',
        utilityManagement: 'Management Fee',
        totalBills: 'Total Bills',
        unpaid: 'Unpaid',
        uploadNewBill: 'Upload New Bill',
        uploadNewBill_female: 'Upload New Bill',
        uploadBillTitle: 'Upload {type} Bill',
        billDate: 'Bill Date',
        markAsPaid: 'Mark as Paid',
        markAsPaid_female: 'Mark as Paid',
        markAsUnpaid: 'Mark as Unpaid',
        markAsUnpaid_female: 'Mark as Unpaid',
        deleteBillConfirmation: 'Delete this bill?',
        deleteBillConfirmation_female: 'Delete this bill?',
        noBillsYet: 'No {type} bills yet',
        maintenanceDesc: 'Repairs, invoices, and service records',
        totalSpent: 'Total Spent',
        addMaintenanceRecord: 'Add Maintenance Record',
        addMaintenanceRecord_female: 'Add Maintenance Record',
        newMaintenanceRecord: 'New Maintenance Record',
        fileInvoiceReceipt: 'File (Invoice/Receipt)',
        description: 'Description',
        issueType: 'Issue Type',
        selectType: 'Select type',
        vendor: 'Vendor',
        cost: 'Cost',
        noMaintenanceRecordsYet: 'No maintenance records yet',
        deleteMaintenanceRecordConfirmation: 'Delete this maintenance record?',
        deleteMaintenanceRecordConfirmation_female: 'Delete this maintenance record?',
        issuePlumbing: 'Plumbing',
        issueElectrical: 'Electrical',
        issueHVAC: 'HVAC',
        issuePainting: 'Painting',
        issueCarpentry: 'Carpentry',
        issueAppliance: 'Appliance',
        issueOther: 'Other',
        addRecord: 'Add Record',
        addRecord_female: 'Add Record',
        documentsDesc: 'Insurance, warranties, legal documents, and more',
        documentsCount: '{count} document(s)',
        uploadDocument: 'Upload Document',
        uploadDocument_female: 'Upload Document',
        newDocument: 'New Document',
        category: 'Category',
        catInsurance: 'Insurance',
        catWarranty: 'Warranty',
        catLegal: 'Legal',
        catInvoice: 'Invoice',
        catReceipt: 'Receipt',
        catOther: 'Other',
        noDocumentsYet: 'No documents yet',
        deleteDocumentConfirmation: 'Delete this document?',
        deleteDocumentConfirmation_female: 'Delete this document?',
        storageQuotaExceeded: 'Storage Quota Exceeded',
        storageLow: 'Storage Space Running Low',
        storageQuotaExceededDesc: 'You have reached your storage limit. Delete some files or upgrade your plan to continue uploading.',
        storageLowDesc: 'You\'ve used {percent}% of your available storage.',
        breakdownMedia: 'Media',
        breakdownUtilities: 'Utilities',
        breakdownMaintenance: 'Maintenance',
        breakdownDocuments: 'Documents',

        // Media Gallery
        newAlbum: 'New Album',
        createAlbumDesc: 'Create a new album for photos and videos',
        albumName: 'Album Name',
        optionalAlbumNote: 'Album Note (Optional)',
        mediaFiles: 'Media Files',
        saveAlbum: 'Save Album',
        deleteAlbum: 'Delete Album',
        unsortedMedia: 'Unsorted Media',
        createNewAlbum: '+ Create New Album',

        // Utilities & Maintenance
        createBillFolder: '+ Create Bill Folder',
        newBillEntry: 'New Bill Entry',
        subject: 'Subject',
        saveBillEntry: 'Save Folder',
        createMaintenanceFolder: '+ Create Maintenance Folder',
        newMaintenanceEntry: 'New Maintenance Entry',
        saveRecord: 'Save Record',
        clickToUploadDrag: 'Click to upload or drag files here',
        unsortedRecords: 'Unsorted Records',
        unsortedFiles: 'Unsorted Files',
        deleteFolder: 'Delete Folder',
        averageMonthly: 'Average Monthly',
        averageMonthly_female: 'Average Monthly',
        trend: 'Trend',
        trend_female: 'Trend',
        increasing: 'Increasing',
        increasing_female: 'Increasing',
        decreasing: 'Decreasing',
        decreasing_female: 'Decreasing',
        decreasing_male: 'Decreasing',
        stable: 'Stable',
        stable_female: 'Stable',
        stable_male: 'Stable',
        knowledgeBase: 'Knowledge Base',
        notificationsTitle: 'Notifications',
        markAllRead: 'Mark all as read',
        noNotifications: 'No notifications yet',
        enablePush: 'Enable Push Notifications',
        lp_new_scan: 'NEW: AI Contract Scan ✨',
        lp_hero_title_1: 'Property Management,',
        lp_hero_title_2: 'Simple & Smart.',
        lp_hero_subtitle: 'The leading platform for rental management. Automatic index calculations, contract generation, and payment tracking - all in one secure place.',
        lp_btn_start: 'Start Free Trial',
        lp_btn_features: 'Explore Features',
        lp_trusted_by: 'Trusted by Leading Management Companies',
        lp_annual_yield: 'Annual Yield',
        lp_nav_features: 'Features',
        lp_nav_pricing: 'Pricing',
        lp_nav_about: 'About',
        lp_footer_product: 'Product',
        lp_footer_company: 'Company',
        lp_footer_legal: 'Legal',
        lp_all_rights: 'All rights reserved.',
        lp_systems_operational: 'All Systems Operational',
        lp_fe_features_title: 'The Tools You Need',
        lp_fe_features_subtitle: 'In one simple, smart package. No complications, no bureaucracy.',
        lp_fe_cpi_title: 'Consumer Price Index',
        lp_fe_cpi_desc: 'Automatic real-time index calculations. The system fetches data directly from the CBS and updates the rent.',
        lp_fe_ai_title: 'AI Contract Scanner',
        lp_fe_ai_desc: 'Upload a PDF and the system automatically extracts all contract data, payments, and deadlines.',
        lp_fe_tenants_title: 'Tenant Management',
        lp_fe_alerts_title: 'Smart Alerts',
        lp_fe_alerts_desc: 'RentMate reminds you when to renew contracts or collect checks.',
        lp_cta_title_1: 'Ready to manage your properties',
        lp_cta_title_2: 'like a pro?',
        lp_cta_subtitle: 'Join hundreds of landlords enjoying peace of mind, smart contracts, and automation. Sign up for free, no obligation.',
        lp_cta_btn: 'Start Now for Free',
        auth_welcome_back: 'Welcome Back',
        auth_join: 'Join RentMate',
        auth_email: 'Email Address',
        auth_password: 'Password',
        auth_forgot_password: 'Forgot Password?',
        auth_sign_in: 'Sign In',
        auth_create_account: 'Create Account',
        auth_or_continue: 'Or continue with',
        auth_no_account: "Don't have an account? Sign up",
        auth_have_account: 'Already have an account? Sign in',
        auth_check_inbox: 'Check your inbox',
        auth_confirmation_sent: "We've sent a confirmation link to {email}. Please verify your email to unlock your account.",

        // Dashboard Extras
        user_generic: 'User',
        passwordRequirementLength: 'At least 8 characters',
        passwordRequirementUppercase: 'One uppercase letter (A-Z)',
        passwordRequirementLowercase: 'One lowercase letter (a-z)',
        passwordRequirementNumber: 'One number (0-9)',
        passwordRequirementSpecial: 'One special character (!@#$%)',
        passwordStrength: 'Password Strength',
        passwordWeak: 'Weak',
        passwordMedium: 'Medium',
        passwordStrong: 'Strong',
        passwordVeryStrong: 'Very Strong',

        // Shared Calculation
        shared_calc_loading: 'Loading calculation...',
        shared_calc_not_found: 'Calculation Not Found',
        shared_calc_not_found_desc: 'The requested calculation could not be found. It may have been deleted or the link is invalid.',
        shared_calc_go_home: 'Go Home',
        shared_calc_official_reconciliation: 'Official Reconciliation Statement',
        shared_calc_official_index: 'Official Index Calculation',
        shared_calc_updated_rent: 'Updated Rent Amount',
        shared_calc_base_rent: 'Base Rent',
        shared_calc_linkage: 'Linkage',
        shared_calc_base_date: 'Base Date',
        shared_calc_target_date: 'Target Date',
        shared_calc_index_change: 'Index Change',
        shared_calc_amount_added: 'Amount Added',
        shared_calc_total_backpay: 'Total Back-Pay Owed',
        shared_calc_months: 'Months',
        shared_calc_avg_month: 'Avg / Month',
        shared_calc_monthly_breakdown: 'Monthly Breakdown',
        shared_calc_month: 'Month',
        shared_calc_diff: 'Diff',
        shared_calc_disclaimer: 'This calculation was generated automatically based on the Consumer Price Index (CPI) as published by the Central Bureau of Statistics.',
        shared_calc_cta: 'Landlord using RentMate?',
        shared_calc_cta_link: 'Create your own calculation',
        pricing_title: 'Simple, Transparent Pricing',
        pricing_subtitle: 'Choose the perfect plan for your property management needs. Start free, upgrade anytime.',
        pricing_monthly: 'Monthly',
        pricing_yearly: 'Yearly',
        pricing_save: 'Save 20%',
        pricing_most_popular: 'Most Popular',
        pricing_per_month: '/month',
        pricing_billed_yearly: 'Billed ${price}/year',
        pricing_properties: 'Properties',
        pricing_tenants: 'Tenants',
        pricing_data_export: 'Data Export (CSV/PDF)',
        pricing_priority_support: 'Priority Support',
        pricing_api_access: 'API Access',
        pricing_get_started: 'Get Started',
        pricing_contact_sales: 'Contact Sales',
        pricing_custom_plan: 'Need a custom plan?',
        pricing_storage: 'Storage ({quota})',
        settings_help_resources: 'Help & Resources',
        settings_admin_dashboard: 'Admin Dashboard',
        settings_admin_desc: 'Manage users, invoices, and system settings',
        settings_sent: 'Sent',
        lp_footer_careers: 'Careers',
        lp_footer_contact: 'Contact Us',
        lp_footer_security: 'Security',
        knowledgeBaseDesc: 'Professional guides and articles to help you manage your properties smarter and more efficiently.',
        leaseTimeline: 'Lease Timeline',
        viewAll: 'View All',
        upcomingAlerts: 'Upcoming Alerts',
        addAsset: 'Add Asset',
        systemStatus: 'System Status',
        location: 'Location',
        specifications: 'Specifications',
        visuals: 'Visuals',
        saveRequired: 'Save Required',
        savePropertyToAttachDocs: 'Save property to attach documents',
        privacySecurityTitle: 'Privacy & Security',
        privacySecuritySubtitle: 'Manage your security settings',
        changePassword: 'Change Password',
        changePasswordBtn: 'Change Password',
        deleteAccount: 'Delete Account',
        deletionProcessTitle: 'Account Deletion Process:',
        deletionStep1: 'Account will be suspended for 14 days',
        deletionStep2: 'You cannot log in during this period',
        deletionStep3: 'Your data will be preserved',
        deletionStep4: 'Can be cancelled by contacting support',
        deletionStep5: 'After 14 days - permanent deletion',
        suspendAccountBtn: 'Suspend Account',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        enterNewPassword: 'Enter new password',
        enterPasswordAgain: 'Enter password again',
        passwordChangedSuccess: 'Password changed successfully!',
        passwordLengthError: 'Password must be at least 6 characters',
        passwordsDoNotMatch: 'Passwords do not match',
        errorChangingPassword: 'Error changing password',
        accountSuspendedSuccess: 'Account suspended successfully. You will receive an email with more details.',
        errorSuspendingAccount: 'Error suspending account',
        suspendConfirmation: 'Your account will be suspended for 14 days.\n\nDuring this period:\n• You will not be able to log in\n• Your data will be preserved\n• You can cancel the suspension by contacting support\n\nAfter 14 days, your account and data will be permanently deleted.\n\nContinue?',
        backToDashboard: 'Back to Dashboard',
        stepOptionRent: 'Option Rent',
        extensionEndDate: 'Extension End Date',
        extensionRent: 'Extension Rent',
        contractIsIndexed: 'Contract Is Indexed?',
        needsPaintingMsg: 'Needs Painting?',
        and: 'and',
        days: 'days',
        enterAddressAndCityFirst: 'Please enter address and city first',
        manualRate: 'Manual Rate',
        byDate: 'By Date',
        linkageCeiling: 'Linkage Ceiling',
        maxRisePercentage: 'Max Rise (%)',
        needsPainting: 'Needs Painting?',
        contractReadySummary: 'Contract Ready!',
        contractReadySummaryDesc: 'All details have been successfully entered and scanned.',
        dataSummary: 'Data Summary',
        linkedToIndex: 'Linked to Index',
        linkedToDollar: 'Linked to Dollar',
        knownIndexLabel: 'Known Index',
        respectOfLabel: 'Respect of Index',
        restrictions: 'Restrictions',
        ceilingLabel: 'Ceiling',
        floorLabel: 'Floor',
        payment: 'Payment',
        guaranteesLabel: 'Guarantees',
        petsLabel: 'Pets',
        saveContractFileQuery: 'Where would you like to save the contract file?',
        storageRentMateCloud: 'RentMate Cloud',
        storageRentMateCloudDesc: 'Access anywhere, secure backup',
        storageThisDevice: 'This Device Only',
        storageThisDeviceDesc: 'Max privacy, no cloud backup',
        storageBoth: 'Both',
        storageBothDesc: 'Safest, accessible & private',
        storageCloudPolicy: 'View and access from any device. File is encrypted end-to-end.',
        storageDevicePolicy: 'File will be saved only in your local browser storage.',
        storageBothPolicy: 'Secure cloud backup plus a local copy for maximum speed.',
        originalContract: 'Original Contract',
        openInNewWindow: 'Open in New Window',
        goBack: 'Go Back',
        savingEllipsis: 'Saving...',
        next: 'Next',
        overlapWarningTitle: 'Note: Date Overlap',
        overlapWarningDesc: 'Other contracts exist for this property during these dates.',
        existingContract: 'Existing Contract',
        rentyMantra: 'Smart property management with Renty',
        generateReport: 'Generate Report',
        done: 'Done',
        customize: 'Customize',
        myPortfolio: 'My Portfolio',
        leaseEnds: 'Lease Ends',
        deleteAsset: 'Delete Asset',
        deleteAssetConfirm: 'Are you sure you want to delete this asset? All related contracts and payments will be deleted.',
        rentmateUser: 'RentMate User',
        rentmateDashboard: 'RentMate Dashboard',
    },
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
