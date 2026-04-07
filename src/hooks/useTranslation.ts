import { useUserPreferences } from '../contexts/UserPreferencesContext';

export type TranslationKeys =
    // Common
    | 'appName'
    | 'commandCenterUpdates'
    | 'commandCenterAllClear'
    | 'rentySuggestsAction'
    | 'loading' | 'loading_female'
    | 'processing'
    | 'error'
    | 'save' | 'save_female'
    | 'cancel'
    | 'edit' | 'edit_female'
    | 'delete' | 'delete_female'
    | 'add' | 'add_female'
    | 'search'
    | 'actions'
    | 'logPayment' | 'quickAction' | 'addExpense' | 'maintenanceRequest' | 'messageTenant'
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
    | 'selectOption'
    | 'saving' | 'saving_female'
    | 'adding' | 'adding_female'
    | 'saveChanges' | 'saveChanges_female'
    | 'editLayout' | 'saveLayout'
    | 'addItem' | 'addItem_female'
    | 'name'
    | 'address'
    | 'signup'
    | 'property'
    | 'tenant'
    | 'linkageCalculation'
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
    | 'addNew'
    | 'select_action_to_continue'
    | 'addTrackedIndex'
    | 'cpiAbbr'
    | 'housingAbbr'
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
    | 'fillRequiredFields'
    | 'contractSavedSuccess'
    | 'errorSavingContract'
    | 'addNew'
    | 'pickDate'
    | 'selectDate'
    | 'stepAsset' | 'stepTenant' | 'stepPeriods' | 'stepPayments' | 'stepSecurity' | 'stepSummary'
    | 'whereIsItLocated' | 'tellUsAboutProperty' | 'fetchingStreetView' | 'clickToUploadPicture' | 'uploading_ellipsis'
    | 'coming_soon_slide_1_title' | 'coming_soon_slide_1_desc'
    | 'coming_soon_slide_2_title' | 'coming_soon_slide_2_desc'
    | 'coming_soon_slide_3_title' | 'coming_soon_slide_3_desc'
    | 'coming_soon_slide_4_title' | 'coming_soon_slide_4_desc'

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
    | 'totalPendingWithIndex'
    | 'candidates'
    | 'tenantForms'
    | 'tenantFormsDesc'
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
    | 'online'
    | 'monthly'
    | 'quarterly'
    | 'semiannually'
    | 'annually'
    | 'checks'
    | 'transfer'
    | 'cash'
    | 'paybox'
    | 'other'
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
    | 'active'
    | 'archived'
    | 'ACTIVE'
    | 'ARCHIVED'
    | 'now'
    | 'items'
    | 'commandCenter'
    | 'welcomeMessageDashboard'
    | 'goodMorning'
    | 'goodAfternoon'
    | 'goodEvening'
    | 'goodNight'
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
    | 'timePeriod'
    | 'resetFilters'
    | 'allTime'
    | 'last3Months'
    | 'last6Months'
    | 'lastYear'
    | 'manualRate'
    | 'indexByDate'
    | 'byDate'
    | 'linkageCeiling'
    | 'maxRisePercentage'
    | 'needsPaintingQuery'
    | 'optionPeriods'
    | 'transfer'
    | 'check'
    | 'cash'
    | 'bit'
    | 'paybox'
    | 'other'
    | 'contractReadySummary'
    | 'contractReadySummaryDesc'
    | 'dataSummary'
    | 'legalProtection'
    | 'upgradeToUnlock'
    | 'storageCloudSuccess'
    | 'storageDeviceSuccess'
    | 'storageBothSuccess'
    | 'linkedToIndex'
    | 'linkedToDollar'
    | 'knownIndexLabel'
    | 'determiningIndex'
    | 'linkageMethod'
    | 'respectOfLabel'
    | 'restrictions'
    | 'ceilingLabel'
    | 'ceilingPlaceholder'
    | 'floorLabel'
    | 'floorPlaceholder'
    | 'payment'
    | 'contract'
    | 'asset'
    | 'paymentPaidAmount'
    | 'paymentPaidDate'
    | 'guaranteesLabel'
    | 'baseDateRequired'
    | 'summaryDetails'
    | 'leasePeriod'
    | 'linkage'
    | 'baseDate'
    | 'optionNoticeDays'
    | 'optionReminderDays'
    | 'hasParking'
    | 'hasStorage'
    | 'hasBalcony'
    | 'hasSafeRoom'
    | 'upcoming_payment'
    | 'contract_expiry'
    | 'contract_status_updated'
    | 'overdue_payment'
    | 'cancelled'
    | 'archived_contract'
    | 'active_contract'
    | 'guarantorsInfo'
    | 'specialClauses'
    | 'paintingIncluded'
    | 'infrastructure'
    | 'parties'
    | 'timeline'
    | 'additionalDetails'
    | 'features'
    | 'until'
    | 'contractPeriod'
    | 'duration'
    | 'securityAndExtras'

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
    | 'noContractsFound'
    | 'noPropertiesFound'
    | 'noTenantsFound'
    | 'customize'
    | 'myPortfolio'
    | 'customizeDashboard'
    | 'customizeDashboardDesc'
    | 'visible'
    | 'hidden'
    | 'usage_overview_title'
    | 'index_pulse'
    | 'smart_actions_title'
    | 'digital_protocol_title'
    | 'digital_protocol_subtitle'
    | 'quick_actions_title'
    | 'prospective_tenants_title'
    | 'prospective_tenants_subtitle'
    | 'rental_trends_title'
    | 'marketAnalysisFilters'
    | 'includeMamahPremium'
    | 'mamahImpactDesc'
    | 'comparisonDuration'
    | 'showResults'
    | '1Y'
    | '2Y'
    | '3Y'
    | '4Y'
    | '5Y'
    // Coming Soon
    | 'coming_soon_title'
    | 'coming_soon_subtitle'
    | 'coming_soon_feature_1'
    | 'coming_soon_feature_2'
    | 'coming_soon_feature_3'
    | 'coming_soon_name_label'
    | 'coming_soon_email_label'
    | 'coming_soon_phone_label'
    | 'coming_soon_cta'
    | 'coming_soon_success'
    | 'coming_soon_error'
    | 'coming_soon_already_registered'
    | 'coming_soon_ip_protection'
    | 'language_toggle'
    | 'leaseEnds'
    | 'deleteAsset'
    | 'deleteAssetConfirm'
    | 'rentmateUser'
    | 'rentmateDashboard'
    | 'billDetected'
    | 'associateWithProperty'
    | 'saveAndRecord'


    // Missing Payment UI Keys
    | 'cardsView'
    | 'tableView'
    | 'actionNeeded'
    | 'upcomingAndPaid'
    | 'unnamedTenant'
    // Payments Page
    | 'paymentsTitle'
    | 'trackFuturePayments'
    | 'allTypes'
    | 'rent'
    | 'bills'
    | 'paymentType'
    | 'addPayment' | 'addPayment_female'
    | 'financialOverview'
    | 'monthlyExpected'
    | 'baseMonthlyExpected'
    | 'monthlyExpectedTitle'
    | 'totalPendingToPay'
    | 'withoutLinkage'
    | 'includingLinkage'
    | 'totalWithIndex'
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
    | 'next3Months'
    | 'next6Months'
    | 'nextYear'
    | 'currentWindow'
    | 'allTime'
    | 'sortOldestFirst'
    | 'sortNewestFirst'
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
    | 'amountGreaterThanZero'
    | 'dueDateRequired'
    | 'methodRequired'
    | 'errorFetchingContracts'
    | 'paymentLinkedToPending'
    | 'savingPayment'
    | 'paymentSavedSuccess'
    | 'addAnotherReady'
    | 'errorSavingPayment'
    | 'linkToExpectedPayment'
    | 'bestMatch'
    | 'linkedToPaymentOf'
    | 'addAnother'
    | 'sessionAdded'

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
    | 'remainingDebt'
    | 'knownIndex'
    | 'inRespectOf'
    | 'knownIndexHelp'
    | 'updateFrequency'
    | 'howItWorksTitle'
    | 'reconciliationInfoText'
    | 'everyMonth'
    | 'quarterly'
    | 'annually'
    | 'updateFrequencyHelp'
    | 'linkageFloor'
    | 'indexBaseMin'
    | 'indexBaseMinHelp'
    | 'tooltipIndexBaseMinText'
    | 'tooltipIndexBaseMinExample'
    | 'tooltipPartialLinkageText'
    | 'tooltipPartialLinkageExample'
    | 'maxIncrease'
    | 'tooltipMaxIncreaseText'
    | 'tooltipMaxIncreaseExample'
    | 'exampleLabel'
    | 'capCeiling'
    | 'periodStart'
    | 'periodEnd'
    | 'tooltipLinkageTypeText'
    | 'tooltipLinkageCalculationMethodText'
    | 'tooltipBaseIndexDateText'
    | 'tooltipPeriodStartText'
    | 'tooltipPeriodEndText'
    | 'advancedCalculatorExplanation'
    | 'tooltipGenerateListText'
    | 'tooltipExpectedPaymentsText'
    | 'tooltipActualPaymentsText'
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
    | 'amenities'
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
    | 'optionPeriod'
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
    | 'noLinkage'
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
    | 'myPortfolio'
    | 'leaseEnds'
    | 'leaseTimeline'

    // Misc
    | 'noActiveContract'
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
    | 'accessibility_options'
    | 'accessibility_subtitle'
    | 'accessibility_large_text_title'
    | 'accessibility_large_text_desc'
    | 'accessibility_high_contrast_title'
    | 'accessibility_high_contrast_desc'
    | 'accessibility_reduced_motion_title'
    | 'accessibility_reduced_motion_desc'
    | 'accessibility_dyslexia_font_title'
    | 'accessibility_dyslexia_font_desc'
    | 'accessibility_law_note'
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
    | 'unsavedChangesWarningTitle'
    | 'unsavedChangesWarning'
    | 'noPhone'
    | 'deleteTenantError'
    | 'addNewTenant' | 'addNewTenant_female'
    | 'myTenants'
    | 'manageTenantsDesc'
    | 'addProperty' | 'addProperty_female'
    | 'noAssetsFound'
    | 'addFirstPropertyDesc' | 'addFirstPropertyDesc_female'
    | 'createFirstAsset' | 'createFirstAsset_female'
    | 'maintenanceHub'
    | 'maintenanceOverview'
    | 'logExpense'
    | 'totalYTD'
    | 'totalTickets'
    | 'avgCost'
    | 'noMaintenanceRecords'
    | 'noMaintenanceDesc'
    | 'recentActivity'
    | 'wizard_desc'
    | 'selectCategory'
    | 'step'
    | 'finish'
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
    | 'total'
    | 'searchPlaceholderContracts'
    | 'searchPlaceholderProperties'
    | 'storageUsage'
    | 'totalStorage'
    | 'usedStorage'
    | 'mediaStorage'
    | 'utilitiesStorage'
    | 'maintenanceStorage'
    | 'documentsStorage'
    | 'documents'
    | 'receipts'
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
    | 'utilityMortgage'
    | 'utilityOther'
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
    | 'last_updated'
    | 'try_rentmate_free'
    | 'hero_title_legal'
    | 'hero_desc_legal'
    | 'cta_button_legal'
    | 'hero_title_tax'
    | 'hero_desc_tax'
    | 'cta_button_tax'
    | 'hero_title_generic'
    | 'hero_desc_generic'
    | 'cta_button_generic'
    | 'article_not_found'
    | 'back_to_knowledge_base'
    | 'errorTitle404'
    | 'errorDesc404'
    | 'errorTitle500'
    | 'errorDesc500'
    | 'backToHome'
    | 'reportToAdmin'
    | 'reporting'
    | 'reportSuccess'
    | 'reportError'
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
    | 'auth_sign_up'
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
    | 'aiAnalysisTitle'
    | 'aiAnalysisDesc'
    | 'aiAnalysisRequiredFor'
    | 'aiAnalysisDisclaimer'
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
    | 'Ramla'
    | 'Akko'
    | 'Afula'
    | 'Arad'
    | 'Ashkelon'
    | 'Beit Shemesh'
    | 'Bet Shemesh' // Alias
    | 'Central'
    | 'Dimona'
    | 'Eilat'
    | 'Elad'
    | 'Givatayim'
    | 'Hod HaSharon'
    | 'Karmiel'
    | 'Kfar Yona'
    | 'Kiryat Ata'
    | 'Kiryat Bialik'
    | 'Kiryat Gat'
    | 'Kiryat Malakhi'
    | 'Kiryat Motzkin'
    | 'Kiryat Ono'
    | 'Kiryat Shmona'
    | 'Kiryat Yam'
    | 'Ma\'ale Adumim'
    | 'Migdal HaEmek'
    | 'Modi\'in Illit'
    | 'Nahariya'
    | 'Nazareth Illit'
    | 'Nof HaGalil'
    | 'Nes Ziona'
    | 'Netivot'
    | 'Ofakim'
    | 'Or Akiva'
    | 'Or Yehuda'
    | 'Ramat HaSharon'
    | 'Rosh HaAyin'
    | 'Safed'
    | 'Sderot'
    | 'Tamra'
    | 'Tayibe'
    | 'Tiberias'
    | 'Tirat Carmel'
    | 'Umm al-Fahm'
    | 'Yavne'
    | 'Yehud-Monosson'
    | 'Yokneam Illit'
    | 'Beer Sheba'
    | 'Ness Ziona'
    | 'Zefat'
    | 'baseIndex'
    | 'needsPainting'
    | 'needsPaintingDesc'
    | 'specialClausesPlaceholder'
    | 'guarantees'
    | 'guaranteesPlaceholder'
    | 'dateRange'
    | 'noOptionsDefined'
    | '3Months'
    | '6Months'
    | '12Months'
    | 'tenantForm'
    | 'createDocumentFolder'
    | 'noDocumentsFound'
    | 'startByAddingAbove'
    | 'createTenantSignLink'
    | 'tenantLinkCopied'
    | 'copyLinkError';

