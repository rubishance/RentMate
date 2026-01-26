import { Property } from '../../../types/database';

interface SnapshotTabProps {
    property: Property;
}

export function SnapshotTab({ property }: SnapshotTabProps) {
    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-neutral-700">
                <h3 className="text-lg font-bold mb-4">Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Rooms</div>
                        <div className="text-xl font-black">{property.rooms}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Size</div>
                        <div className="text-xl font-black">{property.size_sqm} m²</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Rent</div>
                        <div className="text-xl font-black">₪{property.rent_price?.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
