import { z } from 'zod';

export const maintenanceSchema = z.object({
    property_id: z.string().min(1, 'selectProperty'),
    amount: z.coerce.number().positive('amountGreaterThanZero'),
    description: z.string().min(3, 'descriptionRequired'),
    vendor_name: z.string().optional(),
    issue_type: z.string().optional(), // Can match specific enums if needed
    date: z.string().min(1, 'dateRequired'),
});

export type MaintenanceFormData = z.infer<typeof maintenanceSchema>;
export type MaintenanceFormInput = z.input<typeof maintenanceSchema>;
