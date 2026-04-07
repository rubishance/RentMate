import { Property } from '../../../types/database';
import { EmptyState } from '../../common/EmptyState';
import { useTranslation } from '../../../hooks/useTranslation';
import { Users } from 'lucide-react';

interface PeopleTabProps {
    property: Property;
}

export function PeopleTab({ property }: PeopleTabProps) {
    const { t } = useTranslation();
    return (
        <div className="py-8">
            <EmptyState
                icon={Users}
                title={t('noActiveContracts')}
                description={t('noTenantsInThisProperty')}
                actionLabel={t('addContract')}
                onAction={() => {}}
            />
        </div>
    );
}
