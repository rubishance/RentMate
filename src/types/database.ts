export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Property {
    id: string;
    address: string;
    city: string;
    title?: string;
    rooms: number;
    size_sqm: number;
    rent_price: number;
    status: 'Occupied' | 'Vacant';
    image_url?: string;
    has_parking?: boolean;
    has_storage?: boolean;
    property_type?: 'apartment' | 'penthouse' | 'garden' | 'house' | 'other';
    created_at?: string;
}

export type DocumentCategory =
    | 'photo'
    | 'video'
    | 'utility_water'
    | 'utility_electric'
    | 'utility_gas'
    | 'utility_municipality'
    | 'utility_management'
    | 'maintenance'
    | 'invoice'
    | 'receipt'
    | 'insurance'
    | 'warranty'
    | 'legal'
    | 'other';

export interface DocumentFolder {
    id: string;
    property_id: string;
    category: string; // 'utility_electric', 'maintenance', 'media', 'other'
    name: string;
    folder_date: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface PropertyDocument {
    id: string;
    user_id: string;
    property_id: string;
    folder_id?: string | null; // New field
    category: DocumentCategory;
    storage_bucket: string;
    storage_path: string;
    file_name: string;
    file_size?: number;
    mime_type?: string;
    title?: string;
    description?: string;
    tags?: string[];
    document_date?: string;
    period_start?: string;
    period_end?: string;
    amount?: number;
    currency?: string;
    paid?: boolean;
    payment_date?: string;
    vendor_name?: string;
    invoice_number?: string;
    issue_type?: string;
    created_at: string;
    updated_at?: string;
}

export interface UserStorageUsage {
    user_id: string;
    total_bytes: number;
    file_count: number;
    media_bytes: number;
    utilities_bytes: number;
    maintenance_bytes: number;
    documents_bytes: number;
    last_calculated_at: string;
    updated_at: string;
}

// AI Extraction Types
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ExtractedField {
    fieldName: keyof Omit<Contract, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'contract_file_url' | 'contract_file_name' | 'ai_extracted' | 'ai_extraction_data'> | 'linkageCeiling' | 'buildingNum' | 'aptNum' | 'paymentFrequency' | 'tenantName' | 'tenantId' | 'tenantEmail' | 'tenantPhone' | 'landlordName' | 'landlordId' | 'landlordPhone' | 'address' | 'city' | 'street' | 'rooms' | 'floor' | 'hasParking' | 'hasStorage' | 'size' | 'rent' | 'paymentDay' | 'securityDeposit' | 'guaranteeType' | 'startDate' | 'endDate' | 'signingDate' | 'linkageType' | 'indexCalculationMethod' | 'baseIndexDate' | 'baseIndexValue' | 'indexLimitType' | 'renewalOption' | 'petsAllowed' | 'guarantorsInfo' | 'specialClauses';
    extractedValue: string | number | null | boolean | any;
    sourceText?: string; // Actual excerpt from contract
    confidence: ConfidenceLevel;
    pageNumber?: number;
    userConfirmed: boolean;
    manuallyOverridden: boolean;
    confidenceScore?: number; // 0-100
}

export interface ContractExtractionResult {
    fields: ExtractedField[];
    rawContractText: string;
    processingTimestamp: string;
    disclaimerAccepted: boolean;
    disclaimerAcceptedAt: string | null;
}

export interface Tenant {
    id: string;
    name: string; // Display name or First name
    full_name?: string; // DB column often 'full_name'
    email?: string;
    phone?: string;
    id_number?: string;
    property_id?: string | null;
    status?: 'active' | 'past' | 'lead';
    created_at?: string;
}

export interface Contract {
    id: string; // UUID
    created_at: string;
    property_id: string;
    tenant_id: string;
    status: 'active' | 'archived';

    // Dates
    signing_date: string;
    start_date: string;
    end_date: string;

    // Financials
    base_rent: number;
    currency: 'ILS' | 'USD' | 'EUR';
    payment_frequency: 'monthly' | 'quarterly' | 'annually';
    payment_day: number;

    // Linkage
    linkage_type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur' | 'none';
    base_index_date: string | null;
    base_index_value: number | null;
    linkage_sub_type?: 'known' | 'respect_of' | 'base' | null;
    linkage_ceiling?: number | null;
    linkage_floor?: number | null;

    // Security
    security_deposit_amount: number;

