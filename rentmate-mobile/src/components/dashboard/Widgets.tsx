import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Alert, Platform, Modal, LayoutAnimation } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { Building2, AlertTriangle, CheckCircle, Clock, CreditCard, TrendingUp, TrendingDown, HardDrive, Calculator, Cloud, Info, FileSignature, Users, MessageCircle, ScanLine, Bot, Zap, Link, FileText, Search, Activity, Settings2, Map as MapIcon, X, ChevronUp, ChevronDown, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { Colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { 
  fetchUserTrackedRegions, 
  fetchAllAvailableRegions, 
  fetchRentalDataForRegions, 
  addUserTrackedRegion, 
  removeUserTrackedRegion 
} from '../../lib/region-data.service';
import { fetchAnnualRevenueTrend, MonthlyRevenue } from '../../lib/revenue.service';

const translateCity = (city: string) => {
  const map: Record<string, string> = {
    'Tel Aviv': 'תל אביב',
    'Jerusalem': 'ירושלים',
    'Haifa': 'חיפה',
    'Rishon LeZion': 'ראשון לציון',
    'Petah Tikva': 'פתח תקווה',
    'Ashdod': 'אשדוד',
    'Netanya': 'נתניה',
    'Be\'er Sheva': 'באר שבע',
    'Holon': 'חולון',
    'Bnei Brak': 'בני ברק',
    'Ramat Gan': 'רמת גן',
    'Rehovot': 'רחובות',
    'Bat Yam': 'בת ים',
    'Ashkelon': 'אשקלון',
    'Kfar Saba': 'כפר סבא',
    'Herzliya': 'הרצליה',
    'Hadera': 'חדרה',
    'Modi\'in': 'מודיעין',
    'Modiin': 'מודיעין',
    'Ra\'anana': 'רעננה',
    'Raanana': 'רעננה',
    'Lod': 'לוד',
    'Ramla': 'רמלה',
    'Nahariya': 'נהריה',
    'Modi\'in-Maccabim-Re\'ut': 'מודיעין-מכבים-רעות',
    'Kiryat Ata': 'קרית אתא',
    'Givatayim': 'גבעתיים',
    'Kiryat Gat': 'קרית גת',
    'Eilat': 'אילת',
    'Afula': 'עפולה',
    'Hod Hasharon': 'הוד השרון',
    'Rosh HaAyin': 'ראש העין',
    'Rosh Haayin': 'ראש העין',
    'Ramat HaSharon': 'רמת השרון',
    'Karmiel': 'כרמיאל',
    'Tiberias': 'טבריה',
    'Kiryat Motzkin': 'קרית מוצקין',
    'Kiryat Yam': 'קרית ים',
    'Kiryat Bialik': 'קרית ביאליק',
    'Nes Ziona': 'נס ציונה',
    'Ness Ziona': 'נס ציונה',
    'Or Yehuda': 'אור יהודה',
    'Qiryat Ono': 'קרית אונו',
    'Kiryat Ono': 'קרית אונו',
    'Yehud': 'יהוד',
    'Dimona': 'דימונה',
    'Tzfat': 'צפת',
    'Safed': 'צפת',
    'Sderot': 'שדרות',
    'Bait Shemesh': 'בית שמש',
    'Beth Shemesh': 'בית שמש',
    'Beit Shemesh': 'בית שמש',
    'Elad': 'אלעד',
    'Yavne': 'יבנה',
    'Kiryat Malakhi': 'קריית מלאכי',
    'Beer Sheba': 'באר שבע',
    'Beer Sheva': 'באר שבע',
    'Hod HaSharon': 'הוד השרון',
    'Akko': 'עכו',
    'Central': 'אזור המרכז',
    'North': 'אזור הצפון',
    'South': 'אזור הדרום',
  };
  return map[city] || city;
};

const useStyles = (colors: Colors) => StyleSheet.create({
  widgetBase: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, width: Dimensions.get('window').width - 48, alignSelf: 'center' },
  widgetHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  widgetTitle: { color: colors.text, fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  
  usageContainer: { padding: 16 },
  usageRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  usageTitle: { color: colors.text, fontSize: 14, fontWeight: 'bold' },
  usageText: { color: colors.textSecondary, fontSize: 14 },
  usageBarContainer: { height: 6, backgroundColor: colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
  usageBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  
  heroContainer: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, elevation: 0, paddingBottom: 0 },
  heroGreeting: { color: colors.text, fontSize: 32, fontWeight: '900', textAlign: 'right', marginBottom: 4 },
  heroSubtitle: { color: colors.textSecondary, fontSize: 16, textAlign: 'right', marginBottom: 16 },
  alertBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.warningLight, padding: 16, borderRadius: 16 },
  alertText: { color: colors.warning, fontSize: 14, fontWeight: '500', marginRight: 8, flex: 1, textAlign: 'right' },

  financialContainer: { },
  financialBigText: { color: colors.text, fontSize: 40, fontWeight: '900', textAlign: 'right', marginVertical: 4 },
  financialSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'right', marginBottom: 20 },
  financialBreakdown: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  finCol: { flex: 1, alignItems: 'flex-start' },
  finColLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
  finColValueSuccess: { color: colors.success, fontSize: 20, fontWeight: 'bold' },
  finColValuePending: { color: colors.warning, fontSize: 20, fontWeight: 'bold' },

  smartActionsContainer: { marginBottom: 16 },
  bentoBtn: { width: 110, height: 110, backgroundColor: colors.surface, borderRadius: 20, marginLeft: 16, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 3 },
  bentoIconWrapper: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bentoBtnText: { color: colors.text, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },

  timelineContainer: { },
  timelineItem: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginTop: 8 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger, marginLeft: 12, marginTop: 4 },
  timelineContent: { flex: 1, alignItems: 'flex-end' },
  timelineTextMain: { color: colors.text, fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  timelineTextSub: { color: colors.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 2 },

  indexRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  indexName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  indexValue: { color: colors.danger, fontSize: 18, fontWeight: 'bold' },
  indexSub: { color: colors.textSecondary, fontSize: 12, textAlign: 'right', marginTop: 8 },

  mockChart: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, marginTop: 10, paddingHorizontal: 20 },
  chartBar: { width: 30, backgroundColor: colors.success, borderTopLeftRadius: 6, borderTopRightRadius: 6, opacity: 0.8 },

  protocolContainer: { borderColor: colors.primaryLight },
  iconBoxIndigo: { padding: 8, backgroundColor: colors.primaryLight, borderRadius: 12, marginRight: 12 },
  
  quickActionsContainer: { borderColor: colors.warningLight },
  iconBoxAmber: { padding: 8, backgroundColor: colors.warningLight, borderRadius: 12, marginRight: 12 },
  quickActionsGrid: { marginTop: 8 },
  quickActionItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  qaIconWrapper: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  qaItemTitle: { color: colors.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right' },
  qaItemSub: { color: colors.textSecondary, fontSize: 13, textAlign: 'right', marginTop: 2 },

  protocolText: { color: colors.textSecondary, fontSize: 14, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  protocolBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.warning },
  protocolBtnText: { color: colors.warning, fontWeight: 'bold', fontSize: 14 },

  tenantsContainer: { borderColor: colors.infoLight },
  iconBoxCyan: { padding: 8, backgroundColor: colors.infoLight, borderRadius: 12, marginRight: 12 },
  tenantsBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12 },
  tenantsBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  marketInsightBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.primaryLight, padding: 12, borderRadius: 12, marginTop: 16 },
  marketInsightText: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
  
  // Custom inputs for widgets
  widgetInputRow: { flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 12, gap: 8 },
  widgetInput: { flex: 1, height: 40, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, color: colors.text, textAlign: 'right', fontSize: 13 },
  widgetCalcBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  widgetCalcText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  
  toggleRow: { flexDirection: 'row-reverse', backgroundColor: colors.background, borderRadius: 8, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#ffffff', fontWeight: 'bold' }
});

