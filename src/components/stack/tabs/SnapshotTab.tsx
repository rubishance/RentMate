import { useTranslation } from '../../../hooks/useTranslation';
import { Property } from '../../../types/database';

interface SnapshotTabProps {
    property: Property;
    isEditing?: boolean;
    onPropertyChange?: (property: Property) => void;
}

export function SnapshotTab({ property, isEditing, onPropertyChange }: SnapshotTabProps) {
    const { t } = useTranslation();

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-neutral-700">
                <h3 className="text-lg font-bold mb-4">{t('overview') || 'Overview'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(isEditing || property.rooms) ? (
                        <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('rooms')}</div>
                            {isEditing ? (
                                <input
                                    type="number"
                                    step="0.5"
                                    className="text-xl font-black bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                    value={property.rooms ?? ''}
                                    onChange={e => onPropertyChange?.({ ...property, rooms: parseFloat(e.target.value) || 0 })}
                                />
                            ) : (
                                <div className="text-xl font-black">{property.rooms}</div>
                            )}
                        </div>
                    ) : null}
                    {(isEditing || property.size_sqm) ? (
                        <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('sqm')}</div>
                            {isEditing ? (
                                <input
                                    type="number"
                                    className="text-xl font-black bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                    value={property.size_sqm ?? ''}
                                    onChange={e => onPropertyChange?.({ ...property, size_sqm: parseFloat(e.target.value) || 0 })}
                                />
                            ) : (
                                <div className="text-xl font-black">{property.size_sqm} m²</div>
                            )}
                        </div>
                    ) : null}

                    {/* Features Grid */}
                    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        {/* Parking */}
                        {(isEditing || property.has_parking) ? (
                            <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('parking')}</div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        disabled={!isEditing}
                                        checked={!!property.has_parking}
                                        onChange={e => onPropertyChange?.({ ...property, has_parking: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                                    />
                                    <span className="text-sm font-bold">{property.has_parking ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>
                        ) : null}

                        {/* Balcony */}
                        {(isEditing || property.has_balcony) ? (
                            <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('balcony')}</div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        disabled={!isEditing}
                                        checked={!!property.has_balcony}
                                        onChange={e => onPropertyChange?.({ ...property, has_balcony: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                                    />
                                    <span className="text-sm font-bold">{property.has_balcony ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>
                        ) : null}

                        {/* Safe Room (Mamad) */}
                        {(isEditing || property.has_safe_room) ? (
                            <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('safe_room')}</div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        disabled={!isEditing}
                                        checked={!!property.has_safe_room}
                                        onChange={e => onPropertyChange?.({ ...property, has_safe_room: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                                    />
                                    <span className="text-sm font-bold">{property.has_safe_room ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>
                        ) : null}

                        {/* Storage */}
                        {(isEditing || property.has_storage) ? (
                            <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('storage')}</div>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        disabled={!isEditing}
                                        checked={!!property.has_storage}
                                        onChange={e => onPropertyChange?.({ ...property, has_storage: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
                                    />
                                    <span className="text-sm font-bold">{property.has_storage ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
