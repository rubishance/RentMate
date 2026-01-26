import { useState, useEffect } from 'react';
import { Wrench, DollarSign, Calendar, User, FileText, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [fetchingProperties, setFetchingProperties] = useState(true);

    const [formData, setFormData] = useState({
        property_id: '',
        amount: '',
        description: '',
        vendor_name: '',
        issue_type: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (isOpen) {
            fetchProperties();
            if (initialData) {
                setFormData({
                    property_id: initialData.property_id || '',
                    amount: initialData.amount ? initialData.amount.toString() : '',
                    description: initialData.description || '',
                    vendor_name: initialData.vendor_name || '',
                    issue_type: initialData.issue_type || '',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                });
            }
        }
    }, [isOpen, initialData]);

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
                setFormData(prev => ({ ...prev, property_id: data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setFetchingProperties(false);
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.property_id || !formData.amount || !formData.description) return;

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { error } = await supabase
                .from('property_documents')
                .insert({
                    user_id: user.id,
                    property_id: formData.property_id,
                    category: 'maintenance',
                    amount: parseFloat(formData.amount),
                    description: formData.description,
                    vendor_name: formData.vendor_name,
                    issue_type: formData.issue_type,
                    document_date: formData.date,
                    storage_bucket: 'secure_documents',
                    storage_path: 'manual_entry',
                    file_name: 'Manual Entry (AI Prepared)'
                });

            if (error) throw error;

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                property_id: '',
                amount: '',
                description: '',
                vendor_name: '',
                issue_type: '',
                date: new Date().toISOString().split('T')[0],
            });

        } catch (error) {
            console.error('Error logging maintenance:', error);
            alert('Failed to log expense');
        } finally {
            setLoading(false);
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
                isLoading={loading}
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
            <form id="add-maintenance-form" onSubmit={handleSave} className="space-y-4">
                {/* Property Selection */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{t('assignedAsset')}</label>
                    {fetchingProperties ? (
                        <div className="h-10 bg-muted rounded-xl animate-pulse" />
                    ) : (
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                required
                                value={formData.property_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value }))}
                                className="w-full pl-9 pr-4 py-3 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none"
                            >
                                <option value="">{t('selectProperty')}</option>
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.address}, {p.city}
                                    </option>
                                ))}
                            </select>
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
                            required
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            className="w-full pl-9 pr-4 py-3 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">{t('description')}</label>
                    <input
                        type="text"
                        required
                        placeholder={t('e.g. Kitchen Renovation')}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                </div>

                {/* Vendor & Issue Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">{t('vendor')}</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={formData.vendor_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
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
                                value={formData.issue_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, issue_type: e.target.value }))}
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
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                </div>
            </form>
        </Modal>
    );
}
