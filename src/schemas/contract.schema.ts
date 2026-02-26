import { z } from 'zod';

/**
 * Tenant Schema
 */
const tenantSchema = z.object({
    name: z.string().min(1, 'tenantNameRequired'),
    id_number: z.string().optional(),
    email: z.string().email('invalidEmail').optional().or(z.literal('')),
    phone: z.string().optional(),
});

/**
 * Rent Step Schema
 */
const rentStepSchema = z.object({
    startDate: z.string().min(1, 'dateRequired'),
    amount: z.coerce.number().positive('amountGreaterThanZero').optional().or(z.null()),
    currency: z.enum(['ILS']),
});

/**
 * Option Period Schema
 */
const optionPeriodSchema = z.object({
    endDate: z.string().min(1, 'dateRequired'),
    rentAmount: z.coerce.number().positive('amountGreaterThanZero').optional().or(z.null()),
    currency: z.enum(['ILS']).optional(),
    noticeDays: z.coerce.number().optional(),
    reminderDays: z.coerce.number().optional()
});

/**
 * Contract Wizard Schema
 * This schema covers all 6 steps of the Add Contract flow.
 */
export const contractSchema = z.object({
    // Step 1: Asset
    isExistingProperty: z.boolean(),
    selectedPropertyId: z.string().optional(),
    city: z.string().optional(),
    address: z.string().optional(),
    rooms: z.coerce.number().optional().or(z.null()),
    size: z.coerce.number().optional().or(z.null()),
    image_url: z.string().optional(),
    hasParking: z.boolean().default(false),
    hasStorage: z.boolean().default(false),
    hasBalcony: z.boolean().default(false),
    hasSafeRoom: z.boolean().default(false),
    property_type: z.enum(['apartment', 'penthouse', 'garden', 'house', 'other']).default('apartment'),

    // Step 2: Tenants
    tenants: z.array(tenantSchema).min(1, 'atLeastOneTenant'),

    // Step 3: Periods
    startDate: z.string().min(1, 'startDateRequired'),
    endDate: z.string().min(1, 'endDateRequired'),
    signingDate: z.string().optional(),
    optionPeriods: z.array(optionPeriodSchema).default([]),
    optionNoticeDays: z.coerce.number().optional(),

    // Step 4: Payments
    rent: z.coerce.number().positive('rentRequired'),
    currency: z.enum(['ILS']).default('ILS'),
    paymentFrequency: z.enum(['Monthly', 'Bimonthly', 'Quarterly', 'Semiannually', 'Annually']).default('Monthly'),
    paymentDay: z.coerce.number().min(1).max(31).default(1),
    paymentMethod: z.enum(['checks', 'transfer', 'cash', 'bit', 'paybox', 'other']).optional().or(z.literal('')),
    rentSteps: z.array(rentStepSchema).default([]),

    // Linkage
    linkageType: z.enum(['cpi', 'housing', 'construction', 'none']).default('none'),
    linkageSubType: z.enum(['known', 'respect_of', 'base']).default('known'),
    baseIndexDate: z.string().optional(),
    baseIndexValue: z.coerce.number().optional(),
    linkageCeiling: z.coerce.number().optional(),
    linkageFloor: z.coerce.number().optional(),
    hasLinkageCeiling: z.boolean().default(false),

    // Step 5: Security & Specs
    securityDeposit: z.coerce.number().optional(),
    guarantees: z.string().optional(),
    guarantorsInfo: z.string().optional(),

    specialClauses: z.string().optional(),
    needsPainting: z.boolean().default(false),

    // UI state
    hasLinkage: z.boolean().default(false),
}).refine((data) => {
    if (!data.isExistingProperty) {
        return !!data.address && !!data.city;
    }
    return !!data.selectedPropertyId;
}, {
    message: 'propertyRequired',
    path: ['selectedPropertyId']
}).refine((data) => {
    if (data.hasLinkage) {
        return !!data.baseIndexDate;
    }
    return true;
}, {
    message: 'baseDateRequired',
    path: ['baseIndexDate']
}).refine((data) => {
    if (data.hasLinkage) {
        return data.linkageType !== 'none';
    }
    return true;
}, {
    message: 'indexTypeRequired',
    path: ['linkageType']
});

export type ContractFormData = z.infer<typeof contractSchema>;
