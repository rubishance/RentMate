import React, { useEffect, useState } from 'react';
import { View, StyleSheet,  TouchableOpacity, ActivityIndicator, Text, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings2, ArrowUp, ArrowDown, Check, User, Menu, MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WIDGET_REGISTRY, DEFAULT_LAYOUT } from '../components/dashboard/Widgets';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAppTranslation } from '../hooks/useAppTranslation';

const LAYOUT_STORAGE_KEY = '@dashboard_layout';

export default function DashboardScreen() {
  const [layout, setLayout] = useState<any[]>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { t } = useAppTranslation();

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      // FORCE CACHE CLEAR TEMPORARILY TO FIX MISSING WIDGET BUG
      await AsyncStorage.removeItem(LAYOUT_STORAGE_KEY);
      
      const savedLayout = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        const missingWidgets = DEFAULT_LAYOUT.filter(def => !parsedLayout.some((p: any) => p.widgetId === def.widgetId));
        setLayout([...parsedLayout, ...missingWidgets]);
      } else {
        setLayout([...DEFAULT_LAYOUT]); // clone default
      }
    } catch (e) {
      console.error("Failed to load layout", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLayout = async () => {
    const finalizedLayout = layout.map((item, index) => ({ ...item, order: index }));
    setLayout(finalizedLayout);
    try {
      await AsyncStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(finalizedLayout));
    } catch (e) {
      console.error("Failed to save layout", e);
    }
    setEditMode(false);
  };

  const toggleVisibility = (id: string) => {
    setLayout(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === layout.length - 1) return;
    
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newLayout[index];
    newLayout[index] = newLayout[targetIndex];
    newLayout[targetIndex] = temp;
    
    setLayout(newLayout);
  };

  const getWidgetName = (id: string) => {
    const names: Record<string, string> = {
      'usage': t('limits_status'),
      'dashboard_hero': t('morning_alerts'),
      'smart_actions': t('smart_actions'),
      'quick_actions': t('quick_actions'),
      'financial_health': t('financial_core'),
      'timeline': t('upcoming_timeline'),
      'index_pulse': t('index_pulse'),
      'storage': t('cloud_status'),
      'revenue': t('revenue_graph'),
      'digital_protocol': t('digital_protocol'),
      'prospective_tenants': t('prospective_tenants'),
      'market_trends_live': t('market_trends'),
      'market_intelligence': t('market_trends')
    };
    return names[id] || id;
  };

  if (loading) {
     return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
           <ActivityIndicator size="large" color={colors.primary} />
        </View>
     );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar Navigation Area */}
      <View style={styles.header}>
        {editMode ? (
          <>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLayout}>
              <Check color="#ffffff" size={20} />
              <Text style={styles.saveBtnText}>{t('save_layout')}</Text>
            </TouchableOpacity>
            <Text style={[styles.editModeTitle, { color: colors.textSecondary }]}>{t('organize_widgets')}</Text>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
                <Menu color={colors.text} size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Settings')}>
                <User color={colors.text} size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setEditMode(true)}>
                <Settings2 color={colors.text} size={24} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.editModeTitle, { color: colors.text, fontSize: 18 }]}>{t('main')}</Text>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {layout.map((item, index) => {
            const WidgetComponent = WIDGET_REGISTRY[item.widgetId as keyof typeof WIDGET_REGISTRY];
            if (!WidgetComponent) return null;

            // If NOT in edit mode, and widget is hidden, return null
            if (!editMode && !item.visible) return null;

            return (
              <View key={item.widgetId} style={styles.widgetWrapper}>
                {/* Edit Mode Toolbar Header */}
                {editMode && (
                  <View style={styles.editToolbar}>
                    <View style={styles.arrowControls}>
                      <TouchableOpacity onPress={() => moveWidget(index, 'up')} disabled={index === 0} style={styles.iconBtn}>
                         <ArrowUp color={index === 0 ? 'rgba(255,255,255,0.1)' : '#ffffff'} size={20} />
                      </TouchableOpacity>
                      <View style={{width: 8}} />
                      <TouchableOpacity onPress={() => moveWidget(index, 'down')} disabled={index === layout.length - 1} style={styles.iconBtn}>
                         <ArrowDown color={index === layout.length - 1 ? 'rgba(255,255,255,0.1)' : '#ffffff'} size={20} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.editToggleBox}>
                       <Text style={[styles.editLabel, { color: colors.text }]}>{getWidgetName(item.widgetId)}</Text>
                       <Switch
                         trackColor={{ false: '#1e293b', true: '#4F46E5' }}
                         thumbColor={item.visible ? '#ffffff' : '#8A9DB8'}
                         value={item.visible}
                         onValueChange={() => toggleVisibility(item.id)}
                       />
                    </View>
                  </View>
                )}

                {/* Actual Widget Content */}
                <View pointerEvents={editMode ? 'none' : 'auto'} style={[styles.widgetInner, editMode && !item.visible && styles.widgetHidden]}>
                   <WidgetComponent />
                </View>
              </View>
            );
        })}
      </ScrollView>

      {/* Renty Bot Floating Button - Left Aligned for RTL */}
      {!editMode && (
        <TouchableOpacity style={styles.rentyBotBtn} onPress={() => navigation.navigate('RentyAssistant')}>
           <MessageCircle color="#ffffff" size={28} />
        </TouchableOpacity>
      )}
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050B14' },
  loadingContainer: { flex: 1, backgroundColor: '#050B14', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  rentyBotBtn: { position: 'absolute', bottom: 120, left: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8, zIndex: 100 },
  
  saveBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', marginLeft: 8 },
  editModeTitle: { color: '#8A9DB8', fontSize: 14, fontWeight: 'bold' },

  listContent: { paddingBottom: 120, paddingTop: 10 },
  widgetWrapper: { width: '100%', paddingHorizontal: 0, marginVertical: 4 },
  widgetInner: { width: '100%' },
  widgetHidden: { opacity: 0.3 },

  editToolbar: { width: '100%', paddingHorizontal: 24, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  arrowControls: { flexDirection: 'row-reverse', alignItems: 'center' },
  iconBtn: { padding: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  editToggleBox: { flexDirection: 'row-reverse', alignItems: 'center' },
  editLabel: { color: '#ffffff', fontWeight: 'bold', marginLeft: 12 }
});
