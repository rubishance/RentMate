import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, ActivityIndicator, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, ArrowRight, Percent, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, AlertCircle, Info, X } from 'lucide-react-native';
import { getKnownIndexForDate } from '../lib/index-data.service';
import { calculateSinglePayment, calculateSeriesPayments } from '../lib/calculator.logic';

import { useAppTheme } from '../hooks/useAppTheme';
type LinkageType = 'cpi' | 'housing';
type LinkageSubType = 'known' | 'respect_of';

// Convert Date to YYYY-MM
function formatDateForApi(date: Date | null): string | null {
  if (!date) return null;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}`;
}

function formatDateForDisplay(date: Date | null): string {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function CalculatorScreen({ navigation, route }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const initialTab = route?.params?.tab === 'series' ? 'series' : 'single';
  const [activeTab, setActiveTab] = useState<'single' | 'series'>(initialTab);

  const [linkageType, setLinkageType] = useState<LinkageType>('cpi');
  const [linkageSubType, setLinkageSubType] = useState<LinkageSubType>('known');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // --- Single Calc State ---
  const [baseRent, setBaseRent] = useState('');
  const [baseDate, setBaseDate] = useState<Date | null>(null); 
  const [targetDate, setTargetDate] = useState<Date | null>(null); 
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [linkageCeiling, setLinkageCeiling] = useState('');
  const [indexBaseMinimum, setIndexBaseMinimum] = useState(true);
  
  const [datePickerConfig, setDatePickerConfig] = useState<{show: boolean, mode: 'baseDate'|'targetDate'|'seriesBaseDate'|'paymentDate', paymentId?: string}>({show: false, mode: 'baseDate'});


  const [singleResult, setSingleResult] = useState<{newRent: number, diff: number, bIndexVal: number, cIndexVal: number} | null>(null);

  const [infoModal, setInfoModal] = useState<{title: string, text: string} | null>(null);

  const TOOLTIPS = {
    baseRent: { title: 'סכום בסיס', text: 'הסכום של שכר הדירה המקורי עליו הסכמתם במעמד חתימת החוזה.' },
    baseMonth: { title: 'תאריך בסיס', text: 'תאריך העוגן שממנו מתחילים למדוד. לפי הכתוב בדרך כלל בחוזה בתור חודש חתימת החוזה, או לפי מדד בסיס ספציפי.' },
    targetMonth: { title: 'תאריך יעד', text: 'החודש שעבורו מחושב התשלום העדכני. בדרך כלל חודש המסירה או סוף שנת השכירות.' },
    maxIncrease: { title: 'תקרת מדד', text: 'מגביל את אחוז העלייה המקסימלי בשנה, להגנה מפני קפיצות מדד חריגות. העלייה מצטברת עד שמגיעה לאחוז המקסימלי השנתי. לאחר שנת שכירות, הצבירה מתאפסת עבור השנה הבאה.' },
    actualPaid: { title: 'שולם בפועל', text: 'התשלומים ששולמו בפועל מול הסכום הצפוי. פער הסכומים (והמדד) הוא זה שיוצר את החוב.' }
  };

  const calculateSingle = async () => {
    setErrorMsg('');
    const rent = parseFloat(baseRent);
    const ceiling = parseFloat(linkageCeiling);

    const normBase = formatDateForApi(baseDate);
    const normTarget = formatDateForApi(targetDate);

    if (isNaN(rent) || !normBase || !normTarget) {
      setErrorMsg('נא להזין שכירות ותאריכים תקינים.');
      setSingleResult(null);
      return;
    }

    setIsLoading(true);
    try {
      const bData = await getKnownIndexForDate(linkageType, normBase, linkageSubType);
      const cData = await getKnownIndexForDate(linkageType, normTarget, linkageSubType);

      if (!bData || !cData) {
         setErrorMsg('לא נמצאו מדדים תואמים לתאריכים אלו במאגר.');
         setSingleResult(null);
         setIsLoading(false);
         return;
      }

      const calcResult = calculateSinglePayment({
        baseRent: rent,
        bIndex: bData.value,
        cIndex: cData.value,
        baseDate: baseDate || undefined,
        targetDate: targetDate || undefined,
        ceilingPercentage: isNaN(ceiling) ? undefined : ceiling,
        indexBaseMinimum
      });

      setSingleResult({ 
        newRent: calcResult.newRent, 
        diff: calcResult.diff, 
        bIndexVal: bData.value, 
        cIndexVal: cData.value 
      });
    } catch (e: any) {
      setErrorMsg(e.message || 'שגיאה כללית בחישוב המדד.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Series Calc State ---
  const [seriesBaseRent, setSeriesBaseRent] = useState('');
  const [seriesBaseDate, setSeriesBaseDate] = useState<Date | null>(null);
  const [payments, setPayments] = useState<{id: string, actuallyPaid: string, month: Date | null}[]>([{ id: Date.now().toString(), actuallyPaid: '', month: null }]);
  const [seriesResult, setSeriesResult] = useState<{totalBackPay: number, breakdown: any[]} | null>(null);

  const addPayment = () => {
    setPayments([...payments, { id: Date.now().toString(), actuallyPaid: '', month: null }]);
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const updatePaymentString = (id: string, field: 'actuallyPaid', value: string) => {
    setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const updatePaymentDate = (id: string, value: Date) => {
    setPayments(payments.map(p => p.id === id ? { ...p, month: value } : p));
  };

  const calculateSeries = async () => {
    setErrorMsg('');
    const bRent = parseFloat(seriesBaseRent);
    const normBase = formatDateForApi(seriesBaseDate);

    if (isNaN(bRent) || !normBase) {
      setErrorMsg('נא להזין שכר דירה בסיס ולבחור תאריך חוזה בסיס נכון.');
      return;
    }

    setIsLoading(true);

    try {
      const bData = await getKnownIndexForDate(linkageType, normBase, linkageSubType);
      if (!bData) {
        setErrorMsg('לא נמצא מדד עבור תאריך החוזה בסיס.');
        setIsLoading(false);
        return;
      }

      const mappedPayments = [];
      
      for (const p of payments) {
        const normP = formatDateForApi(p.month);
        const paid = parseFloat(p.actuallyPaid) || 0;

        if (!normP) {
           setErrorMsg(`תאריך תשלום אינו תקין.`);
           setIsLoading(false);
           return;
        }

        const pData = await getKnownIndexForDate(linkageType, normP, linkageSubType);
        if (!pData) {
           setErrorMsg(`חסר מדד לחודש ${formatDateForDisplay(p.month)} במאגר.`);
           setIsLoading(false);
           return;
        }

        mappedPayments.push({
            month: normP,
            paid: paid,
            targetIndex: pData.value
        });
      }

      const sResult = calculateSeriesPayments({
        baseRent: bRent,
        bIndex: bData.value,
        payments: mappedPayments,
        indexBaseMinimum
      });

      setSeriesResult(sResult);
    } catch (e: any) {
      setErrorMsg(e.message || 'שגיאה כללית בחישוב התחשבנות.');
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
        setDatePickerConfig({ ...datePickerConfig, show: false });
    }
    if (selectedDate && event.type === 'set') {
      if (datePickerConfig.mode === 'baseDate') {
        setBaseDate(selectedDate);
      } else if (datePickerConfig.mode === 'targetDate') {
        setTargetDate(selectedDate);
      } else if (datePickerConfig.mode === 'seriesBaseDate') {
        setSeriesBaseDate(selectedDate);
      } else if (datePickerConfig.mode === 'paymentDate' && datePickerConfig.paymentId) {
        updatePaymentDate(datePickerConfig.paymentId, selectedDate);
      }
    }
  };

  const getActivePickerDate = () => {
     if (datePickerConfig.mode === 'baseDate') return baseDate || new Date();
     if (datePickerConfig.mode === 'targetDate') return targetDate || new Date();
     if (datePickerConfig.mode === 'seriesBaseDate') return seriesBaseDate || new Date();
     if (datePickerConfig.mode === 'paymentDate' && datePickerConfig.paymentId) {
         const p = payments.find(p => p.id === datePickerConfig.paymentId);
         return (p && p.month) ? p.month : new Date();
     }
     return new Date();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מחשבון עזר פיננסי</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'single' && styles.activeTab]} 
          onPress={() => setActiveTab('single')}
        >
          <Text style={[styles.tabText, activeTab === 'single' && styles.activeTabText]}>תשלום בודד</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'series' && styles.activeTab]} 
          onPress={() => setActiveTab('series')}
        >
          <Text style={[styles.tabText, activeTab === 'series' && styles.activeTabText]}>סדרת תשלומים</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {errorMsg ? (
           <View style={styles.errorBox}>
              <AlertCircle color="#EF4444" size={20} />
              <Text style={styles.errorText}>{errorMsg}</Text>
           </View>
        ) : null}
        
        {activeTab === 'single' ? (
          <View style={styles.formSection}>
            <Text style={styles.subtitle}>
              חישוב שכר דירה אוטומטי על בסיס נתוני הלמ"ס.
            </Text>

            <View style={styles.form}>
              <View style={styles.labelRow}>
                <Text style={styles.labelInline}>סכום בסיס (₪)</Text>
                <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.baseRent)} style={styles.infoIconBtn}>
                  <Info color={colors.textSecondary} size={14} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholderTextColor="#8A9DB8" value={baseRent} onChangeText={setBaseRent} keyboardType="numeric" />
              </View>

              <View style={styles.row}>
                <View style={[styles.flex1, {marginRight: 8}]}>
                  <View style={styles.labelRow}>
                    <Text style={styles.labelInline}>תאריך בסיס</Text>
                    <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.baseMonth)} style={styles.infoIconBtn}>
                      <Info color={colors.textSecondary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerConfig({show: true, mode: 'baseDate'})}>
                    <Text style={[styles.input, {color: baseDate ? colors.text : colors.textSecondary}]}>{formatDateForDisplay(baseDate) || 'בחירת תאריך'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.flex1, {marginLeft: 8}]}>
                  <View style={styles.labelRow}>
                    <Text style={styles.labelInline}>תאריך יעד</Text>
                    <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.targetMonth)} style={styles.infoIconBtn}>
                      <Info color={colors.textSecondary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerConfig({show: true, mode: 'targetDate'})}>
                    <Text style={[styles.input, {color: targetDate ? colors.text : colors.textSecondary}]}>{formatDateForDisplay(targetDate) || 'בחירת יעד'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
                <Text style={styles.advancedToggleText}>אפשרויות מתקדמות</Text>
                {showAdvanced ? <ChevronUp color="#8A9DB8" size={16} /> : <ChevronDown color="#8A9DB8" size={16} />}
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.advancedContainer}>
                  <View style={styles.labelRow}>
                    <Text style={styles.labelInline}>תקרת מדד (%)</Text>
                    <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.maxIncrease)} style={styles.infoIconBtn}>
                      <Info color={colors.textSecondary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholderTextColor="#8A9DB8" value={linkageCeiling} onChangeText={setLinkageCeiling} keyboardType="numeric" />
                    <Percent color="#8A9DB8" size={16} style={styles.icon} />
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.button} onPress={calculateSingle} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={"#fff"} /> : <Text style={styles.buttonText}>שלוף מדדים וחשב</Text>}
              </TouchableOpacity>
            </View>

            {singleResult !== null && (
              <View style={styles.resultBox}>
                <CheckCircle2 color="#10B981" size={32} style={{ marginBottom: 16 }} />
                <Text style={styles.resultTitle}>שכר הדירה המעודכן הוא</Text>
                <Text style={styles.resultValue}>₪ {singleResult.newRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                {singleResult.diff > 0 && (
                  <Text style={styles.resultDiff}>
                    אותר מדד בסיס {singleResult.bIndexVal.toLocaleString()} לעומת מדד עדכני {singleResult.cIndexVal.toLocaleString()}
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.formSection}>
            <Text style={[styles.subtitle, {marginTop: 0}]}>
              הזן את החודשים ששולמו כדי לחשב התחשבנות תקופתית בצמוד לאחזור מדדים אוטומטי.
            </Text>

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={[styles.flex1, {marginRight: 8}]}>
                  <View style={styles.labelRow}>
                    <Text style={styles.labelInline}>סכום בסיס (₪)</Text>
                    <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.baseRent)} style={styles.infoIconBtn}>
                      <Info color={colors.textSecondary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput style={styles.input} placeholderTextColor="#8A9DB8" value={seriesBaseRent} onChangeText={setSeriesBaseRent} keyboardType="numeric" />
                  </View>
                </View>
                <View style={[styles.flex1, {marginLeft: 8}]}>
                  <View style={styles.labelRow}>
                    <Text style={styles.labelInline}>תאריך בסיס</Text>
                    <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.baseMonth)} style={styles.infoIconBtn}>
                      <Info color={colors.textSecondary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerConfig({show: true, mode: 'seriesBaseDate'})}>
                    <Text style={[styles.input, {color: seriesBaseDate ? colors.text : colors.textSecondary}]}>{formatDateForDisplay(seriesBaseDate) || 'בחירת תאריך'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />
              
              {payments.map((p, idx) => (
                <View key={p.id} style={styles.paymentRow}>
                  <View style={[styles.flex1, {marginLeft: 8}]}>
                    <View style={styles.labelRowMini}>
                      <Text style={styles.labelMiniInline}>שולם בפועל</Text>
                      <TouchableOpacity onPress={() => setInfoModal(TOOLTIPS.actualPaid)} style={styles.infoIconBtn}>
                        <Info color={colors.textSecondary} size={14} />
                      </TouchableOpacity>
                    </View>
                    <TextInput style={styles.inputMini} placeholder="₪" placeholderTextColor="#8A9DB8" value={p.actuallyPaid} onChangeText={(v) => updatePaymentString(p.id, 'actuallyPaid', v)} keyboardType="numeric" />
                  </View>
                  <View style={[styles.flex1, {marginLeft: 8}]}>
                    <View style={styles.labelRowMini}>
                      <Text style={styles.labelMiniInline}>חודש תשלום</Text>
                    </View>
                    <TouchableOpacity style={[styles.inputMini, {justifyContent: 'center'}]} onPress={() => setDatePickerConfig({show: true, mode: 'paymentDate', paymentId: p.id})}>
                       <Text style={{color: p.month ? colors.text : colors.textSecondary, textAlign: 'right'}}>{formatDateForDisplay(p.month) || 'בחר תאריך'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removePayment(p.id)} style={styles.deleteBtn}>
                    <Trash2 color="#EF4444" size={20} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addBtn} onPress={addPayment}>
                <Plus color="#4F46E5" size={20} style={{marginLeft: 8}} />
                <Text style={styles.addBtnText}>הוסף חודש לתשלום</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, {marginTop: 24}]} onPress={calculateSeries} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>שלוף מדדים וחשב התחשבנות</Text>}
              </TouchableOpacity>
            </View>

            {seriesResult !== null && (
              <View style={[styles.resultBox, {borderColor: seriesResult.totalBackPay > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)', backgroundColor: seriesResult.totalBackPay > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}]}>
                <Text style={[styles.resultTitle, {color: seriesResult.totalBackPay > 0 ? '#F87171' : '#34D399'}]}>
                  {seriesResult.totalBackPay > 0 ? 'יתרת חוב מצטברת (לשלם)' : 'אין יתרת חוב'}
                </Text>
                <Text style={[styles.resultValue, {color: seriesResult.totalBackPay > 0 ? '#EF4444' : '#10B981'}]}>
                  ₪ {seriesResult.totalBackPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* DatePicker Modals */}
      {datePickerConfig.show && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
              <View style={{backgroundColor: colors.surface, padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24}}>
                <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16}}>
                  <TouchableOpacity onPress={() => setDatePickerConfig({...datePickerConfig, show: false})}>
                    <Text style={{color: '#4F46E5', fontSize: 18, fontWeight: 'bold'}}>אישור / סגירה</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={getActivePickerDate()}
                  mode="date"
                  display="spinner"
                  onChange={onChangeDate}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={getActivePickerDate()}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )
      )}


      {/* Info Modal */}
      <Modal visible={!!infoModal} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.infoModalBox}>
            <View style={styles.infoModalHeader}>
              <TouchableOpacity onPress={() => setInfoModal(null)} style={styles.closeIconBtn}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.infoModalTitle}>{infoModal?.title}</Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={styles.infoModalText}>{infoModal?.text}</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  
  tabsContainer: { flexDirection: 'row-reverse', marginHorizontal: 24, marginTop: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#4F46E5' },
  tabText: { color: colors.textSecondary, fontWeight: 'bold' },
  activeTabText: { color: colors.text },

  errorBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16, marginBottom: 24, width: '100%' },
  errorText: { color: '#F87171', fontSize: 14, marginRight: 8, flex: 1, textAlign: 'right' },

  content: { flexGrow: 1, padding: 24, alignItems: 'center' },
  formSection: { width: '100%', alignItems: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 30, textAlign: 'center', lineHeight: 24 },
  form: { width: '100%', gap: 16 },
  row: { flexDirection: 'row-reverse', width: '100%' },
  flex1: { flex: 1 },
  label: { color: colors.text, fontSize: 14, fontWeight: '500', textAlign: 'right', marginTop: 8 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  labelInline: { color: colors.text, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  infoIconBtn: { padding: 4, marginRight: 4, transform: [{ translateY: 1 }] },
  closeIconBtn: { padding: 4 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 60 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', paddingRight: 12 },
  icon: { marginLeft: 12 },
  button: { backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  
  advancedToggle: { flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', marginTop: 8 },
  advancedToggleText: { color: colors.textSecondary, fontSize: 14, marginLeft: 8 },
  advancedContainer: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: colors.border },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  paymentRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', marginBottom: 12 },
  labelMini: { color: colors.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 4 },
  labelRowMini: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 2 },
  labelMiniInline: { color: colors.textSecondary, fontSize: 12, textAlign: 'right' },
  inputMini: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14, textAlign: 'right', paddingHorizontal: 12, height: 48 },
  deleteBtn: { height: 48, justifyContent: 'center', paddingHorizontal: 12 },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#4F46E5', borderRadius: 16, height: 50 },
  addBtnText: { color: '#4F46E5', fontWeight: 'bold' },

  resultBox: { marginTop: 40, width: '100%', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', borderRadius: 24, padding: 24, alignItems: 'center' },
  resultTitle: { color: '#34D399', fontSize: 16, marginBottom: 8 },
  resultValue: { color: '#10B981', fontSize: 32, fontWeight: 'bold' },
  resultDiff: { color: '#34D399', fontSize: 14, marginTop: 8, opacity: 0.8 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  infoModalBox: { width: '100%', backgroundColor: colors.surface, borderRadius: 24, padding: 24, paddingBottom: 32, borderWidth: 1, borderColor: colors.border },
  infoModalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  infoModalTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  infoModalText: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'right' }
});