// 1. Usage Widget
export const UsageOverviewWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  return (
    <View style={[styles.widgetBase, styles.usageContainer]}>
      <View style={styles.usageRow}>
        <Text style={styles.usageTitle}>{t('solo_plan')}</Text>
        <Text style={styles.usageText}>{t('assets_count')}</Text>
      </View>
      <View style={styles.usageBarContainer}>
        <View style={[styles.usageBarFill, {width: '100%'}]} />
      </View>
    </View>
  );
};

// 2. Dashboard Hero / Briefing
export const DashboardHeroWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(' ')[0]);
      }
    };
    fetchUser();
  }, []);

  return (
    <View style={[styles.widgetBase, styles.heroContainer]}>
      <Text style={styles.heroGreeting}>{t('greeting', { name: userName || '' })}</Text>
      <Text style={styles.heroSubtitle}>{t('daily_summary')}</Text>
      <View style={styles.alertBox}>
        <AlertTriangle color={colors.warning} size={20} />
        <Text style={styles.alertText}>{t('contract_ending_alert')}</Text>
      </View>
    </View>
  );
};

// 3. Financial Health
export const FinancialHealthWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  return (
    <View style={[styles.widgetBase, styles.financialContainer]}>
      <Text style={styles.widgetTitle}>{t('financial_month')}</Text>
      <Text style={styles.financialBigText}>₪5,500</Text>
      <Text style={styles.financialSubtitle}>{t('current_income')}</Text>
      <View style={styles.financialBreakdown}>
        <View style={styles.finCol}>
            <Text style={styles.finColLabel}>{t('paid')}</Text>
            <Text style={styles.finColValueSuccess}>₪0</Text>
        </View>
        <View style={styles.finCol}>
            <Text style={styles.finColLabel}>{t('pending')}</Text>
            <Text style={styles.finColValuePending}>₪5,500</Text>
        </View>
      </View>
      <View style={styles.usageBarContainer}>
        <View style={[styles.usageBarFill, {width: '10%', backgroundColor: colors.success}]} />
      </View>
    </View>
  );
};

// 4. Smart Actions Row (Bento Grid Style)
export const SmartActionsWidget = () => {
  const { t } = useAppTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.smartActionsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 24}}>
          <TouchableOpacity style={styles.bentoBtn} onPress={() => navigation.navigate('Properties')}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.successLight }]}>
              <Building2 color={colors.success} size={28} />
            </View>
            <Text style={styles.bentoBtnText}>{t('my_properties')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bentoBtn} onPress={() => navigation.navigate('TenantsList')}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.infoLight }]}>
              <Users color={colors.info} size={28} />
            </View>
            <Text style={styles.bentoBtnText}>{t('manage_tenants')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bentoBtn} onPress={() => navigation.navigate('Calculator')}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.primaryLight }]}>
                <Calculator color={colors.primary} size={28} />
            </View>
            <Text style={styles.bentoBtnText}>{t('financial_calculator')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bentoBtn} onPress={() => navigation.navigate('AIScanner')}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.successLight }]}>
                <ScanLine color={colors.success} size={28} />
            </View>
            <Text style={styles.bentoBtnText}>{t('ai_scanner')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bentoBtn} onPress={() => navigation.navigate('RentyAssistant')}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.infoLight }]}>
                <Bot color={colors.info} size={28} />
            </View>
            <Text style={styles.bentoBtnText}>{t('personal_assistant')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bentoBtn} onPress={() => navigation.navigate('Payments')}>
            <View style={[styles.bentoIconWrapper, { backgroundColor: colors.warningLight }]}>
                <CreditCard color={colors.warning} size={28} />
            </View>
            <Text style={styles.bentoBtnText}>{t('payment_report')}</Text>
          </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// 5. Timeline / Upcoming
export const TimelineWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  return (
    <View style={[styles.widgetBase, styles.timelineContainer]}>
      <View style={styles.widgetHeader}>
        <Clock color={colors.primary} size={20} />
        <Text style={styles.widgetTitle}>{t('what_to_handle')}</Text>
      </View>
      <View style={styles.timelineItem}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineContent}>
            <Text style={styles.timelineTextMain}>{t('rent_payment_task')}</Text>
            <Text style={styles.timelineTextSub}>{t('today_midnight')}</Text>
        </View>
      </View>
    </View>
  );
};

