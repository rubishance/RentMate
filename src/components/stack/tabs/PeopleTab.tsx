import { Property } from '../../../types/database';

interface PeopleTabProps {
    property: Property;
}

export function PeopleTab({ property }: PeopleTabProps) {
    return (
        <div className="p-6">
            <div className="text-center py-10 bg-slate-50 dark:bg-neutral-800 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-700">
                <p className="text-muted-foreground">No tenants assigned to this property.</p>
            </div>
        </div>
    );
}
