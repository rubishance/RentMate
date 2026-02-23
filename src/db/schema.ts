import { pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const propertyStatusEnum = pgEnum('property_status', ['Occupied', 'Vacant']);
export const contractStatusEnum = pgEnum('contract_status', ['active', 'archived']);
export const currencyEnum = pgEnum('currency', ['ILS', 'USD', 'EUR']);
export const paymentFrequencyEnum = pgEnum('payment_frequency', ['monthly', 'quarterly', 'annually']);
export const linkageTypeEnum = pgEnum('linkage_type', ['cpi', 'housing', 'construction', 'usd', 'eur', 'none']);
export const paymentStatusEnum = pgEnum('payment_status', ['paid', 'pending', 'overdue', 'cancelled']);

// Properties Table
export const properties = pgTable('properties', {
    id: uuid('id').primaryKey().defaultRandom(),
    address: text('address').notNull(),
    city: text('city').notNull(),
    rooms: integer('rooms').notNull(),
    size_sqm: integer('size_sqm').notNull(),
    image_url: text('image_url'),
    has_parking: boolean('has_parking').default(false),
    has_storage: boolean('has_storage').default(false),
    has_balcony: boolean('has_balcony').default(false),
    has_safe_room: boolean('has_safe_room').default(false),
    has_elevator: boolean('has_elevator').default(false),
    is_accessible: boolean('is_accessible').default(false),
    property_type: text('property_type').default('apartment'),
    status: propertyStatusEnum('status').notNull().default('Vacant'),
    user_id: uuid('user_id').notNull(),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Contracts Table
export const contracts = pgTable('contracts', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    property_id: uuid('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    status: contractStatusEnum('status').notNull().default('active'),

    // Dates
    signing_date: timestamp('signing_date').notNull(),
    start_date: timestamp('start_date').notNull(),
    end_date: timestamp('end_date').notNull(),

    // Financials
    base_rent: numeric('base_rent', { precision: 10, scale: 2 }).notNull(),
    currency: currencyEnum('currency').notNull().default('ILS'),
    payment_frequency: paymentFrequencyEnum('payment_frequency').notNull().default('monthly'),
    payment_day: integer('payment_day').notNull().default(1),

    // Linkage
    linkage_type: linkageTypeEnum('linkage_type').notNull().default('none'),
    base_index_date: text('base_index_date'), // YYYY-MM
    base_index_value: numeric('base_index_value', { precision: 10, scale: 2 }),
    linkage_sub_type: text('linkage_sub_type'), // 'known' | 'respect_of'
    linkage_ceiling: numeric('linkage_ceiling', { precision: 5, scale: 2 }),
    linkage_floor: numeric('linkage_floor', { precision: 5, scale: 2 }),

    // Security
    security_deposit_amount: numeric('security_deposit_amount', { precision: 10, scale: 2 }).default('0'),

    // Metadata & Complex Data
    ai_extracted: boolean('ai_extracted').default(false),
    ai_extraction_data: jsonb('ai_extraction_data'),
    contract_file_url: text('contract_file_url'),
    contract_file_name: text('contract_file_name'),

    // Israeli Specifics
    needs_painting: boolean('needs_painting').default(false),
    notice_period_days: integer('notice_period_days'),
    option_notice_days: integer('option_notice_days'),

    // JSONB Arrays for complex structures
    option_periods: jsonb('option_periods'),
    rent_periods: jsonb('rent_periods'),
    tenants: jsonb('tenants'),

    // New Fields (Synced with verified DB schema)
    payment_method: text('payment_method'),
    pets_allowed: boolean('pets_allowed').default(true),
    special_clauses: text('special_clauses'),
    guarantees: text('guarantees'),
    guarantors_info: text('guarantors_info'),

    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// Payments Table
export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(),
    contract_id: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: currencyEnum('currency').notNull().default('ILS'),
    due_date: timestamp('due_date').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    paid_date: timestamp('paid_date'),
    payment_method: text('payment_method'),
    reference: text('reference'),
    created_at: timestamp('created_at').defaultNow(),
});

// Index Data (MADAD)
export const index_data = pgTable('index_data', {
    id: uuid('id').primaryKey().defaultRandom(),
    index_type: linkageTypeEnum('index_type').notNull(),
    date: text('date').notNull(), // YYYY-MM
    value: numeric('value', { precision: 10, scale: 4 }).notNull(),
    source: text('source').default('cbs'),
    created_at: timestamp('created_at').defaultNow(),
});
