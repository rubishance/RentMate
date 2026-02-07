import { useUserPreferences } from '../contexts/UserPreferencesContext';

export type TranslationKeys =
    // Common
    | 'appName'
    | 'commandCenterUpdates'
    | 'commandCenterAllClear'
    | 'rentySuggestsAction'
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
    | 'copied'
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
    | 'extensionNoticeDays'
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
    | 'batchCompleteMsg'
    | 'paymentCreationFailed'
    | 'bank_transfer'
    | 'daysLeft'
    | 'allContracts'
    | 'financeActual'
    | 'financeExpected'
    | 'financeAll'
    | 'financeRent'
    | 'financeBills'
    | 'utilityInternet'
    | 'utilityCable'

    // Auth & Navigation
    | 'login'
    | 'logout' | 'logout_female'
    | 'logoutConfirmTitle'
    | 'logoutConfirmMessage'
    | 'confirmLogout'
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
    | 'indexByDate'
    | 'byDate'
    | 'linkageCeiling'
    | 'maxRisePercentage'
    | 'needsPainting'
    | 'contractReadySummary'
    | 'contractReadySummaryDesc'
    | 'dataSummary'
    | 'legalProtection'
    | 'upgradeToUnlock'
    | 'needsPaintingQuery'
    | 'storageCloudSuccess'
    | 'storageDeviceSuccess'
    | 'storageBothSuccess'
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
    | 'billDetected'
    | 'associateWithProperty'
    | 'saveAndRecord'

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
    | 'indexSum'
    | 'bulkCheckEntryTitle'
    | 'pleaseFillAllFields'
    | 'amountPerCheck'
    | 'firstDueDate'
    | 'numberOfChecks'
    | 'startCheckNumber'
    | 'previewChecks'
    | 'bulkCheckReviewDesc'
    | 'bulkChecksAddedSuccess'
    | 'errorSavingPayments'
    | 'approveAndCreate'
    | 'paymentMarkedPaid'
    | 'paymentUndoSuccess'
    | 'errorInUndo'
    | 'undo'
    | 'errorMarkingPaid'
    | 'back'

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
    | 'shareMessage'
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
    | 'indexWatcherTitle'
    | 'baseAmount'
    | 'adjustedAmount'
    | 'linkageCalculation'
    | 'linkageImpact'
    | 'liveUpdate'
    | 'widgetSettings'
    | 'saveSettings'
    | 'baseRate'
    | 'rate'
    | 'currentRate'
    | 'cpi'
    | 'housing'
    | 'construction'
    | 'usd'
    | 'eur'
    | 'noLinkedContracts'
    | 'calculateLinkageAndMore'
    | 'currentRent'
    | 'projectedRent'
    | 'autoDetectContracts'
    | 'autoDetectContractsDesc'
    | 'marketIndicesToTrack'
    | 'track'
    | 'baseDateOptional'
    | 'unknownProperty'
    | 'selectDisplayedIndices'

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
    | 'free' | 'solo'
    | 'pro' | 'mate'
    | 'master'
    | 'unlimited'
    | 'ai_bills'
    | 'cpi_autopilot'
    | 'pricing_per_unit'
    | 'pricing_billed_monthly'
    | 'unlimited_properties'
    | 'property_unit'
    | 'property_units'
    | 'curating_plans'
    | 'api_access'
    | 'priority_support'
    | 'bill_analysis'
    | 'maintenance_tracker'
    | 'legal_library'
    | 'portfolio_visualizer'
    | 'whatsapp_bot'
    | 'ai_assistant'
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
    | 'legal_management'
    | 'active_contract'
    | 'archived_contract'
    | 'view_details'
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
    | 'auth_invalid_credentials'
    | 'auth_email_not_confirmed'
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
    | 'conciergeTitle' | 'conciergeDesc' | 'conciergeStart' | 'conciergeLater' | 'conciergeAiExtraction' | 'conciergeLinkageMonitoring'
    // Market Intelligence & Cities
    | 'marketIntelligence'
    | 'manageCities'
    | 'noCitiesPinnedDescription'
    | 'chooseCities'
    | 'avgRent'
    | 'manageTrackedCities'
    | 'searchCities'
    | 'currentlyTracking'
    | 'availableCities'
    | 'noResultsFound'
    | 'performanceTracking'
    | 'Jerusalem'
    | 'Tel Aviv'
    | 'Haifa'
    | 'Rishon LeZion'
    | 'Petah Tikva'
    | 'Ashdod'
    | 'Netanya'
    | 'Beer Sheva'
    | 'Holon'
    | 'Bnei Brak'
    | 'Ramat Gan'
    | 'Rehovot'
    | 'Bat Yam'
    | 'Herzliya'
    | 'Kfar Saba'
    | 'Ra\'anana'
    | 'Hadera'
    | 'Modi\'in'
    | 'Nazareth'
    | 'Lod'
    | 'Ramla';

