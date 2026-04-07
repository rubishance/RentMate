import { useTranslation } from '../../../hooks/useTranslation';
import { Property } from '../../../types/database';
import { BedIcon, RulerIcon, BalconyIcon, SafeRoomIcon, CarIcon, StorageIcon } from '../../icons/NavIcons';
import { cn } from '../../../lib/utils';

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
                
                {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-background dark:bg-neutral-900 rounded-xl">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('rooms')}</div>
                            <input
                                type="number"
                                step="0.5"
                                className="text-xl font-black bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                value={property.rooms ?? ''}
                                onChange={e => onPropertyChange?.({ ...property, rooms: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="p-4 bg-background dark:bg-neutral-900 rounded-xl">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">{t('sqm')}</div>
                            <input
                                type="number"
                                className="text-xl font-black bg-transparent border-b border-primary/20 w-full outline-none focus:border-primary"
                                value={property.size_sqm ?? ''}
                                onChange={e => onPropertyChange?.({ ...property, size_sqm: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Features Grid */}
                        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                            {/* Parking */}
                            <div className="p-4 bg-background dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest">{t('parking')}</div>
                                <label className="flex items-center gap-2 sm:gap-4 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={!!property.has_parking}
                                        onChange={e => onPropertyChange?.({ ...property, has_parking: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-bold">{property.has_parking ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>

                            {/* Balcony */}
                            <div className="p-4 bg-background dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest">{t('balcony')}</div>
                                <label className="flex items-center gap-2 sm:gap-4 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={!!property.has_balcony}
                                        onChange={e => onPropertyChange?.({ ...property, has_balcony: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-bold">{property.has_balcony ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>

                            {/* Safe Room (Mamad) */}
                            <div className="p-4 bg-background dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest">{t('safeRoom')}</div>
                                <label className="flex items-center gap-2 sm:gap-4 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={!!property.has_safe_room}
                                        onChange={e => onPropertyChange?.({ ...property, has_safe_room: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-bold">{property.has_safe_room ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>

                            {/* Storage */}
                            <div className="p-4 bg-background dark:bg-neutral-900 rounded-xl flex flex-col gap-2">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest">{t('storage')}</div>
                                <label className="flex items-center gap-2 sm:gap-4 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={!!property.has_storage}
                                        onChange={e => onPropertyChange?.({ ...property, has_storage: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm font-bold">{property.has_storage ? t('yes') || 'Yes' : t('no') || 'No'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 w-full">
                        {property.size_sqm ? (
                            <div className="flex items-center justify-center flex-1 gap-2 bg-background dark:bg-neutral-900 py-2 sm:py-2 rounded-2xl shadow-sm h-16 sm:h-14">
                                <span className="text-xl font-black text-foreground leading-none tracking-tight">
                                    {property.size_sqm}
                                </span>
                                <RulerIcon className="w-7 h-7 text-muted-foreground shrink-0" />
                            </div>
                        ) : null}
                        {property.rooms ? (
                            <div className="flex items-center justify-center flex-1 gap-2 bg-background dark:bg-neutral-900 py-2 sm:py-2 rounded-2xl shadow-sm h-16 sm:h-14">
                                <span className="text-xl font-black text-foreground leading-none tracking-tight">
                                    {property.rooms}
                                </span>
                                <BedIcon className="w-7 h-7 text-muted-foreground shrink-0" />
                            </div>
                        ) : null}
                        <div className="flex items-center justify-center flex-1 bg-background dark:bg-neutral-900 py-2 sm:py-2 rounded-2xl shadow-sm text-muted-foreground h-16 sm:h-14">
                            <StorageIcon className={cn("w-7 h-7", !property.has_storage && "opacity-20")} />
                        </div>
                        <div className="flex items-center justify-center flex-1 bg-background dark:bg-neutral-900 py-2 sm:py-2 rounded-2xl shadow-sm text-muted-foreground h-16 sm:h-14">
                            <SafeRoomIcon className={cn("w-7 h-7", !property.has_safe_room && "opacity-20")} />
                        </div>
                        <div className="flex items-center justify-center flex-1 bg-background dark:bg-neutral-900 py-2 sm:py-2 rounded-2xl shadow-sm text-muted-foreground h-16 sm:h-14">
                            <CarIcon className={cn("w-7 h-7", !property.has_parking && "opacity-20")} />
                        </div>
                        <div className="flex items-center justify-center flex-1 bg-background dark:bg-neutral-900 py-2 sm:py-2 rounded-2xl shadow-sm text-muted-foreground h-16 sm:h-14">
                            <BalconyIcon className={cn("w-7 h-7", !property.has_balcony && "opacity-20")} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