    // AI Extraction metadata
    ai_extracted: boolean;
    ai_extraction_data: ContractExtractionResult | null;
    contract_file_url: string | null; // Supabase storage URL
    contract_file_name: string | null;
    needs_painting?: boolean;
    notice_period_days?: number | null;
    option_notice_days?: number | null;
    option_periods?: {
        length: number;
        unit: 'months' | 'years';
        rentAmount?: number;
        currency?: 'ILS' | 'USD' | 'EUR';
    }[];
    rent_periods?: {
        startDate: string;
        amount: number;
        currency: 'ILS' | 'USD' | 'EUR';
    }[];
    tenants?: {
        name: string;
        id_number?: string;
        email?: string;
        phone?: string;
    }[];
}

// ============================================
// Calculator Types
// ============================================

export interface IndexData {
    id?: string;
    index_type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    date: string; // 'YYYY-MM'
    value: number;
    source: 'cbs' | 'exchange-api' | 'manual';
    created_at?: string;
}

export interface IndexBase {
    id: string;
    index_type: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    base_period_start: string; // 'YYYY-MM-DD'
    base_value: number; // Usually 100.0 or something
    chain_factor: number; // The factor to multiply when crossing INTO this base from previous
    description?: string; // e.g., "Basis 2022"
}

export interface StandardCalculationInput {
    baseRent: number;
    linkageType: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    baseDate: string; // 'YYYY-MM'
    targetDate: string; // 'YYYY-MM'
    partialLinkage?: number; // Default 100 (full linkage)
    manualBaseIndex?: number; // Override auto-fetch
    manualTargetIndex?: number; // Override auto-fetch
    isIndexBaseMinimum?: boolean; // If true, rent cannot drop below base amount
}

export interface StandardCalculationResult {
    newRent: number;
    baseIndexValue: number;
    targetIndexValue: number;
    linkageCoefficient: number; // מקדם קישור (percentage)
    percentageChange: number;
    absoluteChange: number;
    formula: string;
    indexSource: string;
}

export interface ReconciliationInput {
    baseRent: number;
    linkageType: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
    contractStartDate: string; // 'YYYY-MM'
    periodStart: string; // 'YYYY-MM'
    periodEnd: string; // 'YYYY-MM'
    actualPaidPerMonth?: number;
    monthlyActuals?: Record<string, number>;
    partialLinkage?: number; // Default 100
    // Advanced Options
    linkageSubType?: 'known' | 'respect_of'; // known = מדד ידוע (default), respect_of = מדד בגין
    updateFrequency?: 'monthly' | 'quarterly' | 'semiannually' | 'annually'; // Default 'monthly'
    isIndexBaseMinimum?: boolean; // If true, index cannot drop below base index (effective floor of 0%)
    maxIncreasePercentage?: number; // Ceiling (e.g., 5% max increase per year)
    monthlyBaseRent?: Record<string, number>; // Specific base rent per month
}

export interface MonthlyPayment {
    month: string; // 'YYYY-MM'
    shouldHavePaid: number;
    actuallyPaid: number;
    difference: number;
    indexValue: number;
    linkageCoefficient: number; // מקדם קישור for this month
}

export interface ReconciliationResult {
    totalBackPayOwed: number;
    monthlyBreakdown: MonthlyPayment[];
    totalMonths: number;
}

// ============================================
// User Preferences Types
// ============================================

export type Language = 'he' | 'en';
export type Gender = 'male' | 'female' | 'unspecified';
export type Theme = 'light' | 'dark' | 'system';

export interface UserPreferences {
    language: Language;
    gender: Gender | null; // null when language is not Hebrew
    theme: Theme;
    ai_data_consent?: boolean;
}

// ============================================
// User Management Types
// ============================================

export type UserRole = 'user' | 'admin' | 'manager';
export type SubscriptionStatus = 'active' | 'suspended';
// Legacy enum, keeping for type safety in old code until migrated
export type SubscriptionPlan = 'free_forever' | 'custom_enterprise' | 'free' | 'pro' | 'enterprise';

export interface SubscriptionPlanDef {
    id: string;
    name: string;
    price_monthly: number;
    max_properties: number;
    max_tenants: number;
    max_contracts: number;
    max_sessions: number;
    features: Record<string, any>;
    created_at?: string;
}

export interface UserProfile {
    id: string; // UUID from auth.users
    email: string;
    full_name: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    phone?: string;

    // Permissions
    is_super_admin?: boolean;

    // Subscription & Plan
    subscription_status: SubscriptionStatus;
    subscription_plan?: SubscriptionPlan; // Legacy
    plan_id?: string; // New DB reference

    // Notification Settings
    notification_preferences?: {
        contract_expiry_days: number;
        rent_due_days: number;
        extension_option_days: number;
        extension_option_end_days: number;
    };

    // Minimal payment info
    payment_provider: string; // 'none'

    // Status & Activity
    is_active: boolean;
    last_login: string | null;

    created_at: string;
    updated_at: string;
}

export type CrmInteractionType = 'note' | 'call' | 'email' | 'support_ticket';

export interface CrmInteraction {
    id: number;
    user_id: string;
    admin_id: string | null;
    type: CrmInteractionType;
    title: string | null;
    content: string | null;
    status: string; // 'open', 'closed'
    created_at: string;
}

export interface AuditLog {
    id: number;
    user_id: string; // Who performed the action
    target_user_id: string | null; // Who was affected
    action: string;
    details: any; // JSONB
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;

    // Optional joined fields
    performer_email?: string;
}

export interface Invoice {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'void';
    issue_date: string;
    pdf_url: string | null;
    created_at: string;
}

export interface SubscriptionHistory {
    id: number;
    user_id: string;
    old_plan: SubscriptionPlan | null;
    new_plan: SubscriptionPlan | null;
    change_reason: string;
    changed_by: string | null;
    created_at: string;
}

export interface Payment {
    id: string; // UUID
    contract_id: string;
    amount: number;
    currency: 'ILS' | 'USD' | 'EUR';
    due_date: string;
    status: 'paid' | 'pending' | 'overdue' | 'cancelled';
    paid_date: string | null;
    payment_method: string | null;
    reference: string | null;
    created_at: string;
    collection_status?: string; // e.g. "sent_to_bank"
    original_amount?: number;
    index_linkage_rate?: number;
    paid_amount?: number;
}

export interface Notification {
    id: string; // UUID
    user_id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
}

export interface SavedCalculation {
    id: string;
    user_id: string | null;
    input_data: any; // Using any for flexibility with JSONB, or we could define specific types
    result_data: any;
    created_at: string;
}
