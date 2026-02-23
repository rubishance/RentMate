import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import {
    FileText,
    Search,
    Plus,
    Calendar,
    Building2,
    ArrowRight,
    Clock,
    MessageCircle,
    Phone
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataCache } from '../contexts/DataCacheContext';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useStack } from '../contexts/StackContext';

interface ExtendedContract {
    id: string;
    property_id: string;
    user_id: string;
    start_date: string;
    end_date: string | null;
    status: string;
    base_rent: number;
    tenants: any;
    properties: {
        address: string;
        city: string;
    } | null;
}

const MotionCard = motion(Card);

export default function Contracts() {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const { push } = useStack();
    const { get, set } = useDataCache();
    const CACHE_KEY = 'contracts_list_all';

    const [contracts, setContracts] = useState<ExtendedContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

    useEffect(() => {
        fetchContracts();
    }, []);

    async function fetchContracts() {
        const cached = get<ExtendedContract[]>(CACHE_KEY);
        if (cached) {
            setContracts(cached);
            setLoading(false);
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('contracts')
                .select('*, properties(address, city)')
                .eq('user_id', user.id)
                .order('start_date', { ascending: false });

            if (data) {
                setContracts(data as unknown as ExtendedContract[]);
                set(CACHE_KEY, data as unknown as ExtendedContract[], { persist: true });
            }
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredContracts = contracts.filter(c => {
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

        const tenant = Array.isArray(c.tenants) ? c.tenants[0] : c.tenants;
        const tenantName = (tenant?.name || tenant?.full_name || '').toLowerCase();
        const address = (c.properties?.address || '').toLowerCase();
        const city = (c.properties?.city || '').toLowerCase();

        const matchesSearch =
            tenantName.includes(searchQuery.toLowerCase()) ||
            address.includes(searchQuery.toLowerCase()) ||
            city.includes(searchQuery.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: contracts.length,
        active: contracts.filter(c => c.status === 'active').length,
        archived: contracts.filter(c => c.status === 'archived').length
    };

    const handleAdd = () => {
        push('contract_wizard', {
            onSuccess: () => fetchContracts()
        }, { isExpanded: true, title: t('addContract') });
    };

    if (loading) {
        return (
            <div className="pb-40 pt-16 px-4 md:px-8 space-y-12">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="h-12 w-64 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-64 rounded-[2.5rem]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-40 pt-8 px-4 md:px-8 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 dark:bg-emerald-500/10 backdrop-blur-md rounded-full border border-emerald-500/10 shadow-sm mb-1">
                        <FileText className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            {t('legal_management')}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {t('contracts')}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex p-1 bg-slate-100 dark:bg-neutral-800 rounded-2xl border border-slate-200 dark:border-neutral-700 shadow-sm">
                        {(['active', 'archived', 'all'] as const).map((s) => (
                            <Button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                variant={statusFilter === s ? 'secondary' : 'ghost'}
                                className={cn(
                                    "px-4 py-2 h-9 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl",
                                    statusFilter === s
                                        ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-transparent hover:text-foreground"
                                )}
                            >
                                {t(s)}
                            </Button>
                        ))}
                    </div>
                    <Button
                        onClick={handleAdd}
                        variant="jewel"
                        className="h-14 w-14 rounded-2xl p-0 shrink-0"
                        title={t('addContract')}
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Quick Search & Filters */}
            <div className="relative group max-w-2xl">
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholderContracts')}
                    className="h-16 pl-12 pr-6 rounded-3xl border-slate-100 dark:border-neutral-800 shadow-minimal font-medium"
                    leftIcon={<Search className="w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />}
                />
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                {[
                    { label: t('active'), value: stats.active, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10' },
                    { label: t('archived'), value: stats.archived, color: 'text-slate-400', bg: 'bg-slate-500/5', border: 'border-slate-200 dark:border-slate-800' },
                    { label: t('total'), value: stats.total, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/10' },
                ].map((stat, i) => (
                    <Card key={i} glass className={cn("rounded-[2rem] border shadow-sm", stat.bg, stat.border)}>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{stat.label}</span>
                                <div className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.value}</div>
                            </div>
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/50 dark:bg-black/20", stat.color)}>
                                <FileText className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredContracts.length === 0 ? (
                <div
                    onClick={handleAdd}
                    className="py-32 text-center space-y-6 bg-slate-50/50 dark:bg-neutral-900/50 rounded-[3.5rem] border border-dashed border-slate-200 dark:border-neutral-800 mx-auto max-w-4xl w-full cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group"
                >
                    <div className="w-24 h-24 bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-minimal flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-jewel transition-all">
                        <FileText className="w-10 h-10 text-slate-200 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase opacity-40 group-hover:opacity-100 transition-opacity">{t('noActiveContracts')}</h3>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto text-sm italic group-hover:text-foreground transition-colors">{t('addContractDesc')}</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                    <AnimatePresence mode="popLayout">
                        {filteredContracts.map((contract) => {
                            const tenant = Array.isArray(contract.tenants) ? contract.tenants[0] : contract.tenants;
                            const tenantName = tenant?.name || tenant?.full_name || t('unnamed');
                            const isActive = contract.status === 'active';
                            const phone = tenant?.phone;

                            return (
                                <MotionCard
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={contract.id}
                                    onClick={() => navigate(`/contracts/${contract.id}`)}
                                    hoverEffect
                                    glass
                                    className="group p-0 rounded-[2.5rem] border-white/10 overflow-hidden"
                                >
                                    <CardContent className="p-8 space-y-6 relative h-full flex flex-col">
                                        {/* Status Indicator */}
                                        <div className="absolute top-8 right-8">
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]",
                                                isActive ? "text-emerald-500 bg-emerald-500" : "text-slate-400 bg-slate-400"
                                            )} />
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">
                                                    {isActive ? t('active_contract') : t('archived_contract')}
                                                </span>
                                                <h3 className="text-2xl font-black tracking-tighter text-foreground leading-tight group-hover:text-primary transition-colors">
                                                    {tenantName}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    <span className="truncate">{contract.properties?.address || t('unknownProperty')}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 py-6 border-y border-border/50">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground opacity-40">
                                                        <Calendar className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{t('period')}</span>
                                                    </div>
                                                    <div className="text-[11px] font-black tracking-tight text-foreground">
                                                        {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 text-muted-foreground opacity-40">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{t('base_rent')}</span>
                                                    </div>
                                                    <div className="text-xl font-black tracking-tighter text-foreground">
                                                        ₪{contract.base_rent?.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions Footer */}
                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-2">
                                                    {phone && (
                                                        <a
                                                            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <MessageCircle className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                    {phone && (
                                                        <a
                                                            href={`tel:${phone}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Phone className="w-5 h-5" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-minimal group-hover:scale-105 transition-all">
                                                    {t('view_details')}
                                                    <ArrowRight className={cn("w-3 h-3", lang === 'he' ? 'rotate-180' : '')} />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </MotionCard>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
