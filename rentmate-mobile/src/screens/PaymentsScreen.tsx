import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet,  ScrollView, TouchableOpacity, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Filter, CheckCircle2, Wallet, Plus, ArrowUpRight, AlertCircle, X } from 'lucide-react-native';
import { format, parseISO, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useIndexedPayments } from '../hooks/useIndexedPayments';

import { useAppTheme } from '../hooks/useAppTheme';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PaymentsScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayMode, setDisplayMode] = useState<'expected' | 'actual' | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // Custom Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    contractStatus: 'active',
    dateRange: 'all',
    propertyId: 'all',
    paymentMethod: 'all'
  });

  const uniqueProperties = React.useMemo(() => {
    const props = new Map();
    payments.forEach(p => {
      if (p.contracts?.properties) {
        props.set(p.contracts.properties.id, p.contracts.properties.address);
      }
    });
    return Array.from(props.entries()).map(([id, address]) => ({ id, address }));
  }, [payments]);

  const [stats, setStats] = useState({
    monthlyExpected: 0,
    monthlyIndexedTotal: 0,
    monthlyIndexSum: 0,
    pending: 0,
    basePending: 0,
    overdue: 0,
    partialDebt: 0,
    contractBreakdown: {} as Record<string, any>
  });

  const { indexedAmounts, loading: indexingLoading } = useIndexedPayments(payments);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (payments.length > 0) {
      calculateStats(payments);
    }
  }, [payments, indexedAmounts]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          contracts!inner (
            id,
            tenants,
            status,
            properties (id, address, city),
            linkage_type,
            base_index_date,
            base_index_value,
            linkage_sub_type,
            linkage_ceiling,
            linkage_floor,
            base_rent
          )
        `)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
      }

      if (data) {
        const rentPayments = data.map(p => ({
          ...p,
          displayType: 'rent'
        }));

        const allItems = [...rentPayments];
        allItems.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
        setPayments(allItems);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickApprove(payment: any) {
    try {
      const expectedAmount = payment.displayType === 'rent' && indexedAmounts[payment.id] ? indexedAmounts[payment.id] : payment.amount;
      const defaultMethod = payment.payment_method || payment.contracts?.payment_method || null;

      const { error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_amount: expectedAmount,
          payment_method: defaultMethod,
          paid_date: payment.due_date })
        .eq("id", payment.id);

      if (error) throw error;
      fetchPayments();
    } catch (error) {
      console.error("Error quick approving payment:", error);
    }
  }

  function calculateStats(data: any[]) {
    const now = new Date();
    const yearMonth = format(now, 'yyyy-MM');
    const today = startOfDay(now);

    let monthlyBase = 0;
    let monthlyIndexedTotal = 0;
    let indexSum = 0;
    let pending = 0;
    let basePending = 0;
    let overdue = 0;
    let partialDebt = 0;

    data.forEach(p => {
      if (!p.due_date || p.status === 'cancelled') return;

      const dueDate = parseISO(p.due_date);
      const pYearMonth = p.due_date.substring(0, 7);
      const isRent = p.displayType === 'rent';

      const dynamicIndexedAmount = isRent && indexedAmounts[p.id] ? indexedAmounts[p.id] : p.amount;
      const baseAmount = p.original_amount || p.amount;

      // Monthly Expected
      if (pYearMonth === yearMonth) {
        const currentDiff = Math.max(0, (dynamicIndexedAmount || 0) - baseAmount);
        monthlyBase += baseAmount;
        monthlyIndexedTotal += dynamicIndexedAmount || 0;
        indexSum += currentDiff;
      }

      // Pending
      if (p.status === 'pending') {
        pending += dynamicIndexedAmount || 0;
        basePending += baseAmount;
      }

      // Overdue
      if (p.status === 'overdue' || (p.status === 'pending' && dueDate < today)) {
        overdue += dynamicIndexedAmount || 0;
      }

      // Partial
      if (p.status === 'paid' && p.paid_amount != null) {
        const diff = (dynamicIndexedAmount || 0) - p.paid_amount;
        if (diff > 1) {
          partialDebt += diff;
        }
      }
    });

    setStats({
      monthlyExpected: monthlyBase,
      monthlyIndexedTotal,
      monthlyIndexSum: indexSum,
      pending,
      basePending,
      overdue,
      partialDebt,
      contractBreakdown: {}
    });
  }

  const formatCurrency = (amount: number) => {
    return amount ? amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0';
  };

  const filteredPayments = payments.filter((p: any) => {
    // Display Mode
    if (displayMode === 'expected' && p.status !== 'pending' && p.status !== 'overdue') return false;
    if (displayMode === 'actual' && p.status !== 'paid') return false;

    // Contract Status
    if (filters.contractStatus && filters.contractStatus !== 'all') {
      if (p.contracts && p.contracts.status !== filters.contractStatus) return false;
    }

    // Date Range
    if (filters.dateRange !== 'all') {
      const dueDate = new Date(p.due_date);
      const today = new Date();
      const thisMonthMatch = dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
      if (filters.dateRange === 'thisMonth' && !thisMonthMatch) return false;
      
      const nextMonthObj = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonthMatch = dueDate.getMonth() === nextMonthObj.getMonth() && dueDate.getFullYear() === nextMonthObj.getFullYear();
      if (filters.dateRange === 'nextMonth' && !nextMonthMatch) return false;

      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      if (filters.dateRange === 'past' && dueDate >= startOfThisMonth) return false;
    }

    // Property
    if (filters.propertyId !== 'all') {
      if (p.contracts?.properties?.id !== filters.propertyId) return false;
    }

    // Payment Method
    if (filters.paymentMethod !== 'all') {
      const pm = p.payment_method || p.contracts?.payment_method;
      if (pm !== filters.paymentMethod) return false;
    }

    return true;
  });

  const sortedFilteredPayments = [...filteredPayments].sort((a, b) => {
    const timeA = new Date((a as any).due_date || 0).getTime();
    const timeB = new Date((b as any).due_date || 0).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const nowForRender = startOfDay(new Date());

  const actionNeededPayments = sortedFilteredPayments.filter((p: any) => {
    const dueDate = new Date(p.due_date);
    return p.status === 'overdue' || (p.status === 'pending' && dueDate < nowForRender);
  });

  const regularPayments = sortedFilteredPayments.filter((p: any) => {
    const dueDate = new Date(p.due_date);
    return !(p.status === 'overdue' || (p.status === 'pending' && dueDate < nowForRender));
  });

  if (loading && payments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  const renderPaymentCard = (payment: any, isActionNeeded: boolean) => {
    const tenant = Array.isArray(payment.contracts?.tenants)
      ? payment.contracts.tenants[0]
      : payment.contracts?.tenants;

    const property = payment.contracts?.properties || { address: payment.property_address || '' };
    const isPaid = payment.status === 'paid';
    const canApprove = payment.status === 'pending';
    const finalAmount = payment.paid_amount || payment.amount;
    const dynamicIndexedAmount = payment.displayType === 'rent' && indexedAmounts[payment.id] ? indexedAmounts[payment.id] : payment.amount;
    
    // Config Status Style
    let statusBg = 'rgba(99, 102, 241, 0.1)';
    let statusColor = '#818CF8';
    let statusLabel = 'צפי חוזי';

    if (payment.status === 'paid') {
      statusBg = 'rgba(16, 185, 129, 0.1)';
      statusColor = '#34D399';
      statusLabel = 'שולם בפועל';
    } else if (payment.status === 'overdue' || isActionNeeded) {
      statusBg = 'rgba(239, 68, 68, 0.1)';
      statusColor = '#F87171';
      statusLabel = 'באיחור / לטיפול';
    }

    return (
      <TouchableOpacity 
         key={payment.id} 
         style={[styles.card, isActionNeeded && styles.cardActionNeeded]}
         onPress={() => setSelectedPayment(payment)}
         activeOpacity={0.8}
      >
        {/* Right side (Dates & Tenant) */}
        <View style={styles.cardRight}>
          <Text style={styles.dateText}>{format(new Date(payment.due_date), 'dd/MM/yy')}</Text>
          <Text style={styles.tenantText} numberOfLines={1}>{tenant?.name || 'דייר מחיקה'}</Text>
        </View>

        {/* Center Status */}
        <View style={styles.cardCenter}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Left side (Amount & Action) */}
        <View style={styles.cardLeft}>
          <Text style={styles.amountText}>₪{formatCurrency(finalAmount)}</Text>
          <Text style={styles.propertyText} numberOfLines={1}>{property.address}</Text>
          {canApprove && (
            <TouchableOpacity style={styles.quickApproveBtn} onPress={() => handleQuickApprove(payment)}>
              <CheckCircle2 color="#10B981" size={18} />
              <Text style={styles.quickApproveText}>סמן שולם</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>לוח תשלומים</Text>

        <View style={styles.headerActions}>
           <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
              <Filter color={showFilters ? '#4F46E5' : '#8A9DB8'} size={20} />
              <Text style={styles.filterBtnText}>סינונים</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.addBtn}>
              <Plus color="#ffffff" size={20} />
           </TouchableOpacity>
        </View>
      </View>

      {/* Stats Unified Flow */}
      <View style={styles.statsContainer}>
          <View style={styles.statBox}>
             <Text style={styles.statBoxTitle}>צפי חודשי</Text>
             <View style={styles.statRow}>
               <View>
                 <Text style={styles.statSmLabel}>ללא הצמדה</Text>
                 <Text style={styles.statBaseVal}>₪{stats.monthlyExpected.toLocaleString()}</Text>
               </View>
               <View style={{alignItems: 'flex-start'}}>
                 <Text style={styles.statSmLabel}>כולל הצמדה</Text>
                 <Text style={[styles.statVal, { color: '#4F46E5' }]}>₪{stats.monthlyIndexedTotal.toLocaleString()}</Text>
                 {stats.monthlyIndexSum > 0 && <Text style={styles.statUp}>+ {stats.monthlyIndexSum.toLocaleString()} תוספת</Text>}
               </View>
             </View>
          </View>
          
          <View style={[styles.statBox, { backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.1)' }]}>
             <Text style={styles.statBoxTitle}>סה"כ ממתין לתשלום</Text>
             <View style={styles.statRow}>
               <View>
                 <Text style={styles.statSmLabel}>ללא הצמדה</Text>
                 <Text style={styles.statBaseVal}>₪{stats.basePending.toLocaleString()}</Text>
               </View>
               <View style={{alignItems: 'flex-start'}}>
                 <Text style={styles.statSmLabel}>כולל הצמדה</Text>
                 <Text style={[styles.statVal, { color: '#F59E0B' }]}>₪{stats.pending.toLocaleString()}</Text>
                 {stats.partialDebt > 1 && <Text style={styles.statDebt}>חסר: ₪{Math.round(stats.partialDebt).toLocaleString()}</Text>}
               </View>
             </View>
          </View>
      </View>

      {/* Toggles Bar */}
      <View style={styles.togglesBar}>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center', paddingHorizontal: 16}}>
            <TouchableOpacity 
               style={[styles.toggleBtn, displayMode === 'all' && styles.toggleBtnActive]}
               onPress={() => setDisplayMode('all')}>
               <Text style={[styles.toggleBtnText, displayMode === 'all' && styles.toggleBtnTextActive]}>הכל</Text>
            </TouchableOpacity>
            <TouchableOpacity 
               style={[styles.toggleBtn, displayMode === 'expected' && styles.toggleBtnActive]}
               onPress={() => setDisplayMode('expected')}>
               <Text style={[styles.toggleBtnText, displayMode === 'expected' && styles.toggleBtnTextActive]}>ממתין לתשלום</Text>
            </TouchableOpacity>
            <TouchableOpacity 
               style={[styles.toggleBtn, displayMode === 'actual' && styles.toggleBtnActive]}
               onPress={() => setDisplayMode('actual')}>
               <Text style={[styles.toggleBtnText, displayMode === 'actual' && styles.toggleBtnTextActive]}>שולם</Text>
            </TouchableOpacity>

            <View style={styles.vDivider} />

            <TouchableOpacity 
               style={[styles.toggleBtn, sortOrder === 'asc' && styles.toggleBtnActive]}
               onPress={() => setSortOrder('asc')}>
               <Text style={[styles.toggleBtnText, sortOrder === 'asc' && styles.toggleBtnTextActive]}>מהישן לחדש</Text>
            </TouchableOpacity>
            <TouchableOpacity 
               style={[styles.toggleBtn, sortOrder === 'desc' && styles.toggleBtnActive]}
               onPress={() => setSortOrder('desc')}>
               <Text style={[styles.toggleBtnText, sortOrder === 'desc' && styles.toggleBtnTextActive]}>מהחדש לישן</Text>
            </TouchableOpacity>
         </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {actionNeededPayments.length > 0 && (
          <View style={styles.sectionGroup}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <AlertCircle color="#EF4444" size={16} />
              </View>
              <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>לטיפול דחוף (איחורים)</Text>
            </View>
            {actionNeededPayments.map(p => renderPaymentCard(p, true))}
          </View>
        )}

        {regularPayments.length > 0 && (
          <View style={styles.sectionGroup}>
            {actionNeededPayments.length > 0 && (
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <CheckCircle2 color="#10B981" size={16} />
                </View>
                <Text style={styles.sectionTitle}>תשלומים קרובים ומשולמים</Text>
              </View>
            )}
            {regularPayments.map(p => renderPaymentCard(p, false))}
          </View>
        )}
        
        {sortedFilteredPayments.length === 0 && (
          <View style={styles.emptyState}>
             <Wallet color="#334155" size={48} />
             <Text style={styles.emptyTitle}>לא נמצאו תשלומים</Text>
             <Text style={styles.emptyDesc}>נסה לשנות את הסינונים או להוסיף תשלום חדש.</Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal Sheet */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.iconBtn}>
                 <X color={colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>מסננים מתקדמים</Text>
              <TouchableOpacity onPress={() => setFilters({ contractStatus: 'all', dateRange: 'all', propertyId: 'all', paymentMethod: 'all' })}>
                 <Text style={styles.resetText}>אפס הכל</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetContent}>
               <Text style={styles.filterTitle}>סטטוס חוזה משויך</Text>
               <View style={styles.filterOptions}>
                  {['all', 'active', 'archived'].map(opt => (
                    <TouchableOpacity 
                      key={opt}
                      style={[styles.filterOptBtn, filters.contractStatus === opt && styles.filterOptBtnActive]}
                      onPress={() => setFilters({...filters, contractStatus: opt})}
                    >
                      <Text style={[styles.filterOptText, filters.contractStatus === opt && {color: '#fff'}]}>
                        {opt === 'all' ? 'הכל' : opt === 'active' ? 'פעיל' : 'בארכיון'}
                      </Text>
                    </TouchableOpacity>
                  ))}
               </View>

               <Text style={[styles.filterTitle, {marginTop: 24}]}>טווח תאריכים</Text>
               <View style={styles.filterOptions}>
                 {[
                   { id: 'all', label: 'הכל' },
                   { id: 'thisMonth', label: 'חודש נוכחי' },
                   { id: 'nextMonth', label: 'חודש הבא' },
                   { id: 'past', label: 'חודשים קודמים' }
                 ].map(opt => (
                   <TouchableOpacity
                     key={opt.id}
                     style={[styles.filterOptBtn, filters.dateRange === opt.id && styles.filterOptBtnActive]}
                     onPress={() => setFilters({ ...filters, dateRange: opt.id })}
                   >
                     <Text style={[styles.filterOptText, filters.dateRange === opt.id && { color: '#fff' }]}>
                       {opt.label}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>

               {uniqueProperties.length > 0 && (
                 <>
                   <Text style={[styles.filterTitle, {marginTop: 24}]}>נכסים</Text>
                   <View style={styles.filterOptions}>
                     <TouchableOpacity
                       style={[styles.filterOptBtn, filters.propertyId === 'all' && styles.filterOptBtnActive]}
                       onPress={() => setFilters({ ...filters, propertyId: 'all' })}
                     >
                       <Text style={[styles.filterOptText, filters.propertyId === 'all' && { color: '#fff' }]}>הכל</Text>
                     </TouchableOpacity>
                     {uniqueProperties.map(prop => (
                       <TouchableOpacity
                         key={prop.id}
                         style={[styles.filterOptBtn, filters.propertyId === prop.id && styles.filterOptBtnActive]}
                         onPress={() => setFilters({ ...filters, propertyId: prop.id })}
                       >
                         <Text style={[styles.filterOptText, filters.propertyId === prop.id && { color: '#fff' }]} numberOfLines={1}>
                           {prop.address}
                         </Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                 </>
               )}

               <Text style={[styles.filterTitle, {marginTop: 24}]}>אופן תשלום</Text>
               <View style={styles.filterOptions}>
                 {[
                   { id: 'all', label: 'הכל' },
                   { id: 'bank_transfer', label: 'העברה בנקאית' },
                   { id: 'cash', label: 'מזומן' },
                   { id: 'cheque', label: "צ'ק" },
                   { id: 'bit', label: 'ביט/אפליקציה' }
                 ].map(opt => (
                   <TouchableOpacity
                     key={opt.id}
                     style={[styles.filterOptBtn, filters.paymentMethod === opt.id && styles.filterOptBtnActive]}
                     onPress={() => setFilters({ ...filters, paymentMethod: opt.id })}
                   >
                     <Text style={[styles.filterOptText, filters.paymentMethod === opt.id && { color: '#fff' }]}>
                       {opt.label}
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>
               <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Details Modal */}
      <Modal visible={!!selectedPayment} animationType="fade" transparent>
         <View style={styles.modalBg}>
            <View style={[styles.bottomSheet, { height: '80%' }]}>
               <View style={styles.sheetHeader}>
                  <TouchableOpacity onPress={() => setSelectedPayment(null)} style={styles.iconBtn}>
                     <X color={colors.text} size={24} />
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>פרטי תשלום</Text>
                  <View style={{ width: 40 }} />
               </View>

               {selectedPayment && (
                 <ScrollView style={styles.sheetContent}>
                    <View style={styles.paymentDetailBox}>
                       <Text style={styles.filterTitle}>כתובת נכס</Text>
                       <Text style={styles.paymentDetailValue}>{selectedPayment.contracts?.properties?.address || selectedPayment.property_address}</Text>
                       
                       <Text style={[styles.filterTitle, {marginTop: 16}]}>שוכר</Text>
                       <Text style={styles.paymentDetailValue}>{Array.isArray(selectedPayment.contracts?.tenants) ? selectedPayment.contracts?.tenants[0]?.name : selectedPayment.contracts?.tenants?.name || 'דייר'}</Text>
                       
                       <Text style={[styles.filterTitle, {marginTop: 16}]}>סכום לתשלום</Text>
                       <Text style={styles.paymentDetailValue}>₪{(selectedPayment.paid_amount || selectedPayment.amount).toLocaleString()}</Text>

                       <Text style={[styles.filterTitle, {marginTop: 16}]}>תאריך יעד</Text>
                       <Text style={styles.paymentDetailValue}>{format(new Date(selectedPayment.due_date), 'dd/MM/yyyy')}</Text>

                       <Text style={[styles.filterTitle, {marginTop: 16}]}>סטטוס</Text>
                       <Text style={[styles.paymentDetailValue, { color: selectedPayment.status === 'paid' ? '#10B981' : '#F59E0B' }]}>
                         {selectedPayment.status === 'paid' ? 'שולם' : selectedPayment.status === 'overdue' ? 'באיחור' : 'בהמתנה'}
                       </Text>
                    </View>

                    {selectedPayment.status !== 'paid' && (
                       <TouchableOpacity 
                          style={[styles.addBtn, { marginTop: 24, paddingVertical: 16 }]} 
                          onPress={() => {
                            handleQuickApprove(selectedPayment);
                            setSelectedPayment(null);
                          }}>
                          <Text style={{color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16}}>סמן כשולם עכשיו</Text>
                       </TouchableOpacity>
                    )}
                 </ScrollView>
               )}
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  headerActions: { flexDirection: 'row-reverse', gap: 12 },
  
  filterBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  filterBtnText: { color: colors.textSecondary, fontWeight: 'bold', marginRight: 6, fontSize: 13 },
  
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  
  statsContainer: { paddingHorizontal: 16, marginBottom: 12 },
  statBox: { backgroundColor: 'rgba(79, 70, 229, 0.05)', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.1)' },
  statBoxTitle: { color: colors.text, fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, opacity: 0.9 },
  statRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  statSmLabel: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
  statBaseVal: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  statUp: { color: '#34D399', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  statDebt: { color: '#EF4444', fontSize: 11, fontWeight: 'bold', marginTop: 4 },

  togglesBar: { paddingVertical: 12 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.border, marginHorizontal: 4 },
  toggleBtnActive: { backgroundColor: '#4F46E5' },
  toggleBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: 'bold' },
  toggleBtnTextActive: { color: colors.text },
  vDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 8, marginTop: 8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  sectionGroup: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold' },

  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  cardActionNeeded: { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  cardRight: { width: 80, alignItems: 'flex-start' },
  dateText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  tenantText: { color: colors.textSecondary, fontSize: 12, marginTop: 4, width: '100%', textAlign: 'right' },
  
  cardCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  cardLeft: { width: 100, alignItems: 'flex-end', position: 'relative' },
  amountText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  propertyText: { color: colors.textSecondary, fontSize: 12, marginTop: 4, width: '100%', textAlign: 'left' },
  
  quickApproveBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  quickApproveText: { color: '#34D399', fontSize: 12, fontWeight: 'bold', marginRight: 4 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, opacity: 0.5 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptyDesc: { color: colors.textSecondary, fontSize: 14, marginTop: 8 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%', borderWidth: 1, borderColor: colors.border },
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 4 },
  resetText: { color: '#4F46E5', fontWeight: 'bold' },
  
  sheetContent: { flex: 1 },
  filterTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  filterOptions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  filterOptBtn: { backgroundColor: colors.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  filterOptBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterOptText: { color: colors.textSecondary, fontWeight: 'bold' },
  paymentDetailBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  paymentDetailValue: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginTop: 4 }
});
