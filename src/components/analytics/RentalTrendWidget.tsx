import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Home,
    MapPin,
    Plus,
    X,
    ChevronRight,
    Search,
    Map
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { rentalTrendService } from '../../services/rental-trend.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export const RentalTrendWidget: React.FC = () => {
    const { t } = useTranslation();
    const { preferences, setPinnedCities } = useUserPreferences();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const pinnedCities = useMemo(() => preferences.pinned_cities || [], [preferences.pinned_cities]);

    useEffect(() => {
        const initData = async () => {
            await rentalTrendService.initialize();
            setIsLoading(false);
        };
        initData();
    }, []);

    const allRegions = useMemo(() => rentalTrendService.getAllRegions(), [isLoading]);

    const filteredAvailableCities = useMemo(() => {
        return allRegions
            .filter(city => city.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(city => !pinnedCities.includes(city))
            .sort();
    }, [allRegions, searchQuery, pinnedCities]);

    const toggleCity = (city: string) => {
        const newPinned = pinnedCities.includes(city)
            ? pinnedCities.filter(c => c !== city)
            : [...pinnedCities, city];
        setPinnedCities(newPinned);
    };

    if (isLoading) {
        return (
            <GlassCard className="h-[200px] flex items-center justify-center animate-pulse">
                <div className="text-gray-400">{t('loading')}...</div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t('marketIntelligence')}
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManageModalOpen(true)}
                    className="text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('manageCities')}
                </Button>
            </div>

            {pinnedCities.length === 0 ? (
                <GlassCard className="p-8 text-center border-dashed border-2 border-gray-200 dark:border-gray-800">
                    <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {t('noCitiesPinnedDescription')}
                    </p>
                    <Button onClick={() => setIsManageModalOpen(true)}>
                        {t('chooseCities')}
                    </Button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pinnedCities.map(city => {
                        const data = rentalTrendService.getRegionalTrend(city);
                        if (!data) return null;

                        const isUp = data.annualGrowth >= 0;

                        return (
                            <GlassCard
                                key={city}
                                className="p-4 hover:shadow-lg transition-all border-l-4 border-l-brand-500"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                        <Map className="h-3 w-3 text-gray-400" />
                                        {t(city)}
                                    </div>
                                    <button
                                        onClick={() => toggleCity(city)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            ₪{data.averageRent.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {t('avgRent')}
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                                        {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                        {Math.abs(data.annualGrowth)}%
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-[10px] text-gray-400">
                                    <span>5Y: {data.historical['5Y']}%</span>
                                    <span>MoM: {data.monthOverMonth}%</span>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                title={t('manageTrackedCities')}
                size="md"
            >
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('searchCities')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                        {pinnedCities.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {t('currentlyTracking')}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {pinnedCities.map(city => (
                                        <span
                                            key={city}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-sm font-medium border border-brand-100 dark:border-brand-900/50"
                                        >
                                            {t(city)}
                                            <button onClick={() => toggleCity(city)}>
                                                <X className="h-3 w-3 hover:text-red-500" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                {t('availableCities')}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {filteredAvailableCities.length > 0 ? (
                                    filteredAvailableCities.map(city => (
                                        <button
                                            key={city}
                                            onClick={() => toggleCity(city)}
                                            className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left text-sm"
                                        >
                                            <span className="text-gray-700 dark:text-gray-300">{t(city)}</span>
                                            <Plus className="h-3 w-3 text-gray-400" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-4 text-gray-400 text-sm">
                                        {t('noResultsFound')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Button onClick={() => setIsManageModalOpen(false)}>
                            {t('done')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
