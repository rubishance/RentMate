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
                </div>
            </div>
        </div>
    );
}
