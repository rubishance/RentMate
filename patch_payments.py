import re

with open('src/pages/Payments.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Chunk 1
content = content.replace(
    "import { useEffect, useState } from 'react';", 
    "import React, { useEffect, useState } from 'react';"
)

# Chunk 2
old_state = """    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [periodFilter, setPeriodFilter] = useState<'all' | '3m' | '6m' | '1y' | 'next3m' | 'next6m' | 'next1y' | 'currentWindow'>('all');
    const [displayMode, setDisplayMode] = useState<'expected' | 'actual' | 'all'>('all');
    const [stats, setStats] = useState({"""

new_state = """    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [periodFilter, setPeriodFilter] = useState<'all' | '3m' | '6m' | '1y' | 'next3m' | 'next6m' | 'next1y' | 'currentWindow'>('all');
    const [displayMode, setDisplayMode] = useState<'expected' | 'actual' | 'all'>('all');
    const [viewStyle, setViewStyle] = useState<'cards' | 'table'>('cards');
    const [stats, setStats] = useState({"""

content = content.replace(old_state, new_state)


# Chunk 3
old_buttons = """                                </button>
                            ))}
                        </div>

                        <Button"""

new_buttons = """                                </button>
                            ))}
                        </div>

                        <div className="hidden sm:flex p-1 bg-slate-500/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 h-12">
                            {[
                                { id: 'cards', icon: <Layout className="w-4 h-4" />, label: t('cardsView') || 'Cards' },
                                { id: 'table', icon: <Layout className="w-4 h-4 rotate-90" />, label: t('tableView') || 'Table' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewStyle(tab.id as 'cards' | 'table')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center min-w-[3rem]",
                                        viewStyle === tab.id
                                            ? "bg-white dark:bg-neutral-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-white/10"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={tab.label}
                                >
                                    {tab.icon}
                                </button>
                            ))}
                        </div>

                        <Button"""

content = content.replace(old_buttons, new_buttons)

# Chunk 4: Helper functions before `if (loading) {`
helpers = """    const nowForRender = startOfDay(new Date());

    const actionNeededPayments = sortedFilteredPayments.filter((p: any) => {
        const dueDate = new Date(p.due_date);
        return p.status === 'overdue' || (p.status === 'pending' && dueDate < nowForRender);
    });

    const regularPayments = sortedFilteredPayments.filter((p: any) => {
        const dueDate = new Date(p.due_date);
        return !(p.status === 'overdue' || (p.status === 'pending' && dueDate < nowForRender));
    });

    const renderPaymentCard = (payment: any, isActionNeeded: boolean) => (
        <Card
            key={payment.id}
            onClick={() => {
                if (payment.displayType === 'rent') {
                    setSelectedPayment(payment);
                    setDetailsModalProps({ editMode: false });
                    setIsDetailsModalOpen(true);
                }
            }}
            hoverEffect
            glass
            className={cn("group p-0 rounded-[2rem] border-white/5 cursor-pointer", isActionNeeded ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20" : "")}
        >
            <CardContent className="p-4 md:p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                    <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl glass-premium flex flex-col items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-all duration-300", isActionNeeded ? "bg-rose-500/10 text-rose-600" : "")}>
                        <span className="text-lg md:text-xl font-black leading-none">{format(new Date(payment.due_date), 'dd')}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-0.5">{format(new Date(payment.due_date), 'MMM')}</span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base md:text-lg font-black tracking-tight text-foreground truncate">
                                {Array.isArray(payment.contracts?.tenants)
                                    ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                    : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                            </h3>
                            <span className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border shrink-0",
                                payment.displayType === 'bill' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                    payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                        payment.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            )}>
                                {payment.displayType === 'bill' ? t('bills') : t(payment.status)}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs font-medium opacity-60 truncate">
                            {payment.contracts?.properties?.address}, {payment.contracts?.properties?.city}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">{payment.payment_method || '-'}</span>
                    </div>
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className={cn("text-[10px] font-black opacity-40", isActionNeeded ? "text-rose-500" : "text-foreground")}>₪</span>
                            <span className={cn("text-lg md:text-2xl font-black tracking-tight", isActionNeeded ? "text-rose-600" : "text-foreground")}>
                                {(payment.paid_amount || payment.amount).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {payment.status === 'pending' && (
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleInstaPay(payment);
                                }}
                                className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl w-10 h-10 md:w-11 md:h-11 shadow-sm"
                                title={t('markAsPaid')}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </Button>
                        )}

                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                            <ArrowRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", lang === 'he' ? 'rotate-180' : '')} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderTable = (paymentsList: any[]) => (
        <div className="overflow-x-auto glass-premium rounded-[2.5rem] border border-white/5 shadow-sm bg-white/30 dark:bg-neutral-900/30">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 bg-slate-500/5 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                        <th className={cn("p-6", lang === 'he' ? "rounded-tr-[2.5rem]" : "rounded-tl-[2.5rem]")}>{t('date') || 'Date'}</th>
                        <th className="p-6">{t('tenant') || 'Tenant'}</th>
                        <th className="p-6">{t('asset') || 'Asset'}</th>
                        <th className="p-6">{t('status') || 'Status'}</th>
                        <th className="p-6">{t('method') || 'Method'}</th>
                        <th className={cn("p-6", lang === 'he' ? "text-left rounded-tl-[2.5rem]" : "text-right rounded-tr-[2.5rem]")}>{t('amount') || 'Amount'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {paymentsList.map((payment) => (
                        <tr 
                            key={payment.id} 
                            onClick={() => {
                                if (payment.displayType === 'rent') {
                                    setSelectedPayment(payment);
                                    setDetailsModalProps({ editMode: false });
                                    setIsDetailsModalOpen(true);
                                }
                            }}
                            className="group hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                        >
                            <td className="p-6">
                                <div className="font-bold text-sm tracking-tight">{format(new Date(payment.due_date), 'dd/MM/yyyy')}</div>
                            </td>
                            <td className="p-6">
                                <span className="font-bold text-sm block truncate max-w-[150px]">
                                    {Array.isArray(payment.contracts?.tenants)
                                        ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                        : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                                </span>
                            </td>
                            <td className="p-6 text-xs font-semibold text-muted-foreground max-w-[150px] truncate">
                                {payment.contracts?.properties?.address}
                            </td>
                            <td className="p-6">
                                <span className={cn(
                                    "text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border shrink-0 inline-block",
                                    payment.displayType === 'bill' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                        payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            payment.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                )}>
                                    {payment.displayType === 'bill' ? t('bills') : t(payment.status)}
                                </span>
                            </td>
                            <td className="p-6 text-[10px] font-black uppercase tracking-widest opacity-60">
                                {payment.payment_method || '-'}
                            </td>
                            <td className={cn("p-6 font-black text-base flex items-center gap-4", lang === 'he' ? "flex-row-reverse" : "justify-end")}>
                                {payment.status === 'pending' && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInstaPay(payment);
                                        }}
                                        className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={t('markAsPaid')}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                )}
                                <span>₪{(payment.paid_amount || payment.amount).toLocaleString()}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderCardsWithDividers = (paymentsList: any[]) => {
        let currentMonthStr = "";
        return paymentsList.map((payment, index) => {
            const pDate = new Date(payment.due_date);
            const pMonthStr = format(pDate, 'MM yyyy'); // e.g. 02 2026
            const showDivider = pMonthStr !== currentMonthStr;
            if (showDivider) {
                currentMonthStr = pMonthStr;
            }

            return (
                <React.Fragment key={payment.id || index}>
                    {showDivider && index !== 0 && (
                        <div className="flex items-center gap-4 py-6 px-2 opacity-60">
                            <div className="h-px flex-1 bg-border/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{format(pDate, 'MMMM yyyy')}</span>
                            <div className="h-px flex-1 bg-border/50" />
                        </div>
                    )}
                    {renderPaymentCard(payment, false)}
                </React.Fragment>
            );
        });
    };

    if (loading) {"""

content = content.replace("    if (loading) {", helpers)


# Chunk 5: Replacing the actual list section
old_list = """            {/* Payments List */}
            <div className="space-y-4">
                {sortedFilteredPayments.length === 0 ? ("""

new_list = """            {/* Payments List */}
            <div className="space-y-4 pt-4">
                {sortedFilteredPayments.length === 0 ? ("""

content = content.replace(old_list, new_list)


# Replace the mapping part block ending with `)} </div>`
old_else = """                    <div className="space-y-3">
                        {sortedFilteredPayments.map(payment => (
                            <Card
                                key={payment.id}
                                onClick={() => {
                                    if (payment.displayType === 'rent') {
                                        setSelectedPayment(payment);
                                        setDetailsModalProps({ editMode: false });
                                        setIsDetailsModalOpen(true);
                                    }
                                }}
                                hoverEffect
                                glass
                                className="group p-0 rounded-[2rem] border-white/5 cursor-pointer"
                            >
                                <CardContent className="p-4 md:p-6 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl glass-premium flex flex-col items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-all duration-300">
                                            <span className="text-lg md:text-xl font-black text-foreground leading-none">{format(new Date(payment.due_date), 'dd')}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-0.5">{format(new Date(payment.due_date), 'MMM')}</span>
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base md:text-lg font-black tracking-tight text-foreground truncate">
                                                    {Array.isArray(payment.contracts?.tenants)
                                                        ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                                        : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                                                </h3>
                                                <span className={cn(
                                                    "text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border shrink-0",
                                                    payment.displayType === 'bill' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            payment.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                )}>
                                                    {payment.displayType === 'bill' ? t('bills') : payment.status}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-xs font-medium opacity-60 truncate">
                                                {payment.contracts?.properties?.address}, {payment.contracts?.properties?.city}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 md:gap-8">
                                        <div className="text-right">
                                            <div className="flex items-baseline gap-1 justify-end">
                                                <span className="text-[10px] font-black text-foreground opacity-40">₪</span>
                                                <span className="text-lg md:text-2xl font-black text-foreground tracking-tight">
                                                    {(payment.paid_amount || payment.amount).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {payment.status === 'pending' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleInstaPay(payment);
                                                    }}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl w-10 h-10 md:w-11 md:h-11 shadow-sm"
                                                    title={t('markAsPaid')}
                                                >
                                                    <CalendarCheck className="w-5 h-5" />
                                                </Button>
                                            )}

                                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                <ArrowRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", lang === 'he' ? 'rotate-180' : '')} />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>"""

new_else = """                    <div className="space-y-12">
                        {actionNeededPayments.length > 0 && (
                            <div className="space-y-4 relative">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <h2 className="text-xl font-black text-rose-500 tracking-tight">{t('actionNeeded') || 'Action Needed'}</h2>
                                </div>
                                {viewStyle === 'table' ? renderTable(actionNeededPayments) : actionNeededPayments.map(p => renderPaymentCard(p, true))}
                            </div>
                        )}
                        
                        {regularPayments.length > 0 && (
                            <div className="space-y-4 relative pb-4">
                                {actionNeededPayments.length > 0 && (
                                    <div className="flex items-center gap-3 px-2 pt-4">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <h2 className="text-xl font-black text-foreground tracking-tight">{t('upcomingAndPaid') || 'Upcoming & Paid'}</h2>
                                    </div>
                                )}
                                {viewStyle === 'table' ? renderTable(regularPayments) : renderCardsWithDividers(regularPayments)}
                            </div>
                        )}
                    </div>"""
    
content = content.replace(old_else, new_else)

with open('src/pages/Payments.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to Payments.tsx")