// 6. Index Pulse
export const IndexPulseWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State matching the screenshot's data
  const [savedPulses, setSavedPulses] = useState([
    {
      id: 'cpi-1',
      type: 'cpi',
      title: 'מדד המחירים לצרכן',
      method: 'מדד קובע',
      currentValue: '103.50',
      currentDate: '2026-02',
      baseValue: '102.30',
      baseDate: '28/01/2023',
      change: '+1.17%',
      isPositive: true
    },
    {
      id: 'housing-1',
      type: 'housing',
      title: 'מדד שירותי דיור',
      method: 'מדד ידוע',
      currentValue: '105.50',
      currentDate: '2026-02',
      baseValue: '105.10',
      baseDate: '28/02/2026',
      change: '+0.38%',
      isPositive: true
    }
  ]);
  
  const [editingPulses, setEditingPulses] = useState([...savedPulses]);

  const [datePickerConfig, setDatePickerConfig] = useState<{show: boolean, pulseId: string|null}>({show: false, pulseId: null});

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerConfig({ ...datePickerConfig, show: false });
    }
    if (selectedDate && event.type === 'set' && datePickerConfig.pulseId) {
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const y = selectedDate.getFullYear();
      updateBaseDate(datePickerConfig.pulseId, `${d}/${m}/${y}`);
    }
  };

  const getActivePickerDate = () => {
    if (datePickerConfig.pulseId) {
      const pulse = editingPulses.find(p => p.id === datePickerConfig.pulseId);
      if (pulse && pulse.baseDate) {
        const parts = pulse.baseDate.split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    return new Date();
  };
  const toggleMethod = (id: string, method: string) => {
    setEditingPulses(prev => prev.map(p => p.id === id ? { ...p, method } : p));
  };

  const toggleType = (id: string, type: string, title: string) => {
    setEditingPulses(prev => prev.map(p => p.id === id ? { ...p, type, title } : p));
  };

  const removePulse = (id: string) => {
    setEditingPulses(prev => prev.filter(p => p.id !== id));
  };

  const addPulse = () => {
    setEditingPulses(prev => [...prev, {
      id: `new-${Date.now()}`,
      type: 'cpi',
      title: 'מדד המחירים לצרכן',
      method: 'מדד קובע',
      currentValue: '100.00',
      currentDate: '2026-03',
      baseValue: '100.00',
      baseDate: '01/01/2026',
      change: '+0.00%',
      isPositive: true
    }]);
  };

  const updateBaseDate = (id: string, newDate: string) => {
    setEditingPulses(prev => prev.map(p => p.id === id ? { ...p, baseDate: newDate } : p));
  };

  return (
    <View style={[styles.widgetBase, { padding: 16, borderColor: colors.border, borderWidth: 1 }]}>
      {/* Header */}
      {!isSettingsOpen ? (
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <View style={{ padding: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, marginLeft: 12 }}>
              <Activity color="#10b981" size={20} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>מעקב מדדים</Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingPulses(savedPulses); setIsSettingsOpen(true); }} style={{ padding: 4 }}>
            <Settings2 color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <View style={{ padding: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, marginLeft: 12 }}>
              <Settings2 color="#6366f1" size={20} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>הגדרות תצוגה</Text>
          </View>
          <TouchableOpacity onPress={() => setIsSettingsOpen(false)} style={{ padding: 4 }}>
            <X color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      )}
      
      {!isSettingsOpen ? (
        <View>
          {savedPulses.map((pulse, index) => (
            <View key={pulse.id} style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(99, 102, 241, 0.15)',
              marginBottom: index === savedPulses.length - 1 ? 0 : 16
            }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 16, textAlign: 'right' }}>
                  <Text style={{ fontWeight: 'bold', color: colors.primary }}>{pulse.title}</Text>
                  <Text style={{ color: colors.textSecondary }}> , {pulse.method}</Text>
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                {/* Base Index Column */}
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textSecondary, marginBottom: 4, textAlign: 'right' }}>מדד בסיס</Text>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, opacity: 0.9, textAlign: 'right' }}>{pulse.baseValue}</Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4 }}>
                    <Clock color={colors.textSecondary} size={12} style={{ marginLeft: 4, opacity: 0.7 }} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>{pulse.baseDate}</Text>
                  </View>
                </View>
                
                {/* Divider */}
                <View style={{ width: 1, height: 48, backgroundColor: colors.border, marginHorizontal: 16, alignSelf: 'center' }} />

                {/* Current Index Column */}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.textSecondary, marginBottom: 4, textAlign: 'left' }}>מדד נוכחי</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'left' }}>{pulse.currentValue}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Clock color={colors.textSecondary} size={12} style={{ marginRight: 4, opacity: 0.7 }} />
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>{pulse.currentDate}</Text>
                  </View>
                </View>
              </View>
              
              {/* Percentage Change */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                <View style={{ 
                  flexDirection: 'row-reverse', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: pulse.isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  borderRadius: 8,
                  width: '100%'
                }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' }}>
                    {pulse.isPositive ? <TrendingUp color="#10b981" size={20} /> : <TrendingDown color="#ef4444" size={20} />}
                    <Text style={{ 
                      color: pulse.isPositive ? '#10b981' : '#ef4444', 
                      fontWeight: '900', 
                      fontSize: 16, 
                      marginRight: 8 // margin for RTL spacing
                    }}>
                      {pulse.change}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginBottom: 12, textTransform: 'uppercase' }}>הגדרות מעקב אישיות</Text>
          
          {editingPulses.map((pulse) => (
            <View key={pulse.id} style={{ backgroundColor: colors.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
               <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                 <View style={{ alignItems: 'flex-start', flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginBottom: 8, alignSelf: 'flex-start' }}>סוג המדד:</Text>
                    <View style={[styles.toggleRow, { alignSelf: 'flex-start', width: '100%' }]}>
                      <TouchableOpacity onPress={() => toggleType(pulse.id, 'housing', 'מדד שירותי דיור')} style={[styles.toggleBtn, pulse.type === 'housing' && styles.toggleBtnActive]}>
                        <Text style={[styles.toggleText, pulse.type === 'housing' && styles.toggleTextActive]}>מחירי הדיור</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleType(pulse.id, 'cpi', 'מדד המחירים לצרכן')} style={[styles.toggleBtn, pulse.type === 'cpi' && styles.toggleBtnActive]}>
                        <Text style={[styles.toggleText, pulse.type === 'cpi' && styles.toggleTextActive]}>המחירים לצרכן</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginBottom: 8, alignSelf: 'flex-start' }}>שיטת חישוב:</Text>
                    <View style={[styles.toggleRow, { alignSelf: 'flex-start', width: '100%' }]}>
                      <TouchableOpacity onPress={() => toggleMethod(pulse.id, 'מדד ידוע')} style={[styles.toggleBtn, pulse.method === 'מדד ידוע' && styles.toggleBtnActive]}>
                        <Text style={[styles.toggleText, pulse.method === 'מדד ידוע' && styles.toggleTextActive]}>מדד ידוע</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleMethod(pulse.id, 'מדד קובע')} style={[styles.toggleBtn, pulse.method === 'מדד קובע' && styles.toggleBtnActive]}>
                        <Text style={[styles.toggleText, pulse.method === 'מדד קובע' && styles.toggleTextActive]}>מדד קובע</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={[styles.widgetInputRow, { width: '100%' }]}>
                      <TouchableOpacity 
                        style={[styles.widgetInput, { flex: 1, justifyContent: 'center' }]}
                        onPress={() => setDatePickerConfig({show: true, pulseId: pulse.id})}
                      >
                         <Text style={{color: pulse.baseDate ? colors.text : colors.textSecondary, textAlign: 'right'}}>
                           {pulse.baseDate || 'תאריך בסיס (DD/MM/YYYY)'}
                         </Text>
                      </TouchableOpacity>
                    </View>
                 </View>
                 <TouchableOpacity onPress={() => removePulse(pulse.id)} style={{ padding: 8, marginRight: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, alignSelf: 'flex-start' }}>
                   <Trash2 color="#ef4444" size={16} />
                 </TouchableOpacity>
               </View>
            </View>
          ))}
          
          <TouchableOpacity onPress={addPulse} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, borderStyle: 'dashed', marginBottom: 20 }}>
            <Plus color={colors.textSecondary} size={16} style={{ marginLeft: 8 }} />
            <Text style={{ color: colors.textSecondary, fontWeight: 'bold', fontSize: 14 }}>הוסף מדד למעקב</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' }}
            onPress={() => {
              setSavedPulses(editingPulses);
              setIsSettingsOpen(false);
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>שמור הגדרות</Text>
          </TouchableOpacity>
        </View>
      )}

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
    </View>
  );
};

