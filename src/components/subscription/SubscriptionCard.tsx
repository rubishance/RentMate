import { type FC, useState } from 'react';
import UpgradeRequestModal from '../modals/UpgradeRequestModal';
import { Crown, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { UsageBar } from './UsageBar';
import { useTranslation } from '../../hooks/useTranslation';

export const SubscriptionCard: FC = () => {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const { plan, usage, loading } = useSubscription();
    const { t } = useTranslation();

    if (loading) {
        return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />;
    }

    if (!plan) return null;

    const isFree = plan.id === 'free';
    const isEnterprise = plan.id === 'enterprise';

    return (
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />

            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                {t('currentPlan')}
                            </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {plan.name}
                            {!isFree && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {isFree
                                ? t('greatForGettingStarted')
                                : isEnterprise
                                    ? "Powerhouse for large portfolios"
                                    : "Advanced features for professionals"
                            }
                        </p>
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="space-y-4 mb-6">
                    <UsageBar
                        label={t('properties')}
                        current={usage.properties}
                        max={plan.max_properties}
                    />
                    <UsageBar
                        label={t('tenants')}
                        current={usage.tenants}
                        max={plan.max_tenants}
                    />
                    <UsageBar
                        label={t('contracts')}
                        current={usage.contracts}
                        max={plan.max_contracts}
                    />
                </div>

                {/* Footer / Upgrade CTA */}
                {isFree && (
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    {t('unlockMoreLimits')}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsUpgradeModalOpen(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {t('upgradeToPro')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <UpgradeRequestModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                source="settings_card"
            />
        </div>
    );
};