export const translations: Record<string, any> = {
    he: {
        // Common
        appName: 'RentMate',
        addNew: 'רנטי, מה תרצה לעשות?',
        select_action_to_continue: 'בחר פעולה מהירה להמשך',
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
        processing: 'מעבד...',
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
        logPayment: 'תיעוד תשלום',
        quickAction: 'פעולה מהירה',
        addExpense: 'הוסף הוצאה',
        maintenanceRequest: 'קריאת שירות',
        messageTenant: 'שלח הודעה',
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
        selectOption: 'בחרו אפשרות...',
        pickDate: 'בחר תאריך',
        selectDate: 'בחר תאריך',
        saving: 'שומר...',
        saving_female: 'שומרת...',
        adding: 'מוסיף...',
        adding_female: 'מוסיפה...',
        saveChanges: 'שמור שינויים',
        saveChanges_female: 'שמרי שינויים',
        addItem: 'הוסף פריט',
        addItem_female: 'הוסיפי פריט',
        editLayout: 'עריכת תצוגה',
        saveLayout: 'שמירת תצוגה',
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
        monthly: 'חודשי',
        bimonthly: 'דו חודשי',
        quarterly: 'רבעוני',
        semiannually: 'חציוני',
        annually: 'שנתי',
        contractDetails: 'פרטי החוזה',
        editContract: 'עריכת חוזה',
        contractPeriodStatus: 'סטטוס תקופת החוזה',
        paymentFreq: 'תדירות תשלום',
        paymentDay: 'יום התשלום',
        day: 'יום',
        addProperty: 'הוספת נכס',
        complete: 'הושלם',
        step: 'שלב',
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
        financeActual: 'שולם',
        financeExpected: 'צפוי',
        financeAll: 'הכל',
        financeRent: 'שכירות',
        financeBills: 'חשבונות',
        utilityInternet: 'אינטרנט',
        utilityCable: 'טלוויזיה בכבלים',
        dateRange: 'טווח תאריכים',
        sqm: 'מ"ר',

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
        candidates: 'מתעניינים',
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
        agreeToTerms: 'אני מסכים ל- {terms} ול{privacy}, כולל הסכמה מפורשת לעיבוד נתונים על ידי מערכות בינה מלאכותית (AI).',
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
        totalPendingWithIndex: 'סה״כ ממתין עם מדד',
        contractEnded: 'חוזה הסתיים',
        contractEndedDesc: 'החוזה עבור {address} הסתיים ב-{date}.',
        archiveAndCalculate: 'ארכב וחשב',
        archiveAndCalculate_female: 'ארכבי וחשבי',
        welcomeMessage: 'ברוכים הבאים ל-RentMate',
        welcomeMessageDashboard: 'ערב טוב',
        goodMorning: 'בוקר טוב',
        goodAfternoon: 'צהריים טובים',
        goodEvening: 'ערב טוב',
        goodNight: 'לילה טוב',
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
        organizeDocs: 'ארגן מסמכים',
        commandCenter: 'מרכז שליטה',
        organizeDocsDesc: 'העלה קבלות וחשבונות למקום אחד מסודר',
        uploadNow: 'העלה עכשיו',
        uploadNow_female: 'העלי עכשיו',

        // Analytics
        analyticsTitle: 'אנליטיקה',
        analyticsSubtitle: 'סקירת ביצועי פורטפוליו',
        totalRevenueLTM: 'הכנסה שנתית',
        avgRentPerProperty: 'שכירות דירה ממוצעת',
        revenueTrend: 'מגמות הכנסה',
        paymentStatus: 'סטטוס תשלומים',
        last12Months: '12 חודשים אחרונים',
        vsLastYear: 'לעומת שנה שעברה',
        '3Months': '3 חודשים',
        '6Months': '6 חודשים',
        '12Months': '12 חודשים',

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
        customizeDashboard: 'התאם אישית את הדשבורד',
        customizeDashboardDesc: 'סדר והסתר ווידג׳טים לפי הצרכים שלך',
        visible: 'מוצג',
        hidden: 'מוסתר',
        usage_overview_title: 'תמונת מצב משאבים',
        index_pulse: 'מדדים ומטבעות',
        smart_actions_title: 'פעולות חכמות',
        digital_protocol_title: 'פרוטוקול מסירה דיגיטלי',
        digital_protocol_subtitle: 'פרוטוקול מסירה דיגיטלי לכניסה ויציאה',
        quick_actions_title: 'קיצורי דרך',
        prospective_tenants_title: 'שוכרים פוטנציאליים',
        prospective_tenants_subtitle: 'היערכות לדיירים חדשים',
        rental_trends_title: 'מגמות שוק',
        marketAnalysisFilters: 'סינונים לניתוח שוק',
        includeMamahPremium: 'הנכס כולל ממ"ד',
        mamahImpactDesc: '',
        comparisonDuration: 'תקופת השוואה',
        showResults: 'הצג תוצאות',
        '1Y': 'שנה',
        '2Y': 'שנתיים',
        '3Y': '3 שנים',
        '4Y': '4 שנים',
        '5Y': '5 שנים',
        myPortfolio: 'התיק שלי',
        leaseEnds: 'חוזה מסתיים',
        deleteAsset: 'מחיקת נכס',
        deleteAssetConfirm: 'האם למחוק נכס זה וכל נתוניו?',
        rentmateUser: 'משתמש RentMate',
        rentmateDashboard: 'לוח בקרה RentMate',
        billDetected: 'חשבון זוהה',
        associateWithProperty: 'שייך לנכס',
        saveAndRecord: 'שמור ותעד',
        noActiveContract: 'אין חוזה פעיל',
        noOptionsDefined: 'לא הוגדרו אופציות',
        // Missing Payment UI Keys
        receipts: 'אסמכתאות',
        cardsView: 'תצוגת כרטיסיות',
        tableView: 'תצוגת טבלה',
        actionNeeded: 'לטיפולך',
        upcomingAndPaid: 'קרובים ושולמו',
        unnamedTenant: 'דייר ללא שם',
        // Payments Page
        paymentsTitle: 'תשלומים',
        trackFuturePayments: 'מעקב תשלומים',
        allTypes: 'כל הסוגים',
        rent: 'שכירות',
        bills: 'חשבונות',
        paymentType: 'סוג תשלום',
        addPayment: 'הוסף תשלום',
        addPayment_female: 'הוסיפי תשלום',
        financialOverview: 'סקירה פיננסית',
        monthlyExpected: 'צפי חודשי',
        baseMonthlyExpected: 'צפי חודשי בסיס',
        monthlyExpectedTitle: 'צפי חודשי',
        totalPendingToPay: 'סה״כ ממתין לתשלום',
        withoutLinkage: 'ללא הצמדה',
        includingLinkage: 'כולל הצמדה',
        totalWithIndex: 'סה״כ עם מדד',
        pendingCollection: 'ממתין לגבייה',
        upcomingPayments: 'תשלומים קרובים',
        noPaymentsFound: 'לא נמצאו תשלומים.',
        totalExpected: 'סה"כ צפוי',
        totalActual: 'סה"כ שולם',
        cancelled: 'מבוטל',
        collectionRate: 'שיעור גבייה',
        exp: 'צפוי',
        base: 'בסיס',
        last3Months: '3 חד\' אחרונים',
        last6Months: '6 חד\' אחרונים',
        lastYear: 'שנה אחרונה',
        allTime: 'כל הזמן',
        sortOldestFirst: 'מהישן לחדש',
        sortNewestFirst: 'מהחדש לישן',
        filters: 'סינונים',
        allTenants: 'כל הדיירים',
        allAssets: 'כל הנכסים',
        method: 'אמצעי תשלום',
        allMethods: 'כל אמצעי התשלום',
        transfer: 'העברה בנקאית',
        checks: 'צ\'קים',
        paymentBank: 'בנק',
        paymentBranch: 'סניף',
        paymentAccount: 'חשבון',
        paymentCheckNum: 'מספר צ\'ק',
        paymentNote: 'הערה',
        paymentReceipt: 'אסמכתא',
        paymentUploadReceipt: 'העלאת אסמכתא (תמונה/PDF)',
        paymentReceiptAttached: 'אסמכתא מצורפת',
        paymentMethodDetails: 'פרטי אמצעי תשלום',
        paymentDetailsTitle: 'פרטי אמצעי תשלום',
        paymentPhoneNumber: 'מספר טלפון',
        paymentPaidAmount: 'סכום התשלום',
        paymentPaidDate: 'תאריך תשלום בפועל',
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
        amountGreaterThanZero: 'הסכום חייב להיות גדול מאפס',
        dueDateRequired: 'תאריך יעד הוא שדה חובה',
        methodRequired: 'שיטת תשלום היא חובה',
        errorFetchingContracts: 'שגיאה בטעינת החוזים',
        paymentLinkedToPending: 'התשלום קושר לתשלום צפוי!',
        savingPayment: 'שומר תשלום...',
        paymentSavedSuccess: 'התשלום נשמר בהצלחה!',
        addAnotherReady: 'הוסף תשלום נוסף',
        errorSavingPayment: 'שגיאה בשמירת התשלום',
        linkToExpectedPayment: 'קישור לתשלום צפוי',
        bestMatch: 'התאמה מיטבית',
        linkedToPaymentOf: 'מקושר לתשלום ע"ס',
        addAnother: 'הוסף עוד',
        sessionAdded: 'נוספו בסשן זה',

        // Calculator & Reconciliation
        indexCalculator: 'מחשבון הצמדה',
        calculatorDesc: 'חישוב הפרשי הצמדה למדד והתחשבנות',
        standardCalculation: 'סכום בודד',
        paymentReconciliation: 'סדרת תשלומים',
        baseRent: 'סכום להצמיד',
        linkageType: 'מדד להצמדה',
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
        expectedBaseRent: 'סכום לפני מדד',
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
        remainingDebt: 'יתרות חוב',
        linkageMethod: 'שיטת הצמדה',
        knownIndex: 'מדד ידוע',
        determiningIndex: 'מדד קובע',
        inRespectOf: 'מדד קובע',
        knownIndexHelp: 'לפי המדד האחרון שפורסם במועד התחשבנות',
        updateFrequency: 'תדירות עדכון',
        everyMonth: 'חודשי',
        updateFrequencyHelp: 'באיזו תכיפות מעדכנים את שכר הדירה?',
        linkageFloor: 'רצפת הצמדה',
        indexBaseMin: "מדד בסיס הוא מדד מינ'",
        indexBaseMinHelp: 'האם למנוע ירידת שכירות כשהמדד שלילי?',
        tooltipIndexBaseMinText: 'כאשר אפשרות זו פעילה, במידה ומדד המחירים במועד החישוב נמוך ממדד הבסיס (המדד ביום תחילת החוזה), החישוב יתבצע כאילו המדד לא ירד כלל.',
        tooltipIndexBaseMinExample: 'אם מדד הבסיס היה 100 והמדד הנוכחי ירד ל-98, המערכת תחשב לפיו המדד נשאר 100, כך ששכר הדירה לא יפחת.',
        tooltipPartialLinkageText: 'מאפשר להצמיד רק חלק מסוים משכר הדירה למדד.',
        tooltipPartialLinkageExample: 'אם שכר הדירה הוא 5,000 ש"ח והגדרתם 80% הצמדה, רק 4,000 ש"ח מתוכם יושפעו מעליית המדד, וה-1,000 ש"ח הנותרים יישארו קבועים ללא שינוי.',
        maxIncrease: "עליית מדד שנתית מקס'",
        tooltipMaxIncreaseText: 'מגביל את אחוז העלייה המקסימלי של שכר הדירה בשנה, להגנה מפני עליות מדד חריגות. תקרת העלייה (ההגנה) מחושבת באופן יחסי למספר החודשים שעברו.',
        tooltipMaxIncreaseExample: 'אם הגדרתם מקסימום 5% בשנה, ועברו 6 חודשים (חצי שנה), שכר הדירה לא יעלה ביותר מ-2.5% בתקופה זו, גם אם המדד בפועל עלה יותר.',
        exampleLabel: 'דוגמה:',
        howItWorksTitle: 'מחשבון התחשבנות מתקדם',
        reconciliationInfoText: 'מחשבון זה בודק את פער התשלומים לאורך התקופה. הזינו את התשלומים ששולמו בפועל, והמערכת תשווה אותם למה שהיה אמור להשתלם (כולל חישובי הצמדה). לבסוף תקבלו דוח המציג חוב או זכות בצורה מדויקת.',
        capCeiling: 'מקסימום שינוי (%)',
        periodStart: 'תחילת תקופה',
        periodEnd: 'סוף תקופה',
        tooltipLinkageTypeText: 'סוג המדד אליו יוצמד הסכום - מדד המחירים לצרכן הוא הנפוץ ביותר בישראל.',
        tooltipLinkageCalculationMethodText: 'מדד ידוע: מחושב לפי המדד הזמין לפני יום התשלום. מדד קובע: מחושב לפי המדד המשויך לחודש התשלום, גם אם פורסם לאחריו.',
        tooltipBaseIndexDateText: 'המועד שלפיו נקבע מדד הבסיס שמולו יחושבו כל פערי ההצמדה לכל אורך התקופה. לרוב תאריך חתימת החוזה.',
        tooltipPeriodStartText: 'החודש שממנו והלאה נתחיל לחשב ולצבור את פערי ההצמדה בחוב.',
        tooltipPeriodEndText: 'החודש האחרון בתקופת הזמן שעליה מחושב החוב וההצמדה (התקופה הרטרואקטיבית).',
        tooltipGenerateListText: 'מילוי אוטומטי של חודשי השכירות. המערכת תייצר שורת תשלום לכל חודש בטווח התאריכים שהגדרת למטה (תחילת וסוף תקופה), ותציב בה את סכום הבסיס. חובה להגדיר תאריכי תקופה קודם.',
        tooltipExpectedPaymentsText: 'הסכום הבסיסי המקורי שהיה אמור להיות משולם בכל חודש, לא כולל ההצמדה למדד.',
        tooltipActualPaymentsText: 'התשלומים ששולמו בפועל מול הסכום הצפוי. פער הסכומים (והמדד) הוא זה שיוצר את החוב.',
        advancedCalculatorExplanation: 'מחשבון ההפרשים (מוכר גם כמחשבון רטרואקטיבי) מפיק טבלת חוב מסודרת ומאפשר לחשב את סך כל הפערים שנוצרו כאשר תשלומי שכר דירה שולמו לאורך זמן ללא התחשבות נאותה בעליית המדד כמקובל בחוזה.',
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
        addTrackedIndex: 'הוסף מדד למעקב',

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
        amenities: 'מאפיינים נוספים',
        storage: 'מחסן',
        propertyImage: 'תמונת הנכס',
        uploadFile: 'העלאת קובץ',
        importFromGoogle: 'ייבא מ-Google',
        clickToUpload: 'לחץ להעלאת תמונה',
        uploading: 'מעלה...',
        tenantDetails: 'פרטי הדייר',
        monthlyRentLabel: 'שכירות חודשית',
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
        optionPeriod: 'תקופת אופציה',
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
        paymentMethod: 'אמצעי תשלום',
        contractIsIndexed: 'החוזה צמוד למדד',
        linkedToCpi: 'מחירים לצרכן',
        linkedToHousing: 'מחירי הדיור',
        linkedToUsd: 'צמוד לדולר',
        linkedToEur: 'צמוד לאירו',
        linkedToConstruction: 'צמוד למדד תשומות הבנייה',
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
        baseDateRequired: 'יש להזין תאריך בסיס',
        indexTypeRequired: 'יש לבחור מדד להצמיד',
        indexOption: 'אופציית מדד',
        linkageCategory: 'קטגוריית הצמדה',
        propertySpecs: 'מפרט נכס',
        leaseTerms: 'תנאי שכירות',
        financials: 'תשלומים',
        partiesInvolved: 'צדדים בחוזה',
        option: 'אופציה',
        periods: 'תקופות',
        summaryDetails: 'פרטי הסיכום',
        leasePeriod: 'תקופת השכירות',
        linkage: 'הצמדה',
        property: 'נכס',
        tenant: 'דייר',
        garden: 'דירת גן',
        optionNoticeDays: 'הודעת מימוש אופציה (ימים)',
        optionReminderDays: 'תזכורת לפני מועד הודעה (ימים)',
        hasParking: 'חניה',
        hasStorage: 'מחסן',
        hasBalcony: 'מרפסת',
        hasSafeRoom: 'ממ"ד',
        guarantorsInfo: 'פרטי ערבים',
        specialClauses: 'תנאים מיוחדים',
        paintingIncluded: 'צביעה כלולה',
        infrastructure: 'תשתית ומפרט',
        parties: 'צדדים בחוזה',
        timeline: 'לוח זמנים',
        additionalDetails: 'פרטים נוספים',
        addTenant: 'הוסף שוכר',
        addTenant_female: 'הוסיפי שוכר',

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
        unlimited: 'ללא הגבלה',
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
        accessibility_options: 'אפשרויות נגישות',
        accessibility_subtitle: 'התאמה אישית של חווית השימוש',
        accessibility_large_text_title: 'טקסט גדול',
        accessibility_large_text_desc: 'מגדיל את גודל הטקסט בכל האפליקציה',
        accessibility_high_contrast_title: 'ניגודיות גבוהה',
        accessibility_high_contrast_desc: 'מגביר את הניגודיות בין טקסט לרקע',
        accessibility_reduced_motion_title: 'הפחתת תנועה',
        accessibility_reduced_motion_desc: 'ממזער אנימציות ומעברים למניעת סחרחורות',
        accessibility_dyslexia_font_title: 'גופן מותאם לדיסלקציה',
        accessibility_dyslexia_font_desc: 'משתמש בגופן מעוצב במיוחד לקריאות קלה',
        accessibility_law_note: 'אפשרויות אלו מספקות תמיכת נגישות יעילה בהתאם לחוק שוויון זכויות לאנשים עם מוגבלויות.',
        languageLocalization: 'שפה והתאמה אישית',
        language: 'שפה',
        genderForHebrew: 'מגדר (להתאמת העברית)',
        support: 'תמיכה',
        utilityWater: 'מים',
        utilityElectric: 'חשמל',
        utilityGas: 'גז',
        utilityMunicipality: 'ארנונה',
        utilityManagement: 'ועד בית',
        utilityMortgage: 'משכנתא',
        utilityOther: 'אחר',
        totalBills: 'סה"כ חשבונות',
        unpaid: 'טרם שולם',
        uploadNewBill: 'העלה חשבון חדש',
        uploadNewBill_female: 'העלי חשבון חדש',
        uploadBillTitle: 'העלאת חשבון',
        stepAsset: 'נכס',
        stepTenant: 'דיירים',
        stepPeriods: 'תקופות',
        stepPayments: 'תשלומים',
        stepSecurity: 'ביטחונות',
        stepSummary: 'סיכום',
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
        features: 'מאפיינים',
        until: 'עד',
        contractPeriod: 'תקופת החוזה',
        duration: 'משך',
        securityAndExtras: 'ביטחונות ותוספות',
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
        utilitiesStorage: 'חשבונות',
        maintenanceStorage: 'תחזוקה ותיקונים',
        documentsStorage: 'מסמכים',
        documents: 'מסמכים',
        photosAndVideos: 'מדיה',
        mediaGalleryDesc: 'גלריית נכס ותיעוד ויזואלי',
        vacant: 'פנוי',
        storageUsage: 'ניצול שטח אחסון',
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
        next3Months: '3 חודשים הבאים',
        next6Months: '6 חודשים הבאים',
        nextYear: 'השנה הבאה',
        currentWindow: 'חלון נוכחי (חודש אחורה - 3 קדימה)',
        knowledgeBase: 'מרכז ידע',
        errorTitle404: 'אופס! הדף לא נמצא',
        errorDesc404: 'מצטערים, הדף שחיפשת אינו קיים או שהועבר לכתובת אחרת.',
        errorTitle500: 'משהו השתבש אצלנו',
        errorDesc500: 'אירעה שגיאה בלתי צפויה. הצוות הטכני שלנו כבר עודכן ומטפל בזה.',
        backToHome: 'חזרה לדף הבית',
        reportToAdmin: 'דווח למנהל המערכת',
        reporting: 'מדווח...',
        reportSuccess: 'הדיווח נשלח בהצלחה',
        reportError: 'נכשל בשליחת הדיווח',
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
        auth_sign_up: 'הירשם עכשיו',
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
        timePeriod: 'תקופת זמן',
        resetFilters: 'איפוס סינונים',
        shared_calc_official_index: 'חישוב הצמדה למדד',
        shared_calc_updated_rent: 'שכירות מעודכנת',
        shared_calc_base_rent: 'סכום להצמיד',
        shared_calc_linkage: 'מדד להצמיד',
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
        aiAnalysisTitle: 'אישור ניתוח נתונים ב-AI',
        aiAnalysisDesc: 'אפשר למנוע הבינה המלאכותית שלנו לגשת לחוזים, לתשלומים ולפרטי הדיירים שלך כדי להפיק תובנות פיננסיות והתראות חכמות.',
        aiAnalysisRequiredFor: 'נדרש עבור פיצ׳רים כמו "כמה כסף עשיתי?"',
        aiAnalysisDisclaimer: 'הנתונים מעובדים בצורה מאובטחת באמצעות OpenAI ולא משמשים לאימון מודלים. התובנות מופקות בזמן אמת רק עבור הבקשות שלך.',
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
        indexWatcherTitle: 'מעקב מדדים',
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
        unsavedChangesWarningTitle: 'שינויים שלא נשמרו',
        unsavedChangesWarning: 'ישנם שינויים שלא נשמרו. האם לצאת ללא שמירה?',
        addNewTenant_male: 'הוסף דייר חדש',
        addProperty_male: 'הוסף נכס',
        addFirstPropertyDesc: 'עדיין לא הוספת נכסים. התחל בהוספת היחידה הראשונה שלך למעקב.',
        addFirstPropertyDesc_female: 'עדיין לא הוספת נכסים. התחלי בהוספת היחידה הראשונה שלך למעקב.',
        createFirstAsset: 'הוסף את הנכס הראשון שלי',
        createFirstAsset_female: 'הוסיפי את הנכס הראשון שלי',
        maintenanceHub: 'מרכז תחזוקה',
        maintenanceOverview: 'בריאות הפורטפוליו',
        logExpense: 'תיעוד הוצאה',
        totalYTD: 'סה"כ הוצאות (שנתי)',
        totalTickets: 'סה"כ קריאות',
        avgCost: 'עלות ממוצעת לקריאה',
        noMaintenanceRecords: 'אין תיעודי תחזוקה',
        noMaintenanceDesc: 'התחל לתעד הוצאות כדי לעקוב אחר מצב הנכסים שלך.',
        wizard_desc: 'אנחנו נעזור לך לקטלג ולנהל את הנכסים שלך בצורה יעילה.',
        selectCategory: 'בחר סוג נכס',
        finish: 'סיום',
        occupied: 'מושכר',
        base_rent: 'סכום להצמיד',
        whereIsItLocated: 'איפה הנכס ממוקם?',
        noAssetsFound: 'לא נמצאו נכסים',
        tellUsAboutProperty: 'ספרו לנו על הנכס',
        fetchingStreetView: 'טוען תמונת רחוב...',
        clickToUploadPicture: 'לחץ להעלאת תמונה',
        uploading_ellipsis: 'מעלה...',
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
        'Beer Sheba': 'באר שבע',
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
        'Akko': 'עכו',
        'Afula': 'עפולה',
        'Arad': 'ערד',
        'Ashkelon': 'אשקלון',
        'Beit Shemesh': 'בית שמש',
        'Bet Shemesh': 'בית שמש',
        'Central': 'מרכז',
        'Dimona': 'דימונה',
        'Eilat': 'אילת',
        'Elad': 'אלעד',
        'Givatayim': 'גבעתיים',
        'Hod HaSharon': 'הוד השרון',
        'Karmiel': 'כרמיאל',
        'Kfar Yona': 'כפר יונה',
        'Kiryat Ata': 'קריית אתא',
        'Kiryat Bialik': 'קריית ביאליק',
        'Kiryat Gat': 'קריית גת',
        'Kiryat Malakhi': 'קריית מלאכי',
        'Kiryat Motzkin': 'קריית מוצקין',
        'Kiryat Ono': 'קריית אונו',
        'Kiryat Shmona': 'קריית שמונה',
        'Kiryat Yam': 'קריית ים',
        'Ma\'ale Adumim': 'מעלה אדומים',
        'Migdal HaEmek': 'מגדל העמק',
        'Modi\'in Illit': 'מודיעין עילית',
        'Nahariya': 'נהריה',
        'Nazareth Illit': 'נצרת עילית',
        'Nof HaGalil': 'נוף הגליל',
        'Nes Ziona': 'נס ציונה',
        'Ness Ziona': 'נס ציונה',
        'Netivot': 'נתיבות',
        'Ofakim': 'אופקים',
        'Or Akiva': 'אור עקיבא',
        'Or Yehuda': 'אור יהודה',
        'Ramat HaSharon': 'רמת השרון',
        'Rosh HaAyin': 'ראש העין',
        'Safed': 'צפת',
        'Sderot': 'שדרות',
        'Tamra': 'טמרה',
        'Tayibe': 'טייבה',
        'Tiberias': 'טבריה',
        'Tirat Carmel': 'טירת כרמל',
        'Umm al-Fahm': 'אום אל-פחם',
        'Yavne': 'יבנה',
        'Yehud-Monosson': 'יהוד-מונוסון',
        'Yokneam Illit': 'יוקנעם עילית',
        'Zefat': 'צפת',
        legalProtection: 'חבילת הגנה משפטית',
        upgradeToUnlock: 'שדרגו לפתיחה',
        needsPaintingQuery: 'האם התחייב צביעה מחדש בפינוי?',
        check: 'צ׳קים',
        cash: 'מזומן',
        bit: 'ביט',
        paybox: 'פייבוקס',
        other: 'אחר',
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
        respectOfLabel: 'מדד קובע',
        restrictions: 'אחוז עליה מקס\'',
        ceilingLabel: 'תקרה',
        ceilingPlaceholder: 'תקרה %',
        floorLabel: 'מדד בסיס הוא מדד מינ\'',
        floorPlaceholder: 'רצפה %',
        payment: 'תשלום',
        contract: 'חוזה',
        asset: 'נכס',
        guaranteesLabel: 'ערבויות',
        dataSummary: 'סיכום נתונים',
        selectRooms: 'בחירת חדרים',
        securityAndAppendices: 'ביטחונות ונספחים',
        securityDeposit: 'פיקדון כספי',
        guarantors: 'ערבים',
        guarantorName: 'שם הערב',
        addGuarantor: 'הוסף ערב',
        addGuarantor_female: 'הוסיפי ערב',
        noGuarantors: 'אין ערבים',
        all: 'הכל',
        active: 'פעיל',
        archived: 'בארכיון',
        ACTIVE: 'פעיל',
        ARCHIVED: 'בארכיון',
        searchPlaceholderContracts: 'חיפוש לפי דייר, כתובת או עיר...',
        upgradeRequired: 'שדרוג נדרש',
        limitReachedDesc: 'הגעת למגבלת היצירה בתוכנית הנוכחית. שדרג את התוכנית כדי להמשיך.',
        upgradeNow: 'שדרג עכשיו',
        days: 'ימים',
        error_missing_id: 'שגיאת מערכת: מזהה חוזה חסר',
        baseIndex: 'מדד בסיס',
        noContractsFound: 'לא נמצאו חוזים',
        noPropertiesFound: 'לא נמצאו נכסים',
        noTenantsFound: 'לא נמצאו דיירים',
        needsPainting: 'האם נדרשת צביעה בעת פינוי הנכס?',

        // Coming Soon Waitlist

        language_toggle: 'English',

        needsPaintingDesc: '',
        specialClausesPlaceholder: 'הכנס תנאים מיוחדים כאן...',
        guarantees: 'ביטחונות',
        guaranteesPlaceholder: 'פרטי צקים, צק ביטחון, ערבות בנקאית וכו׳',
        indexWatcherDesc: 'עקוב אחרי מדדי מחירים לצרכן ושירותי דיור להצמדת חוזים מושכלת.',
        baseRentWarning: 'יש להזין סכום להצמיד',
        linkageCalculated: 'עדכון ההצמדה חושב',
        indexPulseFailed: 'כישלון בעדכון המדדים',
        noLinkage: 'ללא הצמדה',
        cpi: 'מדד המחירים לצרכן',
        housing: 'מדד שירותי דיור',
        construction: 'מדד תשומות הבנייה',
        cpiAbbr: 'מדד',
        housingAbbr: 'דיור',

        // Regions and Districts
        'Northern District': 'מחוז הצפון',
        'Haifa District': 'מחוז חיפה',
        'Central District': 'מחוז המרכז',
        'Tel Aviv District': 'מחוז תל אביב',
        'Jerusalem District': 'מחוז ירושלים',
        'Southern District': 'מחוז הדרום',
        'Judea and Samaria': 'יהודה ושומרון',
        'North': 'צפון',
        'South': 'דרום',
        'Center': 'מרכז',
        fiveYears: '5 שנים',
        mom: 'חודשי',
        // Quick Actions: 'מדד תשומות הבנייה',
        usd: 'דולר ארה"ב',
        eur: 'אירו',
        unnamed: 'ללא שם',
        upcoming_payment: 'תשלום קרוב',
        contract_status_updated: 'סטטוס חוזה עודכן',
        contract_expiry: 'סיום חוזה',
        tenantForm: 'טופסי הרשמה',
        tenantForms: 'טופסי הרשמה',
        tenantFormsDesc: 'ניהול שאלוני הרשמה ופרטי שוכרים',
        createDocumentFolder: 'צור תיקיית מסמכים',
        noDocumentsFound: 'לא נמצאו מסמכים',
        startByAddingAbove: 'התחל על ידי הוספת מסמך למעלה',
        createTenantSignLink: 'יצירת קישור הרשמה לדייר',
        tenantLinkCopied: 'ביצוע מוצלח, הקישור הועתק!',
        copyLinkError: 'שגיאה בהעתקת הקישור',
        last_updated: 'עודכן לאחרונה',
        try_rentmate_free: 'נסו עכשיו בחינם!',
        hero_title_legal: 'כלים משפטיים למשכירים',
        hero_desc_legal: 'ודאו שהחוזים שלכם חסינים מבחינה משפטית ובטוחים.',
        cta_button_legal: 'ליצירת חוזה',
        hero_title_tax: 'מחשבון ההצמדות',
        hero_desc_tax: 'חשבו בזמן אמת ונהלו את השכירות עם המדד העדכני.',
        cta_button_tax: 'למחשבון',
        hero_title_generic: 'לסיים את הבלאגן',
        hero_desc_generic: 'כלי הניהול החכם והמוביל למשכירים בישראל.',
        cta_button_generic: 'התחל עכשיו',
        article_not_found: 'המאמר לא נמצא',
        back_to_knowledge_base: 'חזרה למרכז הידע',
    },
    en: {
        noActiveContract: 'No active contract',
        appName: 'RentMate',
        addNew: 'Renty, what would you like to do?',
        select_action_to_continue: 'Select a quick action to continue',
        addTrackedIndex: 'Add Tracked Index',
        commandCenterUpdates: 'I have {count} new updates for you.',
        commandCenterAllClear: 'Everything looks great. No pending tasks.',
        linkageMethod: 'Linkage Method',
        knownIndex: 'Known Index',
        determiningIndex: 'Determining Index',
        rentySuggestsAction: 'RENTY SUGGESTS ACTION',
        monthly: 'Monthly',
        bimonthly: 'Bimonthly',
        quarterly: 'Quarterly',
        semiannually: 'Semiannually',
        annually: 'Annually',
        welcomeMessage: 'Welcome to RentMate',
        welcomeMessageDashboard: 'good evening',
        commandCenter: 'Command Center',
        goodMorning: 'good morning',
        goodAfternoon: 'good afternoon',
        goodEvening: 'good evening',
        goodNight: 'good night',
        conciergeAiExtraction: 'Smart AI Extraction',
        conciergeLinkageMonitoring: 'Automatic Linkage Alerts',
        receipts: 'Receipts',
        all: 'All',
        active: 'Active',
        archived: 'Archived',
        ACTIVE: 'Active',
        ARCHIVED: 'Archived',
        candidates: 'Candidates',
        legal_management: 'Legal Management',
        active_contract: 'Active Contract',
        archived_contract: 'Archived Contract',
        cancelled: 'Cancelled',
        view_details: 'View Details',
        actions: 'Actions',
        logPayment: 'Log Payment',
        quickAction: 'Quick Action',
        addExpense: 'Add Expense',
        maintenanceRequest: 'Maintenance Request',
        messageTenant: 'Message Tenant',
        cancel: 'Cancel',
        selectOption: 'Select an option...',
        pickDate: 'Pick a date',
        selectDate: 'Select Date',
        errorTitle404: 'Oops! Page Not Found',
        errorDesc404: "Sorry, the page you're looking for doesn't exist or has been moved.",
        errorTitle500: 'Something Went Wrong',
        errorDesc500: "An unexpected error occurred. Our technical team has been notified and is on it.",
        backToHome: 'Back to Home',
        totalRevenueLTM: 'Total Revenue',
        reportToAdmin: 'Report to Admin',
        reporting: 'Reporting...',
        reportSuccess: 'Report sent successfully',
        reportError: 'Failed to send report',
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
        'Beer Sheba': 'Beer Sheba',
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
        'Akko': 'Akko',
        'Afula': 'Afula',
        'Arad': 'Arad',
        'Ashkelon': 'Ashkelon',
        'Beit Shemesh': 'Beit Shemesh',
        'Bet Shemesh': 'Beit Shemesh',
        'Central': 'Central',
        'Dimona': 'Dimona',
        'Eilat': 'Eilat',
        'Elad': 'Elad',
        'Givatayim': 'Givatayim',
        'Hod HaSharon': 'Hod HaSharon',
        'Karmiel': 'Karmiel',
        'Kfar Yona': 'Kfar Yona',
        'Kiryat Ata': 'Kiryat Ata',
        'Kiryat Bialik': 'Kiryat Bialik',
        'Kiryat Gat': 'Kiryat Gat',
        'Kiryat Malakhi': 'Kiryat Malakhi',
        'Kiryat Motzkin': 'Kiryat Motzkin',
        'Kiryat Ono': 'Kiryat Ono',
        'Kiryat Shmona': 'Kiryat Shmona',
        'Kiryat Yam': 'Kiryat Yam',
        'Ma\'ale Adumim': 'Ma\'ale Adumim',
        'Migdal HaEmek': 'Migdal HaEmek',
        'Modi\'in Illit': 'Modi\'in Illit',
        'Nahariya': 'Nahariya',
        'Nazareth Illit': 'Nazareth Illit',
        'Nof HaGalil': 'Nof HaGalil',
        'Nes Ziona': 'Nes Ziona',
        'Ness Ziona': 'Nes Ziona',
        'Netivot': 'Netivot',
        'Ofakim': 'Ofakim',
        'Or Akiva': 'Or Akiva',
        'Or Yehuda': 'Or Yehuda',
        'Ramat HaSharon': 'Ramat HaSharon',
        'Rosh HaAyin': 'Rosh HaAyin',
        'Safed': 'Safed',
        'Sderot': 'Sderot',
        'Tamra': 'Tamra',
        'Tayibe': 'Tayibe',
        'Tiberias': 'Tiberias',
        'Tirat Carmel': 'Tirat Carmel',
        'Umm al-Fahm': 'Umm al-Fahm',
        'Yavne': 'Yavne',
        'Yehud-Monosson': 'Yehud-Monosson',
        'Yokneam Illit': 'Yokneam Illit',
        'Zefat': 'Safed',
        indexByDate: 'Index by Date',
        manualRate: 'Manual Rate',
        legalProtection: 'Legal Safe Suite',
        timePeriod: 'Time Period',
        resetFilters: 'Reset Filters',
        allTime: 'All Time',
        last3Months: 'Last 3 Months',
        last6Months: 'Last 6 Months',
        lastYear: 'Last Year',
        upgradeToUnlock: 'Upgrade to Unlock',
        needsPaintingQuery: 'Repainting required upon evacuation?',
        transfer: 'Bank Transfer',
        check: 'Checks',
        checks: 'Checks',
        cash: 'Cash',
        bit: 'Bit',
        paybox: 'PayBox',
        other: 'Other',
        contractReadySummary: 'Contract is Ready!',
        contractReadySummaryDesc: 'The contract for {address}, {city} is ready to be created.',
        saveContractFileQuery: 'Save contract file?',
        storageUsage: 'Storage Usage',
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
        monthlyRentLabel: 'Current Rent',
        currentRent: 'Current Rent',
        projectedRent: 'Projected Rent',
        autoDetectContracts: 'Auto Detect Contracts',
        autoDetectContractsDesc: 'Show projections for your assets',
        marketIndicesToTrack: 'Market Indices to Track',
        track: 'Track',
        baseDateOptional: 'Base Date (Optional)',
        unknownProperty: 'Unknown Property',
        selectDisplayedIndices: 'Select Displayed Indices',
        noLinkage: 'No Linkage',
        cpi: 'CPI',
        housing: 'Housing',
        construction: 'Construction',
        usd: 'USD',
        eur: 'EUR',
        linkedToCpi: 'CPI',
        linkedToHousing: 'Housing Index',
        linkedToUsd: 'Linked to USD',
        linkedToEur: 'Linked to EUR',
        linkedToConstruction: 'Linked to Construction',
        whereIsItLocated: 'Where is it located?',
        tellUsAboutProperty: 'Tell us about the property.',
        fetchingStreetView: 'Fetching Street View...',
        clickToUploadPicture: 'Click to upload picture',
        dateRange: 'Date Range',
        sqm: 'SQM',
        uploading_ellipsis: 'Uploading...',
        baseDateRequired: 'Base index date is required',
        summaryDetails: 'Summary Details',
        leasePeriod: 'Lease Period',
        linkage: 'Linkage',
        baseDate: 'Base Date',
        property: 'Property',
        tenant: 'Tenant',
        garden: 'Garden Apartment',
        optionNoticeDays: 'Option Notice (days)',
        optionReminderDays: 'Reminder before Notice (days)',
        hasParking: 'Parking',
        hasStorage: 'Storage',
        hasBalcony: 'Balcony',
        hasSafeRoom: 'Safe Room',
        guarantorsInfo: 'Guarantors Info',
        specialClauses: 'Special Clauses',
        paintingIncluded: 'Painting Included',
        infrastructure: 'Property & Infrastructure',
        parties: 'Parties',
        timeline: 'Timeline',
        additionalDetails: 'Additional Details',
        customizeDashboard: 'Customize Dashboard',
        customizeDashboardDesc: 'Reorder and hide widgets based on your needs',
        visible: 'Visible',
        hidden: 'Hidden',
        usage_overview_title: 'Resource Overview',
        index_pulse: 'Index Pulse',
        smart_actions_title: 'Smart Actions',
        digital_protocol_title: 'Digital Protocol',
        digital_protocol_subtitle: 'Digital handover protocol for move-in/out',
        quick_actions_title: 'Quick Actions',
        prospective_tenants_title: 'Prospective Tenants',
        prospective_tenants_subtitle: 'Prepare for new tenants',
        rental_trends_title: 'Market Trends',

        // Plans
        free: 'SOLO',
        pro: 'MATE',
        solo: 'SOLO',
        mate: 'MATE',
        master: 'MASTER',
        unlimited: 'Unlimited',
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
        paymentBank: 'Bank',
        paymentBranch: 'Branch',
        paymentAccount: 'Account',
        paymentCheckNum: 'Check Number',
        paymentNote: 'Note',
        paymentReceipt: 'Reference / Receipt',
        paymentUploadReceipt: 'Upload Reference (Image/PDF)',
        paymentReceiptAttached: 'Reference Attached',
        paymentMethodDetails: 'Method Details',
        paymentDetailsTitle: 'Payment Method Details',
        paymentPhoneNumber: 'Phone Number',
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

        cardsView: 'Cards View',
        tableView: 'Table View',
        actionNeeded: 'Action Needed',
        upcomingAndPaid: 'Upcoming & Paid',
        unnamedTenant: 'Unnamed Tenant',

        approveAndCreate: 'Approve & Create',
        paymentMarkedPaid: 'Payment marked as paid',
        paymentUndoSuccess: 'Action undone',
        undo: 'Undo',

        tooltipIndexBaseMinText: 'When enabled, if the price index at calculation is lower than the base index, the calculation treats it as if it didn\'t drop.',
        tooltipIndexBaseMinExample: 'If base index was 100 and dropped to 98, rent won\'t decrease.',
        tooltipPartialLinkageText: 'Link only a portion of the rent to the index.',
        tooltipPartialLinkageExample: 'Rent 5,000 with 80% linkage means only 4,000 is affected by index changes.',
        tooltipMaxIncreaseText: 'Caps the maximum annual rent increase to protect against high index jumps.',
        tooltipMaxIncreaseExample: 'A 5% yearly cap means rent won\'t increase by more than 2.5% after 6 months.',
        exampleLabel: 'Example:',
        howItWorksTitle: 'Advanced Reconciliation',
        reconciliationInfoText: 'This calculator checks the payment gap over time. Enter the actual payments made, and the system will compare them against what should have been paid (inclusive of index linkage calculations). Finally, you will receive an accurate debt or credit report.',
        tooltipLinkageTypeText: 'The type of index to link the amount to. Consumer Price Index (CPI) is the most common.',
        tooltipLinkageCalculationMethodText: 'Known index: uses the index available before payment. Determining index: uses the index for the payment month, regardless of publish date.',
        tooltipBaseIndexDateText: 'The date that sets the base index against which all linkage gaps are calculated, usually the contract sign date.',
        tooltipPeriodStartText: 'The historical month from which linkage gaps begin to accumulate.',
        tooltipPeriodEndText: 'The final month in the assessed retroactive timeframe.',
        tooltipGenerateListText: 'Autofills the payment table. The system generates a payment row for each month within the date range defined below (Start and End Period), using your expected base rent. You must configure the period dates first.',
        tooltipExpectedPaymentsText: 'The original required base payment per month, excluding index linkage.',
        tooltipActualPaymentsText: 'The payments actually made compared to the expected. Gap between expected and actual forms the debt.',
        advancedCalculatorExplanation: 'The reconciliation calculator produces an organized debt table measuring all accumulated gaps from historical rent payments paid without the required contractual index linkage.',
        errorMarkingPaid: 'Error marking as paid',
        back: 'Back',
        amountGreaterThanZero: 'Amount must be greater than zero',
        dueDateRequired: 'Due date is required',
        methodRequired: 'Payment method is required',
        errorFetchingContracts: 'Error fetching contracts',
        paymentLinkedToPending: 'Payment linked to expected payment!',
        savingPayment: 'Saving payment...',
        paymentSavedSuccess: 'Payment saved successfully!',
        addAnotherReady: 'Ready for another payment',
        errorSavingPayment: 'Error saving payment',
        linkToExpectedPayment: 'LINK TO EXPECTED PAYMENT',
        bestMatch: 'BEST MATCH',
        linkedToPaymentOf: 'Linked to payment of',
        addAnother: 'Add Another',
        sessionAdded: 'Added in session',
        rooms: 'Rooms',
        amenities: 'Amenities',
        parking: 'Parking',
        storage: 'Storage',
        selectRooms: 'Select Rooms',
        'Northern District': 'Northern District',
        'Haifa District': 'Haifa District',
        'Central District': 'Central District',
        'Tel Aviv District': 'Tel Aviv District',
        'Jerusalem District': 'Jerusalem District',
        'Southern District': 'Southern District',
        'Judea and Samaria': 'Judea and Samaria',
        'North': 'North',
        'South': 'South',
        'Center': 'Center',
        next3Months: 'Next 3 Months',
        next6Months: 'Next 6 Months',
        nextYear: 'Next Year',
        currentWindow: 'Current Window (-1m to +3m)',
        sortOldestFirst: 'Oldest to Newest',
        sortNewestFirst: 'Newest to Oldest',
        fillRequiredFields: 'Please fill all required fields',
        contractSavedSuccess: 'Contract saved successfully',
        errorSavingContract: 'Error saving contract',
        searchPlaceholderContracts: 'Search by tenant, address or city...',
        searchPlaceholderProperties: 'Search by address or city...',
        total: 'Total',
        securityAndAppendices: 'Security & Appendices',
        securityDeposit: 'Security Deposit',
        guarantors: 'Guarantors',
        guarantorName: 'Guarantor Name',
        addGuarantor: 'Add Guarantor',
        noGuarantors: 'No Guarantors',
        stepAsset: 'Asset',
        stepTenant: 'Tenants',
        stepPeriods: 'Periods',
        stepPayments: 'Payments',
        stepSecurity: 'Security',
        stepSummary: 'Summary',
        base_rent: 'Base Rent',
        noAssetsFound: 'No assets found',
        contractPeriod: 'Contract Period',
        duration: 'Duration',
        securityAndExtras: 'Security & Extras',
        upgradeRequired: 'Upgrade Required',
        limitReachedDesc: 'You have reached the creation limit for your current plan. Please upgrade to continue.',
        upgradeNow: 'Upgrade Now',
        days: 'days',
        balcony: 'Balcony',
        safeRoom: 'Safe Room',
        error_missing_id: 'System Error: Missing Contract ID',
        baseIndex: 'Base Index',
        noIndexHistory: 'No historical index records to display yet',
        noIndexHistoryDesc: 'Waiting for automatic monthly updates...',
        cpiAbbr: 'CPI',
        housingAbbr: 'HOU',
        '3Y': '3 Years',
        '4Y': '4 Years',

        // Feature KeysPlaceholder: 'Enter special clauses here...',
        guarantees: 'Guarantees',
        guaranteesPlaceholder: 'Details of bills, security check, bank guarantee, etc.',
        noOptionsDefined: 'No options defined',
        auth_welcome_back: 'Welcome back!',
        auth_join: 'Join us',
        auth_password: 'Password',
        auth_forgot_password: 'Forgot password?',
        auth_sign_in: 'Sign in',
        auth_sign_up: 'Sign up now',
        auth_create_account: 'Create account',
        auth_or_continue: 'Or continue with',
        auth_no_account: "Don't have an account?",
        auth_have_account: 'Already have an account?',
        auth_check_inbox: 'Check your inbox!',
        auth_confirmation_sent: 'We sent a confirmation email to {email}',
        auth_invalid_credentials: 'Invalid login credentials',
        auth_email_not_confirmed: 'Email not confirmed yet',
        agreeToTerms: 'I agree to the {terms} and {privacy}, including explicit consent for data processing by Artificial Intelligence (AI).',
        noTenantsFound: 'No tenants found',
        upcoming_payment: 'Upcoming Payment',
        contract_status_updated: 'Contract Status Updated',

        // Coming Soon Waitlist
        coming_soon_title: 'The New Era of Property Management',
        coming_soon_subtitle: 'We are building an advanced AI platform for property and tenant management. Join the waitlist to be notified!',
        coming_soon_feature_1: 'AI integrations for smart contracts',
        coming_soon_feature_2: 'Reminders and recommendations for increased efficiency',
        coming_soon_feature_3: 'Automated financial tracking dashboard',
        coming_soon_name_label: 'Full Name (Required)',
        coming_soon_email_label: 'Email (Required)',
        coming_soon_phone_label: 'Phone (Optional)',
        coming_soon_cta: 'Join the Waitlist',
        coming_soon_success: 'Thanks for signing up! We will notify you soon.',
        coming_soon_error: 'An error occurred. Please try again later.',
        coming_soon_already_registered: 'Thank you! This email is already on our list.',
        coming_soon_ip_protection: 'RentMate, Renty the Raccoon, the software, AI algorithms, and UI designs are protected intellectual property. Unauthorized reproduction or use is strictly prohibited.',
        coming_soon_slide_1_title: 'Advanced Contract Management',
        coming_soon_slide_1_desc: 'Dynamic tracking of end dates, options, and all contract details.',
        coming_soon_slide_2_title: 'Smart Indexation Calculator',
        coming_soon_slide_2_desc: 'Accurate CPI-linked rent calculation with the click of a button.',
        coming_soon_slide_3_title: 'Automated Financial Tracking',
        coming_soon_slide_3_desc: 'Full control over payments, debts, and income from all properties together.',
        coming_soon_slide_4_title: 'Personal A.I. Assistant',
        coming_soon_slide_4_desc: 'Data analysis, insight generation, and automated property management using artificial intelligence.',
        language_toggle: 'עברית',
        contract_expiry: 'Contract Expiry',
        overdue_payment: 'Overdue Payment',
        fiveYears: '5Y',
        mom: 'MoM',
        addTenant: 'Add Tenant',
        addTenant_female: 'Add Tenant',
        tenantForm: 'Tenant Forms',
        tenantForms: 'Tenant Forms',
        tenantFormsDesc: 'Managing tenant sign up forms and details',
        createDocumentFolder: 'Create Document Folder',
        noDocumentsFound: 'No documents found',
        startByAddingAbove: 'Start by adding a document above',
        createTenantSignLink: 'Create Tenant Link',
        tenantLinkCopied: 'Success, link copied!',
        copyLinkError: 'Error copying link',
        last_updated: 'Last Updated',
        try_rentmate_free: 'Try RentMate Free!',
        hero_title_legal: 'Legal Tools for Landlords',
        hero_desc_legal: 'Ensure your contracts are bulletproof and secure.',
        cta_button_legal: 'Create Contract',
        hero_title_tax: 'Linkage Calculator',
        hero_desc_tax: 'Calculate rent linkage in real time with the latest data.',
        cta_button_tax: 'Open Calculator',
        hero_title_generic: 'End the Mess',
        hero_desc_generic: 'The ultimate smart management tool for landlords.',
        cta_button_generic: 'Start Now',
        article_not_found: 'Article not found',
        back_to_knowledge_base: 'Back to Knowledge Base',
    }
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