export const translations: Record<string, any> = {
    he: {
        // Common
        appName: 'RentMate',
        commandCenterUpdates: 'יש לי {count} עדכונים חדשים עבורך',
        commandCenterAllClear: 'הכל נראה מעולה. אין משימות פתוחות.',
        rentySuggestsAction: 'רנטי מציע לפעול',
        conciergeTitle: 'השלמת הגדרת הנכס',
        conciergeDesc: 'יש לך {count} נכסים אבל עדיין לא הוספת חוזים. בוא נעשה סדר.',
        conciergeStart: 'הוספת חוזה ראשון',
        conciergeLater: 'שלח לי תזכורת אחר כך',
        conciergeAiExtraction: 'ניתוח מסמכים חכם',
        conciergeLinkageMonitoring: 'מעקב הצמדות אוטומטי',
        loading: 'טוען...',
        loading_female: 'טוענת...',
        error: 'שגיאה',
        save: 'שמור',
        save_female: 'שמרי',
        cancel: 'ביטול',
        edit: 'עריכה',
        edit_female: 'ערכי',
        delete: 'מחיקה',
        delete_female: 'מחקי',
        add: 'הוספה',
        add_female: 'הוסיפי',
        search: 'חיפוש',
        actions: 'פעולות',
        view: 'צפייה',
        view_female: 'צפי',
        deleteConfirmation: 'האם אתה בטוח שברצונך למחוק?',
        deleteConfirmation_female: 'האם את בטוחה שברצונך למחוק?',
        clear: 'נקה',
        clear_female: 'נקי',
        generate: 'צור',
        generate_female: 'צרי',
        share: 'שתף',
        share_female: 'שתפי',
        print: 'הדפס',
        print_female: 'הדפיסי',
        reset: 'איפוס',
        reset_female: 'אפסי',
        download: 'הורדה',
        download_female: 'הורידי',
        remove: 'הסרה',
        remove_female: 'הסירי',
        copied: 'הועתק!',
        yes: 'כן',
        no: 'לא',
        close: 'סגור',
        saving: 'שומר...',
        saving_female: 'שומרת...',
        adding: 'מוסיף...',
        adding_female: 'מוסיפה...',
        saveChanges: 'שמור שינויים',
        saveChanges_female: 'שמרי שינויים',
        addItem: 'הוסף פריט',
        addItem_female: 'הוסיפי פריט',
        name: 'שם',
        address: 'כתובת',
        city: 'עיר',
        status: 'סטטוס',
        amount: 'סכום',
        currency: 'מטבע',
        date: 'תאריך',
        period: 'תקופה',
        from: 'מ-',
        to: 'עד-',
        month: 'חודש',
        extensionNoticeDays: 'ימי הודעה מראש',
        note: 'הערה',
        vendorName: 'שם הספק',
        optionalFolderNote: 'שם התיקייה (אופציונלי)',
        eg_january_bill: 'לדוגמה: חשבון ינואר 2024',
        eg_electric_corp: 'לדוגמה: חברת החשמל',
        contractDetails: 'פרטי החוזה',
        editContract: 'עריכת חוזה',
        contractPeriodStatus: 'סטטוס תקופת החוזה',
        paymentFreq: 'תדירות תשלום',
        paymentDay: 'יום התשלום',
        day: 'יום',
        rentStepsVariable: 'מדרגות שכ"ד',
        addRentStep: 'הוסף מדרגת שכ"ד',
        linkageAdjustments: 'התאמות הצמדה',
        subType: 'סוג משנה',
        mos: 'חודשים',
        yrs: 'שנים',
        addOptionPeriod: 'הוסף תקופת אופציה',
        depositAmount: 'סכום פיקדון',
        reference: 'אסמכתא',
        referencePlaceholder: 'מספר צ\'ק או העברה',
        dueDate: 'תאריך פירעון',
        paidDate: 'תאריך תשלום בפועל',
        selectContract: 'בחר חוזה',
        saveAndAddAnother: 'שמור והוסף עוד',
        createAndClose: 'צור וסגור',
        addPaymentTitle: 'הוספת תשלום',
        optional: 'אופציונלי',
        endOfForm: 'סוף הטופס',
        namePhoneRequired: 'שם וטלפון הם שדות חובה',
        mustBeLoggedIn: 'עליך להיות מחובר כדי לבצע פעולה זו',
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
        batchCompleteMsg: 'הפעולה הושלמה: נוספו {count} תשלומים בסך כולל של ₪{total}',
        paymentCreationFailed: 'יצירת התשלום נכשלה',
        bank_transfer: 'העברה בנקאית',
        daysLeft: 'ימים נותרו',
        allContracts: 'כל החוזים',
        financeActual: 'בפועל',
        financeExpected: 'צפוי',
        financeAll: 'הכל',
        financeRent: 'שכירות',
        financeBills: 'חשבונות',
        utilityInternet: 'אינטרנט',
        utilityCable: 'טלוויזיה בכבלים',

        // Auth & Navigation
        login: 'התחברות',
        logout: 'התנתק',
        logout_female: 'התנתקי',
        logoutConfirmTitle: 'התנתקות?',
        logoutConfirmMessage: 'האם אתה בטוח שברצונך להתנתק?',
        confirmLogout: 'כן, התנתק',
        welcomeBack: 'ברוך שובך',
        welcomeBack_female: 'ברוכה השבה',
        welcome: 'ברוך הבא',
        welcome_female: 'ברוכה הבאה',
        dashboardTitle: 'לוח בקרה',
        properties: 'נכסים',
        properties_female: 'נכסים',
        tenants: 'דיירים',
        tenants_female: 'דיירים',
        contracts: 'חוזים',
        contracts_female: 'חוזים',
        legal_management: 'ניהול משפטי',
        active_contract: 'חוזה פעיל',
        archived_contract: 'חוזה בארכיון',
        view_details: 'צפייה בפרטים',
        payments: 'תשלומים',
        calculator: 'מחשבון',
        settings: 'הגדרות',
        profile: 'פרופיל',
        notifications: 'התראות',
        notificationsTitle: 'התראות',
        markAllRead: 'סמן הכל כנקרא',
        noNotifications: 'אין התראות חדשות',
        enablePush: 'אפשר התראות פוש',
        privacySecurity: 'פרטיות ואבטחה',
        cookieConsentTitle: 'אנחנו משתמשים ב-Cookies',
        cookieConsentDesc: 'אנחנו משתמשים בקבצי עוגיות כדי לשפר את החוויה שלך באתר.',
        cookieConsentPrivacyPolicy: 'מדיניות הפרטיות',
        cookieConsentClose: 'סגור',
        cookieConsentAccept: 'אני מסכים',
        manageAccount: 'ניהול חשבון',
        managePersonalInfo: 'ניהול פרטים אישיים',
        managePersonalInfo_female: 'ניהול פרטים אישיים',
        configureAlerts: 'הגדרת התראות',
        configureAlerts_female: 'הגדרת התראות',
        controlData: 'שליטה במידע שלך',
        controlData_female: 'שליטה במידע שלך',
        agreeToTerms: 'אני מסכים ל{terms} ול{privacy}',
        marketingConsent: 'אני מאשר קבלת עדכונים ותכנים שיווקיים',
        legalDocs: 'מסמכים משפטיים',
        privacyPolicy: 'מדיניות פרטיות',
        termsOfService: 'תנאי שימוש',

        // Dashboard
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
        archiveAndCalculate_female: 'ארכבי וחשבי',
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
        manageStorage: 'ניהול אחסון',
        manageStorage_female: 'ניהול אחסון',
        items: 'פריטים',
        now: 'עכשיו',
        addContractDesc: 'הוסף את החוזה הראשון שלך כדי להתחיל לעקוב',
        organizeDocsTitle: 'ארגן את המסמכים שלך',
        organizeDocsDesc: 'העלה קבלות וחשבונות למקום אחד מסודר',
        uploadNow: 'העלה עכשיו',
        uploadNow_female: 'העלי עכשיו',

        // Analytics
        analyticsTitle: 'אנליטיקה',
        analyticsSubtitle: 'סקירת ביצועי פורטפוליו',
        totalRevenueLTM: 'הכנסה שנתית (LTM)',
        avgRentPerProperty: 'שכירות דירה ממוצעת',
        revenueTrend: 'מגמות הכנסה',
        paymentStatus: 'סטטוס תשלומים',
        last12Months: '12 חודשים אחרונים',
        vsLastYear: 'לעומת שנה שעברה',

        // Feature Keys & Misc
        originalContract: 'חוזה מקורי',
        openInNewWindow: 'פתח בחלון חדש',
        goBack: 'חזור',
        savingEllipsis: 'שומר...',
        next: 'הבא',
        overlapWarningTitle: 'אזהרת חפיפה',
        overlapWarningDesc: 'קיים חוזה חופף בתאריכים אלו',
        existingContract: 'חוזה קיים',
        rentyMantra: 'הבית שלך, בניהול חכם',
        generateReport: 'הפק דוח',
        done: 'סיום',
        customize: 'התאמה אישית',
        myPortfolio: 'התיק שלי',
        leaseEnds: 'חוזה מסתיים',
        deleteAsset: 'מחיקת נכס',
        deleteAssetConfirm: 'האם למחוק נכס זה וכל נתוניו?',
        rentmateUser: 'משתמש RentMate',
        rentmateDashboard: 'לוח בקרה RentMate',
        billDetected: 'חשבון זוהה',
        associateWithProperty: 'שייך לנכס',
        saveAndRecord: 'שמור ותעד',

        // Payments Page
        paymentsTitle: 'תשלומים',
        trackFuturePayments: 'מעקב תשלומים',
        allTypes: 'כל הסוגים',
        rent: 'שכירות',
        bills: 'חשבונות',
        paymentType: 'סוג תשלום',
        addPayment: 'הוסף תשלום',
        addPayment_female: 'הוסיפי תשלום',
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
        allAssets: 'כל הנכסים',
        method: 'שיטה',
        allMethods: 'כל השיטות',
        transfer: 'העברה בנקאית',
        indexSum: 'הפרשי הצמדה',
        bulkCheckEntryTitle: 'הזנת פנקס צ\'קים',
        pleaseFillAllFields: 'נא למלא את כל שדות החובה',
        amountPerCheck: 'סכום לכל צ\'ק',
        firstDueDate: 'תאריך פירעון ראשון',
        numberOfChecks: 'מספר צ\'קים',
        startCheckNumber: 'מספר צ\'ק ראשון (אופציונלי)',
        previewChecks: 'תצוגה מקדימה',
        bulkCheckReviewDesc: 'נא לעבור על הצ\'קים שנוצרו לפני האישור.',
        bulkChecksAddedSuccess: 'נוספו {count} צ\'קים בהצלחה',
        errorSavingPayments: 'שגיאה בשמירת התשלומים',
        approveAndCreate: 'אישור ויצירה',
        paymentMarkedPaid: 'התשלום סומן כנפרע',
        paymentUndoSuccess: 'הפעולה בוטלה',
        errorInUndo: 'שגיאה בביטול הפעולה',
        undo: 'ביטול',
        errorMarkingPaid: 'שגיאה בסימון כנפרע',
        back: 'חזור',

        // Calculator & Reconciliation
        indexCalculator: 'מחשבון הצמדה',
        calculatorDesc: 'חישוב הפרשי הצמדה למדד והתחשבנות',
        standardCalculation: 'חישוב רגיל',
        paymentReconciliation: 'התחשבנות (רטרו)',
        baseRent: 'שכירות בסיס (₪)',
        linkageType: 'סוג הצמדה',
        baseDate: 'תאריך בסיס',
        baseIndexDate: 'תאריך מדד בסיס',
        targetDate: 'תאריך יעד',
        selectBaseDate: 'בחר תאריך בסיס',
        selectBaseDate_female: 'בחרי תאריך בסיס',
        selectTargetDate: 'בחר תאריך יעד',
        selectTargetDate_female: 'בחרי תאריך יעד',
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
        shareMessage: 'חישבתי את הצמדה למדד במחשבון של RentMate, אפשר לראות את התוצאה כאן:',
        loadFromContract: 'טען מחוזה (אופציונלי)',
        selectContractPlaceholder: 'בחר חוזה למילוי אוטומטי...',
        expectedBaseRent: 'שכירות בסיס צפויה',
        clearList: 'נקה רשימה',
        generateList: 'צור רשימה',
        generateList_female: 'צרי רשימה',
        dateAndBaseAmount: 'תאריך וסכום בסיס',
        actualPayments: 'תשלומים בפועל',
        paymentDate: 'תאריך תשלום',
        paidAmount: 'סכום ששולם',
        reconciliationTable: 'טבלת התחשבנות',
        expected: 'צפוי',
        index: 'מדד',
        due: 'לתשלום',
        gap: 'הפרש',
        overdue: 'באיחור',
        revenue: 'הכנסה',
        calculateBackPay: 'חשב הפרשים רטרואקטיבית',
        advancedReconciliationOptions: 'אפשרויות התחשבנות מתקדמות',
        paymentReconciliationResults: 'תוצאות התחשבנות',
        totalBackPayOwed: 'סה"כ הפרשים לתשלום',
        monthlyBreakdown: 'פירוט חודשי',
        shouldPay: 'צריך לשלם',
        paid: 'שולם',
        diff: 'הפרש',
        knownIndex: 'מדד ידוע',
        inRespectOf: 'בגין חודש',
        knownIndexHelp: 'לפי המדד האחרון שפורסם במועד התחשבנות',
        updateFrequency: 'תדירות עדכון',
        everyMonth: 'בכל חודש',
        quarterly: 'כל רבעון',
        annually: 'כל שנה',
        updateFrequencyHelp: 'באיזו תכיפות מעדכנים את שכר הדירה?',
        linkageFloor: 'רצפת הצמדה',
        indexBaseMin: 'מדד בסיס הוא רצפה',
        indexBaseMinHelp: 'האם למנוע ירידת שכירות כשהמדד שלילי?',
        maxIncrease: 'תקרת עלייה',
        capCeiling: 'מקסימום שינוי (%)',
        periodStart: 'תחילת תקופה',
        periodEnd: 'סוף תקופה',
        avgUnderpayment: 'תת-תשלום ממוצע',
        percentageOwed: 'אחוז מהחוב',
        globalBaseRentHelp: 'סכום השכירות לפני הצמדות',
        noPaymentsListed: 'אין תשלומים ברשימה',
        addFirstPayment: 'הוסף תשלום ראשון',
        addFirstPayment_female: 'הוסיפי תשלום ראשון',
        manualPaymentHelp: 'ניתן להוסיף תשלומים באופן ידני כאן',
        totalBase: 'סה"כ בסיס',
        runningBalance: 'יתרה מצטברת',
        linkageCalculationMethod: 'שיטת חישוב הצמדה',
        advancedLinkageOptions: 'אפשרויות הצמדה מתקדמות',
        indexSubType: 'סוג מדד משני',

        // Property & Contract Wizards
        newContract: 'חוזה חדש',
        newContractDesc: 'יצירת חוזה שכירות חדש',
        hideContract: 'הסתר חוזה',
        showContract: 'הצג חוזה',
        aiScanTitle: 'סריקה חכמה ב-AI',
        aiScanDesc: 'העלה או סרוק חוזה למילוי פרטים אוטומטי',
        scanNow: 'סרוק עבשיו',
        contractScannedSuccess: 'החוזה נסרק בהצלחה',
        propertyDetails: 'פרטי הנכס',
        chooseProperty: 'בחר נכס מהרשימה',
        chooseProperty_female: 'בחרי נכס מהרשימה',
        selectProperty: 'בחר נכס...',
        selectProperty_female: 'בחרי נכס...',
        newProperty: 'נכס חדש',
        existingProperty: 'נכס קיים',
        propertyType: 'סוג הנכס',
        apartment: 'דירה',
        penthouse: 'פנטהאוז',
        gardenApartment: 'דירת גן',
        house: 'בית פרטי',
        rooms: 'מס\' חדרים',
        sizeSqm: 'גודל (מ"ר)',
        parking: 'חניה',
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
        chooseTenant_female: 'בחרי דייר מהרשימה',
        fullName: 'שם מלא',
        idNumber: 'תעודת זהות',
        phone: 'טלפון',
        email: 'אימייל',
        signingDate: 'תאריך חתימה',
        optionPeriods: 'תקופות אופציה',
        addPeriod: 'הוסף תקופה',
        addPeriod_female: 'הוסיפי תקופה',
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
        addStep_female: 'הוסיפי שינוי',
        stepDate: 'תאריך שינוי',
        newAmount: 'סכום חדש',
        linkageAndIndices: 'הצמדה ומדדים',
        notLinked: 'לא צמוד',
        indexType: 'סוג מדד',
        ceiling: 'תקרה (מקסימום %)',
        floorIndex: 'מדד בסיס מהווה רצפה',
        paymentFrequency: 'תדירות תשלום',
        bimonthly: 'דו-חודשי',
        monthly: 'חודשי',
        paymentMethod: 'אמצעי תשלום',
        securityAndAppendices: 'ביטחונות ונספחים',
        securityDeposit: 'פיקדון כספי',
        guarantors: 'ערבים',
        guarantorName: 'שם הערב',
        addGuarantor: 'הוסף ערב',
        addGuarantor_female: 'הוסיפי ערב',
        noGuarantors: 'לא הוגדרו ערבים',

        contractFile: 'קובץ חוזה',
        savePreferences: 'העדפות שמירה',
        saveToCloud: 'שמור בענן',
        saveToDevice: 'שמור במכשיר',
        summary: 'סיכום',
        createContract: 'צור חוזה',
        createContract_female: 'צרי חוזה',
        stepAsset: 'נכס',
        stepTenant: 'דייר',
        stepPeriods: 'תקופות',
        stepPayments: 'תשלומים',
        stepSecurity: 'ביטחונות',
        stepSummary: 'סיכום',
        limitReached: 'הגעת למגבלה',
        limitReachedDesc: 'כמות הנכסים בתוכנית שלך הגיעה למקסימום',
        backToContracts: 'חזרה לחוזים',
        check: 'צ\'ק',
        cash: 'מזומן',
        bit: 'Bit',
        paybox: 'PayBox',
        creditCard: 'כרטיס אשראי',
        other: 'אחר',
        semiAnnually: 'חצי שנתי',
        contractIsIndexed: 'החוזה צמוד למדד',
        and: 'ו-',
        days: 'ימים',
        enterAddressAndCityFirst: 'הזן כתובת ועיר תחילה',
        needsPaintingMsg: 'הדירה תיצבע בסיום החוזה',

        // Tenant Modal & Limits
        viewTenantDetails: 'פרטי דייר',
        editTenant: 'עריכת דייר',
        editTenant_female: 'עריכת דייר',
        viewContactInfo: 'פרטי קשר',
        viewContactInfo_female: 'פרטי קשר',
        updateTenantDetails: 'עדכון פרטי דייר',
        updateTenantDetails_female: 'עדכון פרטי דייר',
        addTenantToContacts: 'הוסף לאנשי קשר',
        addTenantToContacts_female: 'הוסיפי לאנשי קשר',
        assignedAsset: 'שייך לנכס',
        noAssetsFoundDesc: 'לא נמצאו נכסים רשומים',
        goToAssetsPage: 'עבור לנכסים',
        goToAssetsPage_female: 'עברי לנכסים',
        planLimitReached: 'מגבלת תוכנית',
        planLimitReachedTenantDesc: 'הגעת למגבלת הדיירים בתוכנית שלך',
        planName: 'שם התוכנית',
        foreignCurrency: 'מטבע חוץ',
        baseIndexValue: 'ערך מדד בסיס',
        indexOption: 'אופציית מדד',
        linkageCategory: 'קטגוריית הצמדה',
        propertySpecs: 'מפרט נכס',
        leaseTerms: 'תנאי שכירות',
        financials: 'פיננסיים',
        partiesInvolved: 'צדדים בחוזה',
        option: 'אופציה',
        periods: 'תקופות',

        // Subscription & Plan
        unlockPotential: 'פתח את הפוטנציאל של הפורטפוליו שלך',
        unlockPotential_female: 'פתחי את הפוטנציאל של הפורטפוליו שלך',
        requestUpgrade: 'בקש שדרוג',
        requestUpgrade_female: 'בקשי שדרוג',
        maybeLater: 'אולי מאוחר יותר',
        requestSent: 'הבקשה נשלחה',
        requestSentDesc: 'נציג שלנו יחזור אליך בהקדם',
        requestSentDesc_female: 'נציג שלנו יחזור אלייך בהקדם',
        gotItThanks: 'הבנתי, תודה',
        feature: 'פיצ\'ר',
        free: 'SOLO',
        pro: 'MATE',
        solo: 'SOLO',
        mate: 'MATE',
        master: 'MASTER',
        unlimited: 'MASTER',
        ai_bills: 'פיענוח חשבונות AI',
        cpi_autopilot: 'Auto-Pilot הצמדות',
        pricing_per_unit: 'ליחידה',
        pricing_billed_monthly: 'בחיוב חודשי',
        unlimited_properties: 'נכסים ללא הגבלה',
        property_unit: 'נכס',
        property_units: 'נכסים',
        curating_plans: 'אוצר תוכניות...',
        api_access: 'גישת API',
        priority_support: 'תמיכה בעדיפות',
        bill_analysis: 'ניתוח חשבונות AI',
        maintenance_tracker: 'מעקב תחזוקה',
        legal_library: 'מאגר משפטי',
        portfolio_visualizer: 'ויזואליזציה של פורטפוליו',
        whatsapp_bot: 'בוט וואטסאפ',
        ai_assistant: 'עוזר AI',
        can_export: 'ייצוא נתונים מלא',

        prioritySupport: 'תמיכה בעדיפות',
        dataExport: 'ייצוא נתונים',
        contactSupport: 'צור קשר עם התמיכה',
        contactSupport_female: 'צרי קשר עם התמיכה',
        contactSupportDesc: 'זקוק לעזרה? אנחנו כאן בשבילך',
        contactSupportDesc_female: 'זקוקה לעזרה? אנחנו כאן בשבילך',
        typeMessageHere: 'הקלד הודעה כאן...',
        typeMessageHere_female: 'הקלידי הודעה כאן...',
        orEmailDirectly: 'או שלח מייל ישירות ל-',
        orEmailDirectly_female: 'או שלחי מייל ישירות ל-',
        upgradeToPro: 'שדרג ל-PRO',
        upgradeToPro_female: 'שדרגי ל-PRO',
        unlockMoreLimits: 'שחרר מגבלות נוספות',
        unlockMoreLimits_female: 'שחררי מגבלות נוספות',
        currentPlan: 'תוכנית נוכחית',
        freeForever: 'חינם לתמיד',
        greatForGettingStarted: 'מצוין להתחלה',

        // Misc
        noActiveContracts: 'אין חוזים פעילים',
        noActiveContractsDesc: 'הוסף את החוזה הראשון שלך כדי להתחיל לעקוב',
        sendMessage: 'שלח הודעה',
        sendMessage_female: 'שלחי הודעה',
        sending: 'שולח...',
        messageSent: 'ההודעה נשלחה בהצלחה',
        unspecified: 'לא צוין',
        gender: 'מגדר',
        male: 'זכר',
        female: 'נקבה',
        appVersion: 'גרסת אפליקציה',
        accessibilityStatement: 'הצהרת נגישות',
        languageLocalization: 'שפה והתאמה אישית',
        language: 'שפה',
        genderForHebrew: 'מגדר (להתאמת העברית)',
        support: 'תמיכה',
        utilityWater: 'מים',
        utilityElectric: 'חשמל',
        utilityGas: 'גז',
        utilityMunicipality: 'ארנונה',
        utilityManagement: 'ועד בית',
        totalBills: 'סה"כ חשבונות',
        unpaid: 'טרם שולם',
        uploadNewBill: 'העלה חשבון חדש',
        uploadNewBill_female: 'העלי חשבון חדש',
        uploadBillTitle: 'העלאת חשבון',
        billDate: 'תאריך חשבון',
        markAsPaid: 'סמן כסדר',
        markAsPaid_female: 'סמני כסדר',
        markAsUnpaid: 'סמן כלא שולם',
        markAsUnpaid_female: 'סמני כלא שולם',
        deleteBillConfirmation: 'האם למחוק חשבון זה?',
        deleteBillConfirmation_female: 'האם למחוק חשבון זה?',
        noBillsYet: 'אין עדיין חשבונות',
        maintenanceDesc: 'ניהול קריאות שירות ותיקונים',
        totalSpent: 'סה"כ שולם',
        addMaintenanceRecord: 'הוסף קריאת שירות',
        addMaintenanceRecord_female: 'הוסיפי קריאת שירות',
        newMaintenanceRecord: 'קריאת שירות חדשה',
        fileInvoiceReceipt: 'קבלה/חשבונית',
        description: 'תיאור',
        issueType: 'סוג תקלה',
        selectType: 'בחר סוג...',
        vendor: 'איש מקצוע/ספק',
        cost: 'עלות',
        noMaintenanceRecordsYet: 'אין עדיין קריאות שירות',
        deleteMaintenanceRecordConfirmation: 'האם למחוק תיעוד זה?',
        deleteMaintenanceRecordConfirmation_female: 'האם למחוק תיעוד זה?',
        issuePlumbing: 'אינסטלציה',
        issueElectrical: 'חשמל',
        issueHVAC: 'מיזוג אוויר',
        issuePainting: 'צביעה',
        issueCarpentry: 'נגרות',
        issueAppliance: 'מכשירי חשמל',
        issueOther: 'אחר',
        addRecord: 'הוסף תיעוד',
        addRecord_female: 'הוסיפי תיעוד',
        documentsDesc: 'ניהול מסמכים וקבצי חוזה',
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
        noDocumentsYet: 'אין עדיין מסמכים',
        deleteDocumentConfirmation: 'האם למחוק מסמך זה?',
        deleteDocumentConfirmation_female: 'האם למחוק מסמך זה?',
        checksStorage: 'צ׳קים',
        mediaStorage: 'מדיה',
        utilitiesStorage: 'חשבונות ומונים',
        maintenanceStorage: 'תחזוקה ותיקונים',
        documentsStorage: 'מסמכים וחוזים',
        photosAndVideos: 'תמונות וסרטונים',
        mediaGalleryDesc: 'גלריית נכס ותיעוד ויזואלי',
        vacant: 'פנוי',
        storageQuotaExceeded: 'חריגה ממכסת האחסון',
        storageLow: 'נפח אחסון נמוך',
        storageQuotaExceededDesc: 'שדרג את התוכנית להמשך העלאת קבצים',
        storageLowDesc: 'מומלץ לפנות מקום בקרוב',
        breakdownMedia: 'מדיה',
        breakdownUtilities: 'חשבונות',
        breakdownMaintenance: 'תחזוקה',
        breakdownDocuments: 'מסמכים',
        newAlbum: 'אלבום חדש',
        createAlbumDesc: 'יצירת אלבום תמונות חדש',
        albumName: 'שם האלבום',
        optionalAlbumNote: 'תיאור האלבום (אופציונלי)',
        mediaFiles: 'קבצי מדיה',
        saveAlbum: 'שמור אלבום',
        deleteAlbum: 'מחיקת אלבום',
        unsortedMedia: 'מדיה ללא אלבום',
        createNewAlbum: 'יצירת אלבום חדש',
        createBillFolder: 'יצירת תיקיית חשבונות',
        newBillEntry: 'חשבון חדש',
        subject: 'נושא',
        saveBillEntry: 'שמור חשבון',
        createMaintenanceFolder: 'יצירת תיקיית תחזוקה',
        newMaintenanceEntry: 'תיעוד תחזוקה חדש',
        saveRecord: 'שמור תיעוד',
        clickToUploadDrag: 'לחץ להעלאה או גרור קבצים לכאן',
        unsortedRecords: 'תיעודים ללא תיקייה',
        unsortedFiles: 'קבצים ללא תיקייה',
        deleteFolder: 'מחיקת תיקייה',
        averageMonthly: 'ממוצע חודשי',
        averageMonthly_female: 'ממוצע חודשי',
        trend: 'מגמה',
        trend_female: 'מגמה',
        increasing: 'בעלייה',
        increasing_female: 'בעלייה',
        decreasing: 'בירידה',
        decreasing_female: 'בירידה',
        decreasing_male: 'בירידה',
        stable: 'יציב',
        stable_female: 'יציבה',
        stable_male: 'יציב',
        knowledgeBase: 'מרכז ידע',
        lp_new_scan: 'חדש: סריקת חוזה ב-AI',
        lp_hero_title_1: 'ניהול שכירות',
        lp_hero_title_2: 'בלי כאבי ראש',
        lp_hero_subtitle: 'האולימפיאדה של ניהול הנכסים: הצמדות, תשלומים, מסמכים והדיירים שלך - הכל במקום אחד חכם.',
        lp_btn_start: 'מתחילים עכשיו - חינם',
        lp_btn_features: 'לצפייה בפיצ\'רים',
        lp_trusted_by: 'בשימוש על ידי מאות משכירי דירות בישראל',
        lp_annual_yield: '98.5% גבייה בממוצע',
        lp_nav_features: 'פיצ\'רים',
        lp_nav_pricing: 'תוכניות',
        lp_nav_about: 'עלינו',
        lp_footer_product: 'מוצר',
        lp_footer_company: 'חברה',
        lp_footer_legal: 'משפטי',
        lp_all_rights: 'כל הזכויות שמורות © 2024 RentMate',
        lp_systems_operational: 'מערכות תקינות',
        lp_fe_features_title: 'כל מה שצריך כדי לישון בשקט',
        lp_fe_features_subtitle: 'בנינו את הכלים הכי מתקדמים כדי שהנכס שלך ינוהל כמו עסק מקצועי.',
        lp_fe_cpi_title: 'מחשבון הצמדה מובנה',
        lp_fe_cpi_desc: 'עדכון דמי שכירות לפי המדדים האחרונים בלחיצת כפתור.',
        lp_fe_ai_title: 'סריקת חוזים ב-AI',
        lp_fe_ai_desc: 'העלה חוזה וה-AI שלנו ימלא את כל הפרטים בשבילך.',
        lp_fe_tenants_title: 'ניהול דיירים חכם',
        lp_fe_alerts_title: 'התראות ותזכורות',
        lp_fe_alerts_desc: 'לעולם לא תפספס חתימה על אופציה או תשלום שמתעכב.',
        lp_cta_title_1: 'מוכנים להפוך את ניהול הנכס',
        lp_cta_title_2: 'לקל ופשוט?',
        lp_cta_subtitle: 'הצטרפו למאות משכירים שכבר חוסכים זמן וכסף עם RentMate.',
        lp_cta_btn: 'אני רוצה להתחיל',
        auth_welcome_back: 'ברוך שובך!',
        auth_join: 'הצטרף ל-RentMate',
        auth_email: 'כתובת אימייל',
        auth_password: 'סיסמה',
        auth_forgot_password: 'שכחת סיסמה?',
        auth_sign_in: 'כניסה',
        auth_create_account: 'צרו חשבון',
        auth_or_continue: 'או המשך עם',
        auth_no_account: 'אין לך חשבון?',
        auth_have_account: 'כבר יש לך חשבון?',
        auth_check_inbox: 'בדוק את תיבת המייל שלך',
        auth_confirmation_sent: 'שלחנו לינק לאישור הרישום לכתובת המייל שהזנת.',
        auth_invalid_credentials: 'פרטי התחברות שגויים',
        auth_email_not_confirmed: 'המייל טרם אושר',
        user_generic: 'משתמש',
        passwordRequirementLength: 'לפחות 8 תווים',
        passwordRequirementUppercase: 'אות גדולה אחת לפחות',
        passwordRequirementLowercase: 'אות קטנה אחת לפחות',
        passwordRequirementNumber: 'מספר אחד לפחות',
        passwordRequirementSpecial: 'תו מיוחד אחד לפחות',
        passwordStrength: 'חוזר סיסמה',
        passwordWeak: 'חלשה',
        passwordMedium: 'בינונית',
        passwordStrong: 'חזקה',
        passwordVeryStrong: 'חזקה מאוד',


        shared_calc_loading: 'טוען חישוב...',
        shared_calc_not_found: 'החישוב לא נמצא',
        shared_calc_not_found_desc: 'הקישור שברשותך אינו תקין או שהחישוב הוסר.',
        shared_calc_go_home: 'חזרה לדף הבית',
        shared_calc_official_reconciliation: 'התחשבנות רשמית מבית RentMate',
        shared_calc_official_index: 'חישוב הצמדה למדד',
        shared_calc_updated_rent: 'שכירות מעודכנת',
        shared_calc_base_rent: 'שכירות בסיס',
        shared_calc_linkage: 'סוג הצמדה',
        shared_calc_base_date: 'תאריך בסיס',
        shared_calc_target_date: 'תאריך יעד',
        shared_calc_index_change: 'שינוי מדד',
        shared_calc_amount_added: 'תוספת הצמדה',
        shared_calc_total_backpay: 'סה"כ הפרשים רטרו',
        shared_calc_months: 'חודשים בחישוב',
        shared_calc_avg_month: 'ממוצע חודשי',
        shared_calc_monthly_breakdown: 'פירוט חודשי להצמדה',
        shared_calc_month: 'חודש',
        shared_calc_diff: 'הפרש',
        shared_calc_disclaimer: 'החישוב מבוסס על נתוני המדד הרשמיים. טל"ח.',
        shared_calc_cta: 'רוצה לנהל את הנכסים שלך ככה?',
        shared_calc_cta_link: 'למידע נוסף והרשמה ל-RentMate',
        pricing_title: 'תוכניות ומחירים',
        pricing_subtitle: 'בחר את התוכנית המתאימה ביותר לפורטפוליו שלך',
        pricing_monthly: 'חודשי',
        pricing_yearly: 'שנתי',
        pricing_save: 'חסוך 20%',
        pricing_most_popular: 'הכי פופולרי',
        pricing_per_month: '/חודש',
        pricing_billed_yearly: 'בחיוב שנתי',
        pricing_properties: 'נכסים',
        pricing_tenants: 'דיירים',
        pricing_data_export: 'ייצוא נתונים (Excel/PDF)',
        pricing_priority_support: 'תמיכה בעדיפות',
        pricing_api_access: 'גישת API',
        pricing_get_started: 'מתחילים עכשיו',
        pricing_contact_sales: 'דבר איתנו',
        pricing_custom_plan: 'תוכנית מותאמת אישית',
        pricing_storage: 'נפח אחסון',
        settings_help_resources: 'מרכז עזרה ומשאבים',
        settings_admin_dashboard: 'לוח בקרה מנהל',
        settings_admin_desc: 'ניהול משתמשים, תוכניות והגדרות מערכת',
        settings_sent: 'ההגדרות עודכנו בהצלחה',
        lp_footer_careers: 'קריירה',
        lp_footer_contact: 'צור קשר',
        lp_footer_security: 'אבטחת מידע',
        contractExpiringSoon: 'חוזה מסתיים בקרוב',
        viewContract: 'צפה בחוזה',
        paymentOverdue: 'תשלום באיחור',
        paymentDueSoon: 'תשלום קרוב',
        viewPayments: 'צפה בתשלומים',
        scanningBill: 'סורק חשבון...',
        autoFilledByGemini: 'מולא אוטומטית על ידי Renty',
        privacySecurityTitle: 'פרטיות ואבטחה',
        privacySecuritySubtitle: 'נהל את החשבון המאובטח שלך',
        changePassword: 'שינוי סיסמה',
        changePasswordBtn: 'עדכן סיסמה',
        deleteAccount: 'מחיקת חשבון',
        deletionProcessTitle: 'תהליך מחיקת חשבון',
        deletionStep1: 'כל הנתונים יימחקו לצמיתות',
        deletionStep2: 'חוזים וקבצים יוסרו מהענן',
        deletionStep3: 'המינוי יבוטל מיידית',
        deletionStep4: 'לא ניתן יהיה לשחזר את המידע',
        deletionStep5: 'אישור במייל יישלח בסיום',
        suspendAccountBtn: 'הקפאת חשבון',
        linkageStatus: 'סטטוס הצמדה',
        calculatingProjection: 'מחשב תחזית...',
        backToDashboard: 'חזרה ללוח הבקרה',
        indexWatcherTitle: 'מעקב מדדים והצמדות',
        baseAmount: 'סכום בסיס',
        adjustedAmount: 'סכום מתואם',
        linkageCalculation: 'חישוב הצמדה',
        linkageImpact: 'השפעת הצמדה',
        liveUpdate: 'עדכון חי',
        widgetSettings: 'הגדרות הווידג\'ט',
        saveSettings: 'שמור הגדרות',
        baseRate: 'שער בסיס',
        rate: 'שער',
        currentRate: 'שער נוכחי',
        noLinkedContracts: 'אין חוזים צמודים',
        calculateLinkageAndMore: 'למחשבון המדד ופעולות נוספות',
        currentRent: 'שכירות נוכחית',
        projectedRent: 'שכירות חזויה',
        autoDetectContracts: 'זיהוי חוזים אוטומטי',
        autoDetectContractsDesc: 'הצג תחזיות עבור הנכסים שלך',
        marketIndicesToTrack: 'מדדי שוק למעקב',
        track: 'עקוב',
        baseDateOptional: 'תאריך בסיס (אובציונלי)',
        unknownProperty: 'נכס לא ידוע',
        appearance: 'מראה',
        theme: 'ערכת נושא',
        chooseTheme: 'בחר ערכת נושא',
        chooseLanguage: 'בחר שפה',
        preferencesAndAccount: 'העדפות וחשבון',
        stepOptionRent: 'שכ"ד באופציה',
        extensionEndDate: 'תאריך סיום האופציה',
        extensionRent: 'שכ"ד בתקופת האופציה',
        balcony: 'מרפסת',
        safeRoom: 'ממ"ד',
        contractsTitle: 'חוזים',
        fillAllFields: 'נא למלא את כל השדות',
        manualIndexEntries: 'ערכי מדד ידניים',
        target: 'יעד',
        fillAllFields_female: 'נא למלא את כל השדות',
        manualIndexEntries_female: 'ערכי מדד ידניים',
        target_female: 'יעד',
        // Additional keys to match TranslationKeys type
        addFirstPaymentTitle: 'הוספת תשלומים',
        addFirstPaymentTitle_female: 'הוספת תשלומים',
        uploadNow_male: 'העלה עכשיו',
        share_male: 'שתף',
        generate_male: 'צור',
        print_male: 'הדפס',
        reset_male: 'איפוס',
        download_male: 'הורדה',
        remove_male: 'הסרה',
        saving_male: 'שומר...',
        adding_male: 'מוסיף...',
        saveChanges_male: 'שמור שינויים',
        addItem_male: 'הוסף פריט',
        selectBaseDate_male: 'בחר תאריך בסיס',
        selectTargetDate_male: 'בחר תאריך יעד',
        generateList_male: 'צור רשימה',
        addFirstPayment_male: 'הוסף תשלום ראשון',
        chooseProperty_male: 'בחר נכס מהרשימה',
        selectProperty_male: 'בחר נכס...',
        chooseTenant_male: 'בחר דייר מהרשימה',
        addPeriod_male: 'הוסף תקופה',
        addStep_male: 'הוסף שינוי',
        addGuarantor_male: 'הוסף ערב',
        createContract_male: 'צור חוזה',
        editTenant_male: 'עריכת דייר',
        viewContactInfo_male: 'פרטי קשר',
        updateTenantDetails_male: 'עדכון פרטי דייר',
        addTenantToContacts_male: 'הוסף לאנשי קשר',
        goToAssetsPage_male: 'עבור לנכסים',
        unlockPotential_male: 'פתח את הפוטנציאל של הפורטפוליו שלך',
        requestUpgrade_male: 'בקש שדרוג',
        contactSupport_male: 'צור קשר עם התמיכה',
        typeMessageHere_male: 'הקלד הודעה כאן...',
        orEmailDirectly_male: 'או שלח מייל ישירות ל-',
        upgradeToPro_male: 'שדרג ל-PRO',
        unlockMoreLimits_male: 'שחרר מגבלות נוספות',
        sendMessage_male: 'שלח הודעה',
        deleteContractMessage_male: 'האם למחוק חוזה זה וכל נתוניו?',
        addNewTenant_male: 'הוסף דייר חדש',
        addProperty_male: 'הוסף נכס',
        addFirstPropertyDesc_male: 'התחל בהוספת הנכס הראשון שלך',
        createFirstAsset_male: 'צור נכס ראשון',
        addTenant_male: 'הוסף דייר',
        addFirstTenantDesc_male: 'התחל בהוספת הדייר הראשון שלך',
        uploadNewBill_male: 'העלה חשבון חדש',
        markAsPaid_male: 'סמן כסדר',
        markAsUnpaid_male: 'סמן כלא שולם',
        deleteBillConfirmation_male: 'האם למחוק חשבון זה?',
        addMaintenanceRecord_male: 'הוסף קריאת שירות',
        deleteMaintenanceRecordConfirmation_male: 'האם למחוק תיעוד זה?',
        addRecord_male: 'הוסף תיעוד',
        uploadDocument_male: 'העלה מסמך',
        deleteDocumentConfirmation_male: 'האם למחוק מסמך זה?',
        averageMonthly_male: 'ממוצע חודשי',
        trend_male: 'מגמה',
        uploadMedia_male: 'העלה מדיה',
        deleteFileConfirmation_male: 'האם למחוק קובץ זה?',

        marketIntelligence: 'מודיעין שוק',
        manageCities: 'ניהול ערים',
        noCitiesPinnedDescription: 'טרם בחרתם ערים למעקב. בחרו את הערים המעניינות אתכם כדי לראות מגמות מחירים.',
        chooseCities: 'בחר ערים',
        avgRent: 'שכירות ממוצעת',
        manageTrackedCities: 'ניהול ערים למעקב',
        searchCities: 'חפש עיר...',
        currentlyTracking: 'ערים במעקב',
        availableCities: 'ערים זמינות',
        noResultsFound: 'לא נמצאו תוצאות',
        performanceTracking: 'מעקב ביצועים',
        'Jerusalem': 'ירושלים',
        'Tel Aviv': 'תל אביב',
        'Haifa': 'חיפה',
        'Rishon LeZion': 'ראשון לציון',
        'Petah Tikva': 'פתח תקווה',
        'Ashdod': 'אשדוד',
        'Netanya': 'נתניה',
        'Beer Sheva': 'באר שבע',
        'Holon': 'חולון',
        'Bnei Brak': 'בני ברק',
        'Ramat Gan': 'רמת גן',
        'Rehovot': 'רחובות',
        'Bat Yam': 'בת ים',
        'Herzliya': 'הרצליה',
        'Kfar Saba': 'כפר סבא',
        'Ra\'anana': 'רעננה',
        'Hadera': 'חדרה',
        'Modi\'in': 'מודיעין',
        'Nazareth': 'נצרת',
        'Lod': 'לוד',
        'Ramla': 'רמלה',
        legalProtection: 'חבילת הגנה משפטית',
        upgradeToUnlock: 'שדרגו לפתיחה',
        needsPaintingQuery: 'הדירה דורשת צביעה?',
        contractReadySummary: 'החוזה מוכן הסיכום!',
        contractReadySummaryDesc: 'החוזה עבור {address}, {city} מוכן ליצירה.',
        saveContractFileQuery: 'לשמור את קובץ החוזה?',
        storageRentMateCloud: 'ענן RentMate',
        storageRentMateCloudDesc: 'שמירה מאובטחת וגישה מכל מקום',
        storageThisDevice: 'מכשיר זה',
        storageThisDeviceDesc: 'הורדה למחשב בלבד',
        storageBoth: 'גם וגם',
        storageBothDesc: 'גיבוי כפול',
        storageCloudSuccess: 'החוזה יישמר בשרתי RentMate המאובטחים.',
        storageDeviceSuccess: 'החוזה יירד למכשיר הנוכחי ולא יישמר בענן.',
        storageBothSuccess: 'החוזה יישמר בענן וגם יירד למכשיר.',
        manualRate: 'שער ידני',
        indexByDate: 'לפי תאריך מדד',
        byDate: 'לפי תאריך',
        linkageCeiling: 'תקרת הצמדה',
        maxRisePercentage: 'אחוז עלייה מקסימלי',
        linkedToIndex: 'צמוד למדד',
        linkedToDollar: 'צמוד לדולר',
        knownIndexLabel: 'לפי מדד ידוע',
        respectOfLabel: 'בגין חודש',
        restrictions: 'מגבלות',
        ceilingLabel: 'תקרה',
        floorLabel: 'רצפה',
        payment: 'תשלום',
        contract: 'חוזה',
        asset: 'נכס',
        guaranteesLabel: 'ערבויות',

        dataSummary: 'סיכום נתונים',
        selectDisplayedIndices: 'בחר מדדים להצגה',
        cpi: 'מדד המחירים',
        housing: 'דיור',
        construction: 'תשומות הבנייה',
        usd: 'דולר',
        eur: 'אירו',
    },
    en: {
        appName: 'RentMate',
        commandCenterUpdates: 'I have {count} new updates for you.',
        commandCenterAllClear: 'Everything looks great. No pending tasks.',
        rentySuggestsAction: 'RENTY SUGGESTS ACTION',
        conciergeTitle: 'Complete Your Setup',
        conciergeDesc: 'You have {count} properties but no contracts yet. Let\'s get organized.',
        conciergeStart: 'Add First Contract',
        conciergeLater: 'Remind me later',
        conciergeAiExtraction: 'Smart AI Extraction',
        conciergeLinkageMonitoring: 'Automatic Linkage Alerts',
        all: 'All',
        active: 'Active',
        archived: 'Archived',
        legal_management: 'Legal Management',
        active_contract: 'Active Contract',
        archived_contract: 'Archived Contract',
        view_details: 'View Details',
        cancel: 'Cancel',
        logoutConfirmTitle: 'Logout?',
        logoutConfirmMessage: 'Are you sure you want to log out?',
        confirmLogout: 'Yes, Logout',
        marketIntelligence: 'Market Intelligence',
        manageCities: 'Manage Cities',
        noCitiesPinnedDescription: 'You haven\'t pinned any cities yet. Select cities to track their rental trends at a glance.',
        chooseCities: 'Choose Cities',
        avgRent: 'Average Rent',
        manageTrackedCities: 'Manage Tracked Cities',
        searchCities: 'Search cities...',
        currentlyTracking: 'Currently Tracking',
        availableCities: 'Available Cities',
        noResultsFound: 'No results found',
        performanceTracking: 'Performance Tracking',
        'Jerusalem': 'Jerusalem',
        'Tel Aviv': 'Tel Aviv',
        'Haifa': 'Haifa',
        'Rishon LeZion': 'Rishon LeZion',
        'Petah Tikva': 'Petah Tikva',
        'Ashdod': 'Ashdod',
        'Netanya': 'Netanya',
        'Beer Sheva': 'Beer Sheva',
        'Holon': 'Holon',
        'Bnei Brak': 'Bnei Brak',
        'Ramat Gan': 'Ramat Gan',
        'Rehovot': 'Rehovot',
        'Bat Yam': 'Bat Yam',
        'Herzliya': 'Herzliya',
        'Kfar Saba': 'Kfar Saba',
        'Ra\'anana': 'Ra\'anana',
        'Hadera': 'Hadera',
        'Modi\'in': 'Modi\'in',
        'Nazareth': 'Nazareth',
        'Lod': 'Lod',
        'Ramla': 'Ramla',
        indexByDate: 'Index by Date',
        manualRate: 'Manual Rate',
        legalProtection: 'Legal Safe Suite',
        upgradeToUnlock: 'Upgrade to Unlock',
        needsPaintingQuery: 'Does the apartment require painting?',
        contractReadySummary: 'Contract is Ready!',
        contractReadySummaryDesc: 'The contract for {address}, {city} is ready to be created.',
        saveContractFileQuery: 'Save contract file?',
        storageRentMateCloud: 'RentMate Cloud',
        storageRentMateCloudDesc: 'Secure storage & access from anywhere',
        storageThisDevice: 'This Device',
        storageThisDeviceDesc: 'Download to computer only',
        storageBoth: 'Both',
        storageBothDesc: 'Double backup',
        storageCloudSuccess: 'The contract will be saved on secure RentMate servers.',
        storageDeviceSuccess: 'The contract will be downloaded to the current device.',
        storageBothSuccess: 'The contract will be saved in the cloud and downloaded.',
        indexWatcherTitle: 'Index Watcher',
        baseAmount: 'Base Amount',
        adjustedAmount: 'Adjusted Amount',
        linkageCalculation: 'Linkage Calculation',
        linkageImpact: 'Linkage Impact',
        liveUpdate: 'Live Update',
        widgetSettings: 'Widget Settings',
        saveSettings: 'Save Settings',
        sharedCalculationDesc: 'This calculation has been shared with you. You can update values and recalculate.',
        shareMessage: 'I calculated the rent adjustment using RentMate\'s CPI calculator. See the result here:',
        loadFromContract: 'Load from contract (optional)',
        calculateLinkageAndMore: 'Open Calculator',
        currentRent: 'Current Rent',
        projectedRent: 'Projected Rent',
        autoDetectContracts: 'Auto Detect Contracts',
        autoDetectContractsDesc: 'Show projections for your assets',
        marketIndicesToTrack: 'Market Indices to Track',
        track: 'Track',
        baseDateOptional: 'Base Date (Optional)',
        unknownProperty: 'Unknown Property',
        selectDisplayedIndices: 'Select Displayed Indices',
        cpi: 'CPI',
        housing: 'Housing',
        construction: 'Construction',
        usd: 'USD',
        eur: 'EUR',

        // Plans
        free: 'SOLO',
        pro: 'MATE',
        solo: 'SOLO',
        mate: 'MATE',
        master: 'MASTER',
        unlimited: 'MASTER',
        ai_bills: 'AI Bill Extraction',
        cpi_autopilot: 'CPI Auto-Pilot',
        pricing_per_unit: 'per unit',
        pricing_billed_monthly: 'billed monthly',
        unlimited_properties: 'Unlimited Properties',
        property_unit: 'property',
        property_units: 'properties',
        curating_plans: 'Curating plans...',
        api_access: 'API Access',
        priority_support: 'Priority Support',
        bill_analysis: 'AI Bill Analysis',
        maintenance_tracker: 'Maintenance Tracker',
        legal_library: 'Legal Library',
        portfolio_visualizer: 'Portfolio Visualizer',
        whatsapp_bot: 'WhatsApp Bot',
        ai_assistant: 'AI Assistant',
        can_export: 'Full Data Export',
        bulkCheckEntryTitle: 'Bulk Check Entry',
        pleaseFillAllFields: 'Please fill all required fields',
        amountPerCheck: 'Amount per check',
        firstDueDate: 'First due date',
        numberOfChecks: 'Number of checks',
        startCheckNumber: 'Start check number (Optional)',
        previewChecks: 'Preview Checks',
        bulkCheckReviewDesc: 'Please review the generated checks before creating them.',
        bulkChecksAddedSuccess: 'Added {count} checks successfully',
        errorSavingPayments: 'Error saving payments',
        approveAndCreate: 'Approve & Create',
        paymentMarkedPaid: 'Payment marked as paid',
        paymentUndoSuccess: 'Action undone',
        errorInUndo: 'Error undoing action',
        undo: 'Undo',
        errorMarkingPaid: 'Error marking as paid',
        back: 'Back',
    },
};

export type TranslationKey = TranslationKeys;

export const useTranslation = () => {
    const { preferences } = useUserPreferences();
    const lang = preferences?.language || 'he';

    const t = (key: TranslationKey | string, params?: Record<string, string | number>): string => {
        const translation = (translations[lang] as any)?.[key] || (translations['en'] as any)?.[key] || key;

        if (!params) return translation;

        return Object.entries(params).reduce(
            (acc, [paramKey, value]) => acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value)),
            translation
        );
    };

    return { t, lang };
};
