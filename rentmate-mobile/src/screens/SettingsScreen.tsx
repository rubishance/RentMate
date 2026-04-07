import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet,  ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowRight, User, Bell, LogOut, Shield, ChevronLeft, Globe, Palette } from 'lucide-react-native';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { useAppTheme } from '../hooks/useAppTheme';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export default function SettingsScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { language, theme, setLanguage, setTheme } = usePreferences();
  const { t } = useAppTranslation();
  const { isDark } = useAppTheme();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setProfile({
        email: user.email,
        name: user.user_metadata?.full_name || 'משתמש' });
      setPushEnabled(!!user.user_metadata?.expo_push_token);
    }
    setLoading(false);
  };

  const togglePushNotifications = async () => {
    try {
      if (pushEnabled) {
        // Disable push
        await supabase.auth.updateUser({ data: { expo_push_token: null } });
        setPushEnabled(false);
        Alert.alert('התראות כובו', 'לא תקבל יותר התראות דחיפה.');
        return;
      }

      // Enable push
      if (!Device.isDevice) {
        Alert.alert('שגיאה', 'יש להשתמש במכשיר פיזי לשליחת התראות');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('הרשאה נדחתה', 'יש לאשר קבלת התראות בהגדרות המכשיר');
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
         Alert.alert('התראה', 'פרויקט EAS לא מוגדר, לא ניתן לייצר טוקן (בפיתוח)');
         return;
      }
      
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await supabase.auth.updateUser({ data: { expo_push_token: token } });
      setPushEnabled(true);
      Alert.alert('הצלחה', 'התראות דחיפה הופעלו בהצלחה!');

    } catch (e: any) {
      console.log('Push error:', e);
      Alert.alert('שגיאה', e.message || 'הפעולה נכשלה');
    }
  };

  const handleLogout = async () => {
    Alert.alert('התנתקות', 'האם אתה בטוח שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתק', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        // The Root App.tsx will automatically switch to AuthNavigator
      }}
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.profileBox}>
          <View style={[styles.avatar, { backgroundColor: colors.avatarBg, borderColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.text }]}>{profile?.name ? profile.name.substring(0,1) : 'R'}</Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{profile?.name}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{profile?.email}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('app_preferences')}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingsRow}>
            <View style={styles.rowRight}>
              <Globe color={colors.textSecondary} size={20} style={{ marginLeft: 12 }} />
              <Text style={[styles.rowText, { color: colors.text }]}>{t('language')}</Text>
            </View>
            <View style={[styles.segmentControl, { backgroundColor: colors.surfaceLight }]}>
              <TouchableOpacity style={[styles.segmentBtn, language === 'he' && styles.segmentBtnActive]} onPress={() => setLanguage('he')}>
                <Text style={[styles.segmentText, { color: colors.textSecondary }, language === 'he' && styles.segmentTextActive]}>{t('hebrew')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, language === 'en' && styles.segmentBtnActive]} onPress={() => setLanguage('en')}>
                <Text style={[styles.segmentText, { color: colors.textSecondary }, language === 'en' && styles.segmentTextActive]}>{t('english')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.settingsRow}>
            <View style={styles.rowRight}>
              <Palette color={colors.textSecondary} size={20} style={{ marginLeft: 12 }} />
              <Text style={[styles.rowText, { color: colors.text }]}>{t('theme')}</Text>
            </View>
            <View style={[styles.segmentControl, { backgroundColor: colors.surfaceLight }]}>
              <TouchableOpacity style={[styles.segmentBtn, theme === 'light' && styles.segmentBtnActive]} onPress={() => setTheme('light')}>
                <Text style={[styles.segmentText, { color: colors.textSecondary }, theme === 'light' && styles.segmentTextActive]}>{t('light')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, theme === 'dark' && styles.segmentBtnActive]} onPress={() => setTheme('dark')}>
                <Text style={[styles.segmentText, { color: colors.textSecondary }, theme === 'dark' && styles.segmentTextActive]}>{t('dark')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, theme === 'auto' && styles.segmentBtnActive]} onPress={() => setTheme('auto')}>
                <Text style={[styles.segmentText, { color: colors.textSecondary }, theme === 'auto' && styles.segmentTextActive]}>{t('auto')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('account')}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.settingsRow} 
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.rowRight}>
              <User color={colors.textSecondary} size={20} style={{ marginLeft: 12 }} />
              <Text style={[styles.rowText, { color: colors.text }]}>{t('personal_details')}</Text>
            </View>
            <ChevronLeft color={colors.textSecondary} size={20} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.settingsRow} onPress={togglePushNotifications}>
            <View style={styles.rowRight}>
              <Bell color={pushEnabled ? colors.success : colors.textSecondary} size={20} style={{ marginLeft: 12 }} />
              <Text style={[styles.rowText, { color: colors.text }]}>{t('push_notifications')}</Text>
            </View>
            <View style={[styles.toggleBadge, pushEnabled ? { backgroundColor: colors.successLight } : { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.toggleText, { color: pushEnabled ? colors.success : colors.textSecondary }]}>{pushEnabled ? 'ON' : 'OFF'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('security')}</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.settingsRow}>
            <View style={styles.rowRight}>
              <Shield color={colors.textSecondary} size={20} style={{ marginLeft: 12 }} />
              <Text style={[styles.rowText, { color: colors.text }]}>{t('biometrics')}</Text>
            </View>
            <ChevronLeft color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]} onPress={handleLogout}>
          <LogOut color={colors.danger} size={20} style={{ marginLeft: 8 }} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>{t('logout')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  content: { flexGrow: 1, padding: 24 },
  
  profileBox: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(79, 70, 229, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#4F46E5' },
  avatarText: { fontSize: 32, color: colors.text, fontWeight: 'bold' },
  profileName: { fontSize: 22, color: colors.text, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: colors.textSecondary },

  sectionTitle: { fontSize: 16, color: colors.textSecondary, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  settingsGroup: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 24, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  rowRight: { flexDirection: 'row-reverse', alignItems: 'center' },
  rowText: { color: colors.text, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  toggleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  toggleBadgeOn: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  toggleBadgeOff: { backgroundColor: 'rgba(138, 157, 184, 0.1)' },
  toggleText: { fontSize: 12, fontWeight: 'bold', color: '#10B981' },

  logoutButton: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },

  segmentControl: { flexDirection: 'row-reverse', backgroundColor: colors.border, borderRadius: 8, padding: 2 },
  segmentBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  segmentBtnActive: { backgroundColor: '#4F46E5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  segmentText: { color: colors.textSecondary, fontSize: 13, fontWeight: 'bold' },
  segmentTextActive: { color: colors.text }
});