// 7. Storage Stats
export const StorageStatsWidget = () => {
  const { t, language } = useAppTranslation();
  const isRTL = language !== 'en';
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  
  const [stats, setStats] = useState<any>(null);
  const [quotaMb, setQuotaMb] = useState<number>(500);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchStorage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: usage } = await supabase
        .from('user_storage_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (usage) {
        setStats(usage);
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_plans(max_storage_mb)')
        .eq('id', user.id)
        .maybeSingle() as { data: any };
        
      if (profile?.subscription_plans) {
        setQuotaMb(profile.subscription_plans.max_storage_mb || 500);
      }
    };
    
    fetchStorage();
  }, []);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const usageBytes = stats?.total_bytes || 0;
  const usageMb = (usageBytes / (1024 * 1024)).toFixed(1);
  const quotaText = quotaMb === -1 ? 'ללא הגבלה' : t('from_quota', { quota: quotaMb.toString() });
  const pct = quotaMb === -1 ? 0 : Math.min(100, Math.round((usageBytes / (quotaMb * 1024 * 1024)) * 100));

  const formatItem = (bytes: number, count: number) => {
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return isRTL ? `${count} קבצים, ${mb} MB` : `${mb} MB, ${count} files`;
  };

  return (
    <View style={[styles.widgetBase, styles.timelineContainer, { overflow: 'hidden' }]}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7}>
        <View style={[styles.widgetHeader, { marginBottom: 0 }]}>
          <Cloud color={colors.info} size={20} />
          <Text style={styles.widgetTitle}>{t('cloud_usage')}</Text>
          <View style={{ flex: 1 }} />
          {isExpanded ? <ChevronUp color={colors.textSecondary} size={20} /> : <ChevronDown color={colors.textSecondary} size={20} />}
        </View>
        <View style={[styles.usageRow, { marginTop: 12 }]}>
          <Text style={styles.usageText}>{usageMb} MB</Text>
          <Text style={styles.usageText}>{quotaText}</Text>
        </View>
        <View style={styles.usageBarContainer}>
          <View style={[styles.usageBarFill, {width: `${pct}%`, backgroundColor: colors.info}]} />
        </View>
      </TouchableOpacity>
      
      {isExpanded && stats && (
        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '500' }}>תמונות ווידאו נכס</Text>
            <Text style={{ color: colors.textSecondary }}>{formatItem(stats.media_bytes || 0, stats.media_count || 0)}</Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '500' }}>מסמכים וחוזים</Text>
            <Text style={{ color: colors.textSecondary }}>{formatItem(stats.documents_bytes || 0, stats.documents_count || 0)}</Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '500' }}>ראיות פרוטוקול</Text>
            <Text style={{ color: colors.textSecondary }}>{formatItem(stats.protocols_bytes || 0, stats.protocols_count || 0)}</Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '500' }}>חשבונות (ארכיון)</Text>
            <Text style={{ color: colors.textSecondary }}>{formatItem(stats.utilities_bytes || 0, stats.utilities_count || 0)}</Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '500' }}>תחזוקה (קבלות/שרטוטים)</Text>
            <Text style={{ color: colors.textSecondary }}>{formatItem(stats.maintenance_bytes || 0, stats.maintenance_count || 0)}</Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '500' }}>מסמכי שוכרים</Text>
            <Text style={{ color: colors.textSecondary }}>{formatItem(stats.tenant_bytes || 0, stats.tenant_count || 0)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// 8. Revenue Trend
export const RevenueTrendWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  
  const [selectedView, setSelectedView] = useState<number>(6); // 3, 6, 9, 12
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const trend = await fetchAnnualRevenueTrend(session.user.id, 12);
        setData(trend);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  const chartData = data.slice(-selectedView);
  
  // Find max value between actual and expected matching selected filter
  const maxValueRaw = Math.max(
    1000, 
    ...chartData.map(d => Math.max(d.expected, d.actual))
  );

  // Pad max value a little for headroom (10% extra, rounded up)
  const maxValue = Math.ceil(maxValueRaw * 1.1 / 1000) * 1000;

  const formatYAxis = (val: number) => {
    if (val >= 1000) return (val / 1000).toFixed(1).replace('.0', '') + 'k';
    return val.toString();
  };

  const maxLabel = formatYAxis(maxValue);
  const midLabel = formatYAxis(maxValue / 2);

  return (
    <View style={[styles.widgetBase, styles.timelineContainer, { zIndex: 10 }]}>
      <View style={[styles.widgetHeader, { zIndex: 11 }]}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
          <CreditCard color={colors.success} size={20} />
          <Text style={styles.widgetTitle}>{t('annual_trend')}</Text>
        </View>
        
        <View style={{ flex: 1 }} />
        
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
          {!isCollapsed && (
            <View style={{ position: 'relative', zIndex: 12 }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surfaceLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={{ color: colors.text, fontSize: 13, marginLeft: 6 }}>{selectedView} חודשים</Text>
                {showDropdown ? <ChevronUp color={colors.textSecondary} size={16} /> : <ChevronDown color={colors.textSecondary} size={16} />}
              </TouchableOpacity>
              
              {showDropdown && (
                <View style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, width: 110, zIndex: 999 }}>
                  {[3, 6, 9, 12].map((months) => (
                    <TouchableOpacity 
                      key={months}
                      style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: months !== 12 ? 1 : 0, borderBottomColor: colors.border }}
                      onPress={() => {
                        setSelectedView(months);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={{ textAlign: 'right', color: selectedView === months ? colors.primary : colors.text, fontWeight: selectedView === months ? 'bold' : 'normal' }}>{months} חודשים</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity onPress={toggleCollapse} style={{ padding: 6, marginRight: !isCollapsed ? 8 : 0 }}>
            {isCollapsed ? <ChevronDown color={colors.textSecondary} size={20} /> : <ChevronUp color={colors.textSecondary} size={20} />}
          </TouchableOpacity>
        </View>
      </View>

      {!isCollapsed && (
        <>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 12, marginBottom: 4, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginLeft: 16 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 6 }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>תשלום בפועל</Text>
            </View>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, opacity: 0.8, marginLeft: 6 }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>תשלום צפוי</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', height: 160, marginTop: 10, zIndex: 1 }}>
              <View style={{ justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 8, height: 136 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{maxLabel}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{midLabel}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>0</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingLeft: 4 }}>
                  {chartData.map((item, idx) => {
                    const expectedPct = Math.min((item.expected / maxValue) * 100, 100);
                    const actualPct = Math.min((item.actual / maxValue) * 100, 100);
                    const baseWidth = selectedView > 6 ? 4 : 8;
                    const expectedWidth = baseWidth;
                    const actualWidth = baseWidth * 2;
                    
                    return (
                      <View key={idx} style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', height: '100%', flexDirection: 'row-reverse' }}>
                        {/* Expected (Green) */}
                        <View style={{ width: expectedWidth, height: `${expectedPct}%`, backgroundColor: colors.success, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.8, marginRight: 1 }} />
                        {/* Actual (Blue) */}
                        <View style={{ width: actualWidth, height: `${actualPct}%`, backgroundColor: colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.95 }} />
                      </View>
                    );
                  })}
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 4, marginTop: 4 }}>
                  {chartData.map((item, idx) => (
                    <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: selectedView > 6 ? 8 : 10 }} numberOfLines={1}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

// 9. Digital Protocol Offer (פרוטוקול מסירה דיגיטלי)
export const DigitalProtocolWidget = () => {
  const { t } = useAppTranslation();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation<any>();
  return (
    <View style={[styles.widgetBase, styles.protocolContainer]}>
      <View style={styles.widgetHeader}>
        <View style={styles.iconBoxIndigo}>
            <FileSignature color={colors.primary} size={20} />
        </View>
        <Text style={styles.widgetTitle}>{t('digital_protocol_offer')}</Text>
      </View>
      <Text style={styles.protocolText}>{t('protocol_desc')}</Text>
      <TouchableOpacity style={styles.protocolBtn} onPress={() => navigation.navigate('ProtocolWizard', { propertyId: null })}>
        <FileSignature color={colors.warning} size={16} style={{marginLeft: 8}} />
        <Text style={styles.protocolBtnText}>{t('start_protocol_now')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// 10. Prospective Tenants (שוכרים פוטנציאליים)
export const ProspectiveTenantsWidget = () => {
  const { t, language } = useAppTranslation();
  const isRtl = language !== 'en';
  const { colors } = useAppTheme();
  const styles = useStyles(colors);

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: properties } = await supabase
            .from('properties')
            .select('id, address, city, contracts(id, status, end_date)')
            .eq('user_id', user.id);
        
        if (properties) {
            const today = new Date();
            const sixtyDaysFromNow = new Date();
            sixtyDaysFromNow.setDate(today.getDate() + 60);

            const targetProp = properties.find((p: any) => {
                const activeContracts = p.contracts?.filter((c: any) => c.status === 'active') || [];
                // No active contracts
                if (activeContracts.length === 0) return true;
                
                // Or an active contract ending in < 60 days
                return activeContracts.some((c: any) => new Date(c.end_date) < sixtyDaysFromNow);
            });

            if (targetProp) {
                setProperty(targetProp);
            }
        }
      } catch (err) {
          console.error('Error fetching properties for widget:', err);
      } finally {
          setLoading(false);
      }
    };

    fetchOpportunity();
  }, []);

  if (loading || !property) return null;

  const handleCopyLink = async () => {
    const url = `https://rentmate.co.il/apply/${property.id}`;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={[styles.widgetBase, styles.tenantsContainer, { overflow: 'hidden' }]}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7}>
        <View style={[styles.widgetHeader, { marginBottom: isExpanded ? 16 : 0 }]}>
          <View style={styles.iconBoxCyan}>
              <Users color={colors.info} size={20} />
          </View>
          <Text style={styles.widgetTitle}>{isRtl ? 'שוכרים פוטנציאליים' : 'Prospective Tenants'}</Text>
          <View style={{ flex: 1 }} />
          {isExpanded ? <ChevronUp color={colors.textSecondary} size={20} /> : <ChevronDown color={colors.textSecondary} size={20} />}
        </View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View>
          <Text style={[styles.protocolText, { fontWeight: 'bold', fontSize: 16, color: colors.text }]}>
            {isRtl ? 'היערכות לדיירים חדשים' : 'Preparation for New Tenants'}
          </Text>
          <Text style={[styles.protocolText, { marginBottom: 20 }]}>
            {isRtl ? 
                `זיהינו שלנכס "${property.address}${property.city ? `, ${property.city}` : ''}" אין חוזה פעיל. שלח קישור לשוכרים פוטנציאלים למלא את פרטיהם ולצרף מסמכים תומכים.` 
                : 
                `We noticed property "${property.address}${property.city ? `, ${property.city}` : ''}" has no active contract. Send a link to prospective tenants to fill out their details and attach supporting documents.`
            }
          </Text>
          <TouchableOpacity 
            style={[styles.tenantsBtn, copied && { backgroundColor: colors.success }]} 
            onPress={handleCopyLink}
          >
            {copied ? (
                <>
                  <CheckCircle color="#ffffff" size={16} style={{marginHorizontal: 8}} />
                  <Text style={styles.tenantsBtnText}>{isRtl ? 'קישור הועתק!' : 'Link Copied!'}</Text>
                </>
            ) : (
                <>
                  <Users color="#ffffff" size={16} />
                  <Text style={[styles.tenantsBtnText, { marginHorizontal: 8 }]}>{isRtl ? 'העתק קישור לטופס דיגיטלי' : 'Copy Digital Form Link'}</Text>
                  {isRtl ? <ChevronLeft color="#ffffff" size={16} /> : <ChevronRight color="#ffffff" size={16} />}
                </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// 11. Market Intelligence (מגמות שוק נדל״ן)
export const MarketIntelligenceWidget = () => {
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSelectingCity, setIsSelectingCity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [availableCitiesList, setAvailableCitiesList] = useState<{ id: string, city: string, price?: string, rooms?: string, change?: string, trend5y?: string, trendMonthly?: string, isPositive?: boolean }[]>([]);
  const [intelligenceData, setIntelligenceData] = useState<any[]>([]);
  const [editingData, setEditingData] = useState<any[]>([]);
  const [roomSelections, setRoomSelections] = useState<Record<string, string>>({});
  const [safeRoomSelections, setSafeRoomSelections] = useState<Record<string, boolean>>({});
  const [openDropdownCity, setOpenDropdownCity] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // Fetch all CBS cities
    const allRegions = await fetchAllAvailableRegions();
    setAvailableCitiesList(allRegions.map(r => ({ id: r, city: r })));

    // Fetch user's tracked regions
    let userRegions = await fetchUserTrackedRegions();
    
    if (userRegions.length === 0) {
      // Default to Tel Aviv and Jerusalem if none selected initially
      userRegions = ['Tel Aviv', 'Jerusalem'];
    }

    // Fetch rich data for these regions
    const data = await fetchRentalDataForRegions(userRegions);
    
    // Default rooms to 3.5_4 if not selected
    const initialRooms: Record<string, string> = {};
    const initialSafeRoom: Record<string, boolean> = {};
    data.forEach(d => {
      initialRooms[d.region_name] = '3.5_4';
      initialSafeRoom[d.region_name] = false;
    });
    setRoomSelections(prev => ({...initialRooms, ...prev}));
    setSafeRoomSelections(prev => ({...initialSafeRoom, ...prev}));

    setIntelligenceData(data);
    setLoading(false);
  };

  const getComputedPrice = (cityData: any) => {
    const rSelection = roomSelections[cityData.region_name] || '3.5_4';
    const sSelection = safeRoomSelections[cityData.region_name] || false;
    
    let basePrice = cityData.avg_rent || 0;
    
    // Map selections to the database JSON keys for room_adjustments
    const roomKeyMap: Record<string, string> = {
      '1.5_2': '2',
      '2.5_3': '3',
      '3.5_4': '4',
      '4.5_5': '5'
    };
    
    const dbRoomKey = roomKeyMap[rSelection];
    
    // Legacy support vs New schema
    if (cityData.detailed_segments?.rooms && cityData.detailed_segments.rooms[rSelection]) {
      basePrice = cityData.detailed_segments.rooms[rSelection];
    } else if (cityData.room_adjustments && cityData.room_adjustments[dbRoomKey]) {
      basePrice = basePrice * cityData.room_adjustments[dbRoomKey];
    }
    
    // 8% average premium for mamad if selected
    if (sSelection) {
      if (cityData.detailed_segments?.features?.has_safe_room_premium_pct) {
        basePrice = basePrice * (1 + (cityData.detailed_segments.features.has_safe_room_premium_pct / 100));
      } else {
        basePrice = basePrice * 1.08;
      }
    }
    
    return `₪${Math.round(basePrice).toLocaleString()}`;
  };

  const getRoomLabel = (key: string) => {
    switch (key) {
      case '1.5_2': return '1.5-2 חדרים';
      case '2.5_3': return '2.5-3 חדרים';
      case '3.5_4': return '3.5-4 חדרים';
      case '4.5_5': return '4.5-5 חדרים';
      default: return 'ממוצע כללי';
    }
  };

  const openRoomsDropdown = (cityId: string) => {
    setOpenDropdownCity(openDropdownCity === cityId ? null : cityId);
  };

  const selectRoomOption = (cityId: string, option: string) => {
    setRoomSelections(prev => ({ ...prev, [cityId]: option }));
    setOpenDropdownCity(null);
  };

  const toggleSafeRoom = (cityId: string) => {
    setSafeRoomSelections(prev => ({ ...prev, [cityId]: !prev[cityId] }));
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setIsSelectingCity(false);
    loadData(); // Ensure fresh sync if edits happened
  };

  const openSettings = () => {
    setEditingData(intelligenceData.map(d => ({id: d.region_name, city: d.region_name})));
    setIsSettingsOpen(true);
    setIsSelectingCity(false);
    setSearchQuery('');
  };

  const handleAddCityToAPI = async (city: string) => {
    await addUserTrackedRegion(city);
    // Optimistic UI update in the settings view
    setEditingData([{ id: city, city }, ...editingData]);
    setIsSelectingCity(false);
  };

  const handleRemoveCityFromAPI = async (city: string) => {
    await removeUserTrackedRegion(city);
    setEditingData(editingData.filter(d => d.city !== city));
  };

  return (
    <View style={[styles.widgetBase, { padding: 16, zIndex: openDropdownCity ? 50 : 1, elevation: openDropdownCity ? 50 : 1 }]}>
      {/* Header */}
      {!isSettingsOpen ? (
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 20 : 0 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <View style={{ padding: 8, backgroundColor: colors.successLight, borderRadius: 12, marginLeft: 12 }}>
              <TrendingUp color={colors.success} size={20} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>מודיעין שוק</Text>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={openSettings}>
              <Settings2 color={colors.textSecondary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? (
                <ChevronUp color={colors.textSecondary} size={18} />
              ) : (
                <ChevronDown color={colors.textSecondary} size={18} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
            <View style={{ padding: 8, backgroundColor: colors.primaryLight, borderRadius: 12, marginLeft: 12 }}>
              <Settings2 color={colors.primary} size={20} />
            </View>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '900' }}>{isSelectingCity ? 'בחר עיר להוספה' : 'הגדרות תצוגה'}</Text>
          </View>
          <TouchableOpacity onPress={() => isSelectingCity ? setIsSelectingCity(false) : closeSettings()} style={{ padding: 4 }}>
            <X color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      )}

      {/* Widget Content */}
      {!isSettingsOpen ? (
        <View style={{ zIndex: openDropdownCity ? 10 : 1, elevation: openDropdownCity ? 10 : 1 }}>
          {/* City Cards */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            isExpanded && intelligenceData.map((data, index) => (
            <View key={data.region_name} style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: openDropdownCity === data.region_name ? 10 : 1,
              zIndex: openDropdownCity === data.region_name ? 10 : 1,
              marginBottom: index === intelligenceData.length - 1 ? 0 : 16
            }}>
              {/* Top Row: Close and City */}
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <MapIcon color={colors.textSecondary} size={16} style={{ marginLeft: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>{translateCity(data.region_name)}</Text>
                </View>
              </View>

              {/* Pricing Row */}
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: colors.primary, textAlign: 'right' }}>
                  {getComputedPrice(data)}
                </Text>
              </View>

              {/* Interactive Filters Row */}
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 16, zIndex: openDropdownCity === data.region_name ? 100 : 1 }}>
                
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity 
                    onPress={() => openRoomsDropdown(data.region_name)}
                    style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surfaceLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, marginLeft: 4 }}>
                      {getRoomLabel(roomSelections[data.region_name])}
                    </Text>
                    <ChevronDown color={colors.textSecondary} size={14} />
                  </TouchableOpacity>
                  
                  {openDropdownCity === data.region_name && (
                    <View style={{
                      position: 'absolute',
                      top: 40,
                      right: 0,
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 8,
                      width: 140,
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 10,
                      elevation: 5,
                      zIndex: 100
                    }}>
                      {['1.5_2', '2.5_3', '3.5_4', '4.5_5'].map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 8,
                            borderBottomWidth: opt !== '4.5_5' ? 1 : 0,
                            borderBottomColor: colors.border
                          }}
                          onPress={() => selectRoomOption(data.region_name, opt)}
                        >
                          <Text style={{ textAlign: 'right', color: colors.textSecondary, fontWeight: roomSelections[data.region_name] === opt ? 'bold' : '500' }}>
                            {getRoomLabel(opt)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  onPress={() => toggleSafeRoom(data.region_name)}
                  style={{ 
                    flexDirection: 'row-reverse', 
                    alignItems: 'center', 
                    backgroundColor: safeRoomSelections[data.region_name] ? colors.successLight : colors.surfaceLight, 
                    paddingHorizontal: 10, 
                    paddingVertical: 6, 
                    borderRadius: 8,
                    marginRight: 10
                  }}
                >
                  <View style={{
                    width: 8, height: 8, borderRadius: 4, 
                    backgroundColor: safeRoomSelections[data.region_name] ? colors.success : colors.textSecondary,
                    marginLeft: 6
                  }} />
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: 'bold', 
                    color: safeRoomSelections[data.region_name] ? colors.success : colors.textSecondary 
                  }}>
                    כולל ממ״ד
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 12, opacity: 0.5 }} />

              {/* Bottom Trends Row */}
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 4 }}>שינוי שנתי:</Text>
                  <Text style={{ color: data.growth_1y >= 0 ? colors.success : colors.danger, fontWeight: 'bold', fontSize: 14 }}>{data.growth_1y}%</Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 4 }}>5 שנים:</Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: 'normal', fontSize: 14 }}>{data.growth_5y}%</Text>
                </View>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 4 }}>חודשי:</Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: 'normal', fontSize: 14 }}>{data.month_over_month}%</Text>
                </View>
              </View>
            </View>
          )))}
          {isExpanded && intelligenceData.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>לא נבחרו ערים למעקב.</Text>
          )}
        </View>
      ) : isSelectingCity ? (
        <View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
            <Search color={colors.textSecondary} size={18} />
            <TextInput
              style={{ flex: 1, padding: 12, textAlign: 'right', color: colors.text }}
              placeholder="חפש עיר למעקב..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color={colors.textSecondary} size={18} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled={true}>
            {availableCitiesList
              .filter(c => !editingData.some(ed => ed.city === c.city))
              .filter(c => translateCity(c.city).includes(searchQuery) || c.city.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((city) => (
                <TouchableOpacity
                  key={city.id}
                  onPress={() => handleAddCityToAPI(city.city)}
                  style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{translateCity(city.city)}</Text>
                  <Plus color={colors.primary} size={18} />
                </TouchableOpacity>
              ))}
              {availableCitiesList.filter(c => !editingData.some(ed => ed.city === c.city)).length === 0 && (
                 <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>כל הערים כבר נבחרו.</Text>
              )}
          </ScrollView>
        </View>
      ) : (
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginBottom: 12, textTransform: 'uppercase' }}>הגדרות מעקב מיקומי נדל״ן</Text>
          
          {editingData.map((data, index) => (
            <View key={`edit-${data.id}-${index}`} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
                <MapIcon color={colors.primary} size={18} style={{ marginLeft: 8 }} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{translateCity(data.city)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveCityFromAPI(data.city)} style={{ padding: 8, backgroundColor: colors.dangerLight, borderRadius: 8 }}>
                <Trash2 color={colors.danger} size={16} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={() => setIsSelectingCity(true)} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, borderStyle: 'dashed', marginBottom: 20 }}>
            <Plus color={colors.textSecondary} size={16} style={{ marginLeft: 8 }} />
            <Text style={{ color: colors.textSecondary, fontWeight: 'bold', fontSize: 14 }}>הוסף עיר / שכונה למעקב</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' }}
            onPress={() => closeSettings()}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>שמור וחזור</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export const QuickActionsWidget = () => {
  const { t } = useAppTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useStyles(colors);
  return (
      <View style={[styles.widgetBase, styles.quickActionsContainer]}>
          <View style={styles.widgetHeader}>
            <View style={styles.iconBoxAmber}>
                <Zap color={colors.warning} size={20} />
            </View>
            <Text style={styles.widgetTitle}>{t('quick_actions')}</Text>
          </View>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => navigation.navigate('Calculator', { tab: 'series' })}>
                <View style={[styles.qaIconWrapper, { backgroundColor: colors.successLight }]}>
                  <Zap color={colors.success} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qaItemTitle}>{t('calc_payment_series')}</Text>
                  <Text style={styles.qaItemSub}>{t('calc_payment_series_sub')}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem} onPress={() => Alert.alert('בקרוב', 'בניית פרוטוקול דיגיטלי תהיה זמינה בגרסה הבאה.')}>
                <View style={[styles.qaIconWrapper, { backgroundColor: colors.warningLight }]}>
                  <FileSignature color={colors.warning} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qaItemTitle}>{t('digital_protocol_offer')}</Text>
                  <Text style={styles.qaItemSub}>{t('digital_protocol_offer_sub')}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem} onPress={() => Alert.alert('בקרוב', 'שליחת טופס איסוף נתונים לשוכרים תהיה זמינה בגרסה הבאה.')}>
                <View style={[styles.qaIconWrapper, { backgroundColor: colors.infoLight }]}>
                  <Link color={colors.info} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qaItemTitle}>{t('form_link_title')}</Text>
                  <Text style={styles.qaItemSub}>{t('form_link_sub')}</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickActionItem, { borderBottomWidth: 0 }]} onPress={() => Alert.alert('בקרוב', 'הפקת דוחות תהיה זמינה בקרוב.')}>
                <View style={[styles.qaIconWrapper, { backgroundColor: colors.primaryLight }]}>
                  <FileText color={colors.primary} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qaItemTitle}>{t('performance_report_title')}</Text>
                  <Text style={styles.qaItemSub}>{t('performance_report_sub')}</Text>
                </View>
            </TouchableOpacity>
          </View>
      </View>
  );
};

