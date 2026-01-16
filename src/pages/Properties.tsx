import { useEffect, useState } from 'react';
import { Plus, Home, BedDouble, Ruler } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AddPropertyModal } from '../components/modals/AddPropertyModal';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';
import { IndexedRentModal } from '../components/modals/IndexedRentModal';
import type { Property } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';
import { PropertyIcon } from '../components/common/PropertyIcon';
import placeholderImage from '../assets/property-placeholder-clean.png';
import { PageHeader } from '../components/common/PageHeader';
import { GlassCard } from '../components/common/GlassCard';
import UpgradeRequestModal from '../components/modals/UpgradeRequestModal';

type ExtendedProperty = Property & {
    contracts: {
        base_rent: number;
        status: string;
        end_date: string | null;
        linkage_type: string;
        base_index_date: string | null;
        base_index_value: number | null;
        option_periods: {
            length: number;
            unit: 'months' | 'years';
        }[] | null;
    }[];
};

export function Properties() {
    const { t, lang } = useTranslation();
    const [properties, setProperties] = useState<ExtendedProperty[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    const [indexedRentContract, setIndexedRentContract] = useState<any>(null); // Contract to show calculation for
    const [affectedItems, setAffectedItems] = useState<any[]>([]);

    const handleAdd = () => {
        setEditingProperty(null);
        setIsReadOnly(false);
        setIsAddModalOpen(true);
    };

    const handleView = (property: Property) => {
        setEditingProperty(property);
        setIsReadOnly(true);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (property: Property) => {
        setDeleteTarget(property);
        setAffectedItems([]);

        try {
            // Get Tenants
            const { data: tenants, error: tenantsError } = await supabase
                .from('tenants')
                .select('name')
                .eq('property_id', property.id);

            if (tenantsError) console.error('Error fetching tenants:', tenantsError);

            // Get Contracts with details
            const { data: contracts, error: contractsError } = await supabase
                .from('contracts')
                .select('*, tenants(name)')
                .eq('property_id', property.id);

            if (contractsError) console.error('Error fetching contracts:', contractsError);

            const items = [];

            if (tenants && tenants.length > 0) {
                items.push({
                    label: lang === 'he' ? 'דיירים ינותקו מהנכס' : 'Tenants to be disconnected',
                    count: tenants.length,
                    items: tenants.map(t => t.name || (lang === 'he' ? 'ללא שם' : 'Unnamed')),
                    type: 'info'
                });
            }

            if (contracts && contracts.length > 0) {
                const contractItems = contracts.map((c: any) => {
                    const tenantName = c.tenants?.name || (lang === 'he' ? 'לא ידוע' : 'Unknown');
                    const startDate = new Date(c.start_date).toLocaleDateString();
                    const endDate = new Date(c.end_date).toLocaleDateString();
                    return `${tenantName} (${startDate} - ${endDate})`;
                });

                items.push({
                    label: lang === 'he' ? 'חוזים ימחקו (כולל היסטוריית תשלומים)' : 'Contracts to be deleted (including payment history)',
                    count: contracts.length,
                    items: contractItems,
                    type: 'critical'
                });
            }

            setAffectedItems(items);
            setIsDeleteModalOpen(true);
        } catch (err) {
            console.error('Error checking property relations:', err);
            setIsDeleteModalOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            // 1. Get all contract IDs to delete their payments
            const { data: contracts } = await supabase
                .from('contracts')
                .select('id')
                .eq('property_id', deleteTarget.id);

            if (contracts && contracts.length > 0) {
                const contractIds = contracts.map(c => c.id);
                // Delete payments
                await supabase.from('payments').delete().in('contract_id', contractIds);
                // Delete contracts
                await supabase.from('contracts').delete().eq('property_id', deleteTarget.id);
            }

            // 2. Disconnect tenants
            await supabase
                .from('tenants')
                .update({ property_id: null })
                .eq('property_id', deleteTarget.id);

            // 3. Delete property
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;

            setProperties(prev => prev.filter(p => p.id !== deleteTarget.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            console.error('Error deleting property:', error);
            alert(`${t('error')}: ${error.message || 'Unknown error'}`);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    async function fetchProperties() {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*, contracts(id, base_rent, status, end_date, linkage_type, base_index_date, base_index_value, option_periods)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
            } else if (data) {
                setProperties(data as unknown as ExtendedProperty[]);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 px-4 pt-6">
            <PageHeader
                title={lang === 'he' ? 'הנכסים שלי' : 'My Assets'}
                subtitle={lang === 'he' ? 'ניהול פורטפוליו הנכסים שלך' : 'Manage your real estate portfolio'}
                icon={Home}
                action={
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-brand-navy text-white px-5 py-2.5 rounded-xl hover:bg-brand-navy-light transition-all shadow-lg shadow-brand-navy/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">{lang === 'he' ? 'הוסף נכס' : 'Add Property'}</span>
                    </button>
                }
            />

            {properties.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center py-16 border-dashed border-2 bg-white/50">
                    <div className="p-4 bg-brand-navy/5 rounded-full mb-4">
                        <Home className="w-8 h-8 text-brand-navy/40" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{lang === 'he' ? 'אין נכסים עדיין' : 'No Assets Found'}</h3>
                    <p className="text-gray-500 text-sm mb-6">{lang === 'he' ? 'הוסף את הנכס הראשון שלך כדי להתחיל' : 'Add your first property to get started'}</p>
                    <button onClick={handleAdd} className="text-brand-navy font-bold hover:underline text-sm">
                        {lang === 'he' ? '+ צור נכס חדש' : '+ Create New Asset'}
                    </button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <GlassCard
                            key={property.id}
                            onClick={() => handleView(property)}
                            hoverEffect
                            className="cursor-pointer group flex flex-col h-full"
                        >
                            {/* Image Section */}
                            <div className="relative h-48 bg-gray-100 overflow-hidden">
                                <img
                                    src={property.image_url || placeholderImage}
                                    alt={`${property.address}, ${property.city}`}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                                <div className={`absolute top-3 ${lang === 'he' ? 'left-3' : 'right-3'} flex gap-2`}>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-md shadow-sm border ${property.status === 'Occupied'
                                        ? 'bg-white/90 text-green-700 border-green-200/50'
                                        : 'bg-white/90 text-amber-700 border-amber-200/50'
                                        }`}>
                                        {property.status === 'Occupied' ? (lang === 'he' ? 'מושכר' : 'Occupied') : (lang === 'he' ? 'פנוי' : 'Vacant')}
                                    </span>
                                </div>
                                <div className={`absolute bottom-3 ${lang === 'he' ? 'right-3' : 'left-3'}`}>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-xl rounded-full shadow-sm">
                                        <PropertyIcon type={property.property_type} className="w-3.5 h-3.5 text-brand-navy" />
                                        <span className="text-xs font-bold text-brand-navy capitalize">
                                            {property.property_type?.replace('_', ' ') || 'Apartment'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4 flex-1 flex flex-col">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-brand-navy transition-colors">
                                        {[property.address, property.city].filter(Boolean).join(', ')}
                                    </h3>
                                </div>

                                {/* Specs */}
                                <div className="flex items-center gap-4 py-3 border-y border-gray-100">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <BedDouble className="w-4 h-4 text-brand-navy/60" />
                                        <span className="font-bold text-gray-900">{property.rooms}</span>
                                        <span className="text-xs">{lang === 'he' ? 'חדרים' : 'Rooms'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Ruler className="w-4 h-4 text-brand-navy/60" />
                                        <span className="font-bold text-gray-900">{property.size_sqm}</span>
                                        <span className="text-xs">{lang === 'he' ? 'מ״ר' : 'm²'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 mt-auto">
                                    <div onClick={(e) => e.stopPropagation()} className="relative">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 block mb-0.5">
                                            {lang === 'he' ? 'שכר דירה' : 'Monthly Rent'}
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            <span
                                                onClick={() => {
                                                    const active = property.contracts?.find(c => c.status === 'active');
                                                    if (active && active.linkage_type && active.linkage_type !== 'none') {
                                                        setIndexedRentContract(active);
                                                    }
                                                }}
                                                className={`text-xl font-black font-mono text-brand-navy ${property.contracts?.some(c => c.status === 'active' && c.linkage_type && c.linkage_type !== 'none')
                                                    ? 'cursor-pointer hover:text-blue-600 border-b border-dashed border-blue-300'
                                                    : ''
                                                    }`}
                                            >
                                                ₪{(property.contracts?.find(c => c.status === 'active')?.base_rent || property.rent_price || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* End Date */}
                                    {(() => {
                                        const activeContract = property.contracts?.find(c => c.status === 'active');
                                        if (!activeContract?.end_date) return null;

                                        const endDate = new Date(activeContract.end_date);
                                        let finalDate = new Date(endDate);

                                        if (activeContract.option_periods && activeContract.option_periods.length > 0) {
                                            activeContract.option_periods.forEach(period => {
                                                if (period.unit === 'years') {
                                                    finalDate.setFullYear(finalDate.getFullYear() + Number(period.length));
                                                } else {
                                                    finalDate.setMonth(finalDate.getMonth() + Number(period.length));
                                                }
                                            });
                                        }

                                        const hasOptions = finalDate.getTime() !== endDate.getTime();

                                        return (
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 block mb-0.5">
                                                    {lang === 'he' ? 'סיום חוזה' : 'Ends'} {hasOptions && '(+Opt)'}
                                                </span>
                                                <div className="flex items-center gap-1 justify-end">
                                                    <span className="text-sm font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                        {endDate.toLocaleDateString()}
                                                    </span>
                                                    {hasOptions && (
                                                        <span className="text-xs font-bold text-brand-navy bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                            {finalDate.toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}

            <AddPropertyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchProperties}
                propertyToEdit={editingProperty}
                readOnly={isReadOnly}
                onDelete={() => editingProperty && handleDelete(editingProperty)}
            />

            <IndexedRentModal
                isOpen={!!indexedRentContract}
                onClose={() => setIndexedRentContract(null)}
                contract={indexedRentContract}
            />

            <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title={lang === 'he' ? 'מחיקת נכס' : 'Delete Asset'}
                message={lang === 'he'
                    ? `האם את/ה בטוח/ה שברצונך למחוק את הנכס "${deleteTarget?.address}, ${deleteTarget?.city}"?`
                    : `Are you sure you want to delete "${deleteTarget?.address}, ${deleteTarget?.city}"?`}
                isDeleting={isDeleting}
                affectedItems={affectedItems}
                requireDoubleConfirm={affectedItems.length > 0}
            />

            <UpgradeRequestModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                source="properties_export"
            />
        </div>
    );
}
