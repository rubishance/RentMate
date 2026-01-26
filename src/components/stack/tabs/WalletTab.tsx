import { Property } from '../../../types/database';

interface WalletTabProps {
    property: Property;
}

export function WalletTab({ property }: WalletTabProps) {
    return (
        <div className="p-6">
            <div className="text-center py-10 bg-slate-50 dark:bg-neutral-800 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-700">
                <p className="text-muted-foreground">No financial data available.</p>
            </div>
        </div>
    );
}