// 12. Index Rate Lookup
export const IndexRateLookupWidget = () => {
  const { colors } = useAppTheme();
  const styles = useStyles(colors);

  const [dateStr, setDateStr] = useState(''); // DD/MM/YYYY
  const [indexType, setIndexType] = useState<'cpi' | 'housing'>('cpi');
  const [calcMethod, setCalcMethod] = useState<'known' | 'respect_of'>('known');
  const [rate, setRate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [datePickerConfigLookup, setDatePickerConfigLookup] = useState(false);

  const onChangeDateLookup = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerConfigLookup(false);
    }
    if (selectedDate && event.type === 'set') {
      const d = String(selectedDate.getDate()).padStart(2, '0');
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const y = selectedDate.getFullYear();
      setDateStr(`${d}/${m}/${y}`);
    }
  };

  const getActivePickerDateLookup = () => {
    if (dateStr) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    return new Date();
  };

  const handleLookup = async () => {
    setLoading(true);
    try {
      const parts = dateStr.trim().split('/');
      if (parts.length !== 3) {
        setRate('שגיאה: פורמט (DD/MM/YYYY)');
        setLoading(false);
        return;
      }

      const [ddStr, mmStr, yyyyStr] = parts;
      const day = parseInt(ddStr, 10);
      let m = parseInt(mmStr, 10);
      let y = parseInt(yyyyStr, 10);

      // Validate base constraints
      if (isNaN(day) || isNaN(m) || isNaN(y) || y < 1900) {
        setRate('תאריך לא חוקי');
        setLoading(false);
        return;
      }

      let fetchedData = null;

      if (calcMethod === 'respect_of') {
        const lookupMonth = `${y}-${m.toString().padStart(2, '0')}`;
        const { data, error } = await supabase
          .from('index_data')
          .select('value, date')
          .eq('index_type', indexType)
          .eq('date', lookupMonth)
          .maybeSingle();
          
        if (error) throw error;
        fetchedData = data;
      } else {
        // Attempt dynamically published date first
        const exactLimit = `${y}-${m.toString().padStart(2, '0')}-${ddStr}T23:59:59.999Z`;
        const { data: exactMatch, error: exactError } = await supabase
          .from('index_data')
          .select('value, date, actual_published_at')
          .eq('index_type', indexType)
          .not('actual_published_at', 'is', null)
          .lte('actual_published_at', exactLimit)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (exactError) throw exactError;

        if (exactMatch) {
          fetchedData = exactMatch;
        } else {
          // Fallback to day 15 rule
          if (day < 15) {
            m -= 2;
          } else {
            m -= 1;
          }
          if (m <= 0) {
            m += 12;
            y -= 1;
          }
          const lookupMonth = `${y}-${m.toString().padStart(2, '0')}`;
          
          const { data: fallbackMatch, error: fallbackError } = await supabase
            .from('index_data')
            .select('value, date')
            .eq('index_type', indexType)
            .lte('date', lookupMonth)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (fallbackError) throw fallbackError;
          fetchedData = fallbackMatch;
        }
      }
      
      if (fetchedData) {
        setRate(`${fetchedData.value} נק'`);
      } else {
        setRate('לא נמצא מדד לתאריך זה');
      }
    } catch (e: any) {
      console.error(e);
      setRate('שגיאה בשליפה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.widgetBase, styles.quickActionsContainer, { borderColor: colors.infoLight }]}>
      <View style={styles.widgetHeader}>
        <View style={styles.iconBoxCyan}>
            <Search color={colors.info} size={20} />
        </View>
        <Text style={styles.widgetTitle}>בדיקת שער מדד</Text>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, indexType === 'cpi' && styles.toggleBtnActive]} onPress={() => setIndexType('cpi')}>
          <Text style={[styles.toggleText, indexType === 'cpi' && styles.toggleTextActive]}>מדד מחירים (CPI)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, indexType === 'housing' && styles.toggleBtnActive]} onPress={() => setIndexType('housing')}>
          <Text style={[styles.toggleText, indexType === 'housing' && styles.toggleTextActive]}>תשומות הבנייה</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity style={[styles.toggleBtn, calcMethod === 'known' && styles.toggleBtnActive]} onPress={() => setCalcMethod('known')}>
          <Text style={[styles.toggleText, calcMethod === 'known' && styles.toggleTextActive]}>מדד ידוע</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleBtn, calcMethod === 'respect_of' && styles.toggleBtnActive]} onPress={() => setCalcMethod('respect_of')}>
          <Text style={[styles.toggleText, calcMethod === 'respect_of' && styles.toggleTextActive]}>מדד בגין</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.widgetInputRow}>
        <TouchableOpacity 
          style={[styles.widgetInput, { flex: 1, justifyContent: 'center' }]}
          onPress={() => setDatePickerConfigLookup(true)}
        >
          <Text style={{color: dateStr ? colors.text : colors.textSecondary, textAlign: 'right'}}>
            {dateStr || 'תאריך (DD/MM/YYYY)'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.widgetCalcBtn, { backgroundColor: colors.info }]} onPress={handleLookup}>
          {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.widgetCalcText}>בדוק שער</Text>}
        </TouchableOpacity>
      </View>

      {rate && (
        <View style={styles.indexRow}>
          <Text style={styles.indexName}>שער המדד (היסטורי):</Text>
          <Text style={[styles.indexValue, {color: colors.info}]}>{rate}</Text>
        </View>
      )}

      {/* DatePicker Modals */}
      {datePickerConfigLookup && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
              <View style={{backgroundColor: colors.surface, padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24}}>
                <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16}}>
                  <TouchableOpacity onPress={() => setDatePickerConfigLookup(false)}>
                    <Text style={{color: '#4F46E5', fontSize: 18, fontWeight: 'bold'}}>אישור / סגירה</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={getActivePickerDateLookup()}
                  mode="date"
                  display="spinner"
                  onChange={onChangeDateLookup}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={getActivePickerDateLookup()}
            mode="date"
            display="default"
            onChange={onChangeDateLookup}
          />
        )
      )}
    </View>
  );
};

