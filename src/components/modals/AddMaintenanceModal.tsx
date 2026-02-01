import { useState, useEffect } from 'react';
import { Wrench, DollarSign, Calendar, User, FileText, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceSchema, type MaintenanceFormData, type MaintenanceFormInput } from '../../schemas/maintenance.schema';

interface AddMaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        property_id?: string;
        amount?: number | string;
        description?: string;
        vendor_name?: string;
        issue_type?: string;
        date?: string;
    };
}

export function AddMaintenanceModal({ isOpen, onClose, onSuccess, initialData }: AddMaintenanceModalProps) {
    const { t } = useTranslation();
    const [properties, setProperties] = useState<any[]>([]);
    const [fetchingProperties, setFetchingProperties] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<MaintenanceFormInput, any, MaintenanceFormData>({
        resolver: zodResolver(maintenanceSchema),
        defaultValues: {
            property_id: '',
            amount: '' as any,
            description: '',
            vendor_name: '',
            issue_type: '',
            date: format(new Date(), 'yyyy-MM-dd'),
        }
    });

    // Watch values for controlled components if needed, or relying on register
    // specifically properties selector might need manual wiring if it was custom, but it's a native select.

    useEffect(() => {
        if (isOpen) {
            fetchProperties();
            if (initialData) {
                reset({
                    property_id: initialData.property_id || '',
                    amount: initialData.amount || '' as any,
                    description: initialData.description || '',
                    vendor_name: initialData.vendor_name || '',
                    issue_type: initialData.issue_type || '',
                    date: initialData.date || format(new Date(), 'yyyy-MM-dd'),
                });
            } else {
                reset({
                    property_id: '',
                    amount: '' as any,
                    description: '',
                    vendor_name: '',
                    issue_type: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const formData = watch(); // For controlled DatePicker

    async function fetchProperties() {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('id, address, city')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProperties(data || []);

            // If only one property, auto-select
            if (data && data.length === 1 && !formData.property_id) {
                setValue('property_id', data[0].id);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setFetchingProperties(false);
        }
    }

    const onSubmit: SubmitHandler<MaintenanceFormData> = async (data) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('property_documents')
                .insert({
                    user_id: user.id,
                    property_id: data.property_id,
                    category: 'maintenance',
                    amount: data.amount, // already number via coercion
                    description: data.description,
                    vendor_name: data.vendor_name,
                    issue_type: data.issue_type,
                    document_date: data.date,
                    storage_bucket: 'secure_documents',
                    storage_path: 'manual_entry',
                    file_name: 'Manual Entry (AI Prepared)'
                });

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error logging maintenance:', error);
            alert('Failed to log expense');
        }
    };

    const modalFooter = (
        <div className="flex gap-3 w-full">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
                {t('cancel')}
            </Button>
            <Button
                type="submit"
                form="add-maintenance-form"
                className="flex-1"
                isLoading={isSubmitting}
            >
                {t('saveRecord')}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('newMaintenanceEntry')}
            description={t('addMaintenanceRecord')}
            footer={modalFooter}
            size="md"
        >
            <form id="add-maintenance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Property Selection */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{t('assignedAsset')}</label>
                    {fetchingProperties ? (
                        <div className="h-10 bg-muted rounded-xl animate-pulse" />
                    ) : (
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                {...register('property_id')}
                                className={`w-full pl-9 pr-4 py-3 bg-secondary border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none ${errors.property_id ? 'border-red-500' : 'border-border'}`}
                            >
                                <option value="">{t('selectProperty')}</option>
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.address}, {p.city}
                                    </option>
                                ))}
                            </select>
                            {errors.property_id && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.property_id.message as string)}</p>}
                        </div>
                    )}
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{t('amount')}</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="number"
                            placeholder="0.00"
                            {...register('amount')}
                            className={`w-full pl-9 pr-4 py-3 bg-secondary border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${errors.amount ? 'border-red-500' : 'border-border'}`}
                        />
                        {errors.amount && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.amount.message as string)}</p>}
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{t('description')}</label>
                    <input
                        type="text"
                        placeholder={t('e.g. Kitchen Renovation')}
                        {...register('description')}
                        className={`w-full px-4 py-3 bg-secondary border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${errors.description ? 'border-red-500' : 'border-border'}`}
                    />
                    {errors.description && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.description.message as string)}</p>}
                </div>

                {/* Vendor & Issue Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">{t('vendor')}</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                {...register('vendor_name')}
                                className="w-full pl-9 pr-4 py-3 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                                placeholder={t('vendor')}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">{t('issueType')}</label>
                        <div className="relative">
                            <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                {...register('issue_type')}
                                className="w-full pl-9 pr-4 py-3 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none text-sm"
                            >
                                <option value="">{t('selectType')}</option>
                                <option value="plumbing">{t('issuePlumbing')}</option>
                                <option value="electrical">{t('issueElectrical')}</option>
                                <option value="hvac">{t('issueHVAC')}</option>
                                <option value="painting">{t('issuePainting')}</option>
                                <option value="carpentry">{t('issueCarpentry')}</option>
                                <option value="appliance">{t('issueAppliance')}</option>
                                <option value="other">{t('issueOther')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{t('date')}</label>
                    <DatePicker
                        value={formData.date ? parseISO(formData.date) : undefined}
                        onChange={(date) => setValue('date', date ? format(date, 'yyyy-MM-dd') : '')}
                        className="w-full"
                    />
                    {errors.date && <p className="text-xs text-red-500 mt-1 ml-1">{t(errors.date.message as string)}</p>}
                </div>
            </form>
        </Modal>
    );
}
