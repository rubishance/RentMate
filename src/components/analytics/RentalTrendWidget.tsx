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
    Map,
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { rentalTrendService } from '../../services/rental-trend.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

interface RentalTrendWidgetProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export const RentalTrendWidget: React.FC<RentalTrendWidgetProps> = ({ isExpanded: externalIsExpanded, onToggleExpand }) => {
    const { t } = useTranslation();
    const { preferences, setPinnedCities } = useUserPreferences();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [localIsExpanded, setLocalIsExpanded] = useState(true);

    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    const pinnedCities = useMemo(() => {
        const pinned = preferences.pinned_cities || [];
        return pinned.map(p => typeof p === 'string' ? { city: p, rooms: 3 } : p);
    }, [preferences.pinned_cities]);

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
            .filter(city => city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t(city).toLowerCase().includes(searchQuery.toLowerCase()))
            .sort();
    }, [allRegions, searchQuery, t]);

    const addCity = (city: string) => {
        setPinnedCities([...pinnedCities, { city, rooms: 3 }]);
    };

    const removeCityCard = (index: number) => {
        const newPinned = [...pinnedCities];
        newPinned.splice(index, 1);
        setPinnedCities(newPinned);
    };

    const updateCityRooms = (index: number, rooms: number) => {
        const newPinned = [...pinnedCities];
        newPinned[index] = { ...newPinned[index], rooms };
        setPinnedCities(newPinned);
    };

    if (isLoading) {
        return (
            <Card className="h-[200px] flex items-center justify-center animate-pulse">
                <div className="text-muted-foreground">{t('loading')}...</div>
            </Card>
        );
    }

    return (
        <Card className="w-full h-full relative overflow-hidden group flex flex-col justify-start border border-border shadow-sm bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem]">
            <CardContent className="p-5 md:p-6 flex flex-col flex-1 h-full">
                <div className="space-y-4 flex-1">
                    <div 
                        className="flex items-center justify-between cursor-pointer group/header relative z-10"
                        onClick={toggleExpand}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                                <TrendingUp className="w-5 h-5 text-teal-500" />
                            </div>
                            <h3 className="text-xl font-black font-heading text-primary">
                                {t('marketIntelligence')}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsManageModalOpen(true);
                                }}
                                className="h-8 p-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 group-hover/header:text-foreground hover:bg-transparent transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">{t('manageCities')}</span>
                            </Button>
                            <div className="text-muted-foreground/50 group-hover/header:text-foreground transition-colors p-1">
                                <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")} />
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-2">
                                    {pinnedCities.length === 0 ? (
                                        <GlassCard className="p-8 text-center border-dashed border-2 border-border dark:border-gray-800">
                                            <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                                                {t('noCitiesPinnedDescription')}
                                            </p>
                                            <Button onClick={() => setIsManageModalOpen(true)}>
                                                {t('chooseCities')}
                                            </Button>
                                        </GlassCard>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {pinnedCities.map((pinned, index) => {
                                                const data = rentalTrendService.getRegionalTrend(pinned.city);
                                                if (!data) return null;

                                                const adjustedRent = data.averageRent * (data.roomAdjustments[pinned.rooms] || 1);
                                                const isUp = data.annualGrowth >= 0;

                                                return (
                                                    <GlassCard
                                                        key={`${pinned.city}-${index}`}
                                                        className="p-4 hover:shadow-lg transition-all border-l-4 border-l-brand-500 bg-white/50 dark:bg-slate-800/50"
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="font-medium text-foreground dark:text-white flex items-center gap-1">
                                                                <Map className="h-3 w-3 text-muted-foreground" />
                                                                {t(pinned.city)}
                                                            </div>
                                                            <button
                                                                onClick={() => removeCityCard(index)}
                                                                className="text-muted-foreground hover:text-destructive transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-end justify-between">
                                                            <div>
                                                                <div className="text-2xl font-bold text-foreground dark:text-white">
                                                                    ₪{Math.round(adjustedRent).toLocaleString()}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <select
                                                                        value={pinned.rooms}
                                                                        onChange={(e) => updateCityRooms(index, Number(e.target.value))}
                                                                        className="text-sm bg-transparent border-none p-0 font-semibold text-brand-600 dark:text-brand-400 cursor-pointer outline-none focus:ring-0"
                                                                    >
                                                                        {[2, 3, 4, 5].map(n => (
                                                                            <option key={n} value={n} className="dark:bg-neutral-900">
                                                                                {n} {t('rooms')}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div className={`flex items-center gap-1 font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                                                                {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                                {Math.abs(data.annualGrowth)}%
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-border dark:border-gray-800 flex justify-between text-sm text-muted-foreground">
                                                            <span>{t('fiveYears')}: {data.historical['5Y']}%</span>
                                                            <span>{t('mom')}: {data.monthOverMonth}%</span>
                                                        </div>
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Modal
                        isOpen={isManageModalOpen}
                        onClose={() => setIsManageModalOpen(false)}
                        title={t('manageTrackedCities')}
                        size="md"
                    >
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t('searchCities')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-secondary dark:bg-foreground border border-border dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>

                            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                                {pinnedCities.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            {t('currentlyTracking')}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {pinnedCities.map((pinned, index) => (
                                                <span
                                                    key={`${pinned.city}-${index}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full text-sm font-medium border border-brand-100 dark:border-brand-900/50"
                                                >
                                                    {t(pinned.city)} ({pinned.rooms})
                                                    <button onClick={() => removeCityCard(index)}>
                                                        <X className="h-3 w-3 hover:text-destructive" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {t('availableCities')}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {filteredAvailableCities.length > 0 ? (
                                            filteredAvailableCities.map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => addCity(city)}
                                                    className="flex items-center justify-between p-2 rounded-xl border border-border dark:border-gray-800 hover:bg-secondary dark:hover:bg-gray-800 transition-colors text-left text-sm"
                                                >
                                                    <span className="text-gray-700 dark:text-gray-300">{t(city)}</span>
                                                    <Plus className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="col-span-2 text-center py-4 text-muted-foreground text-sm">
                                                {t('noResultsFound')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-border dark:border-gray-800">
                                <Button onClick={() => setIsManageModalOpen(false)}>
                                    {t('done')}
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </CardContent>
        </Card>
    );
};