export const WIDGET_REGISTRY = {
  usage: UsageOverviewWidget,
  dashboard_hero: DashboardHeroWidget,
  smart_actions: SmartActionsWidget,
  quick_actions: QuickActionsWidget,
  financial_health: FinancialHealthWidget,
  timeline: TimelineWidget,
  index_pulse: IndexPulseWidget,
  storage: StorageStatsWidget,
  revenue: RevenueTrendWidget,
  digital_protocol: DigitalProtocolWidget,
  prospective_tenants: ProspectiveTenantsWidget,
  market_trends_live: MarketIntelligenceWidget,
  index_lookup: IndexRateLookupWidget
};

export const DEFAULT_LAYOUT = [
  { id: '1', widgetId: 'dashboard_hero', order: 0, visible: true },
  { id: '2', widgetId: 'financial_health', order: 1, visible: true },
  { id: '3', widgetId: 'smart_actions', order: 2, visible: true },
  /* { id: '12', widgetId: 'quick_actions', order: 3, visible: true }, */
  /* { id: '13', widgetId: 'index_lookup', order: 4, visible: true }, */
  { id: '4', widgetId: 'digital_protocol', order: 5, visible: true },
  { id: '5', widgetId: 'prospective_tenants', order: 5, visible: true },
  { id: '6', widgetId: 'timeline', order: 6, visible: true },
  { id: '7', widgetId: 'index_pulse', order: 7, visible: true },
  { id: '8_v2', widgetId: 'market_trends_live', order: 8, visible: true },
  { id: '9', widgetId: 'revenue', order: 9, visible: true },
  { id: '10', widgetId: 'storage', order: 10, visible: true },
  { id: '11', widgetId: 'usage', order: 11, visible: false },
];
