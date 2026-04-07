import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowRight, Save, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function EditProfileScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const full = user.user_metadata?.full_name || '';
        const parts = full.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם פרטי ושם משפחה');
      return;
    }

    setLoading(true);
    try {
      const formattedFullName = `${firstName.trim()} ${lastName.trim()}`;
      
      const { error } = await supabase.auth.updateUser({
        data: { full_name: formattedFullName }
      });

      if (error) throw error;

      Alert.alert('הצלחה', 'הפרופיל עודכן בהצלחה');
      navigation.goBack();
      
    } catch (error: any) {
      Alert.alert('שגיאה בשמירה', error.message || 'לא ניתן לעדכן את הפרופיל');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>עריכת פרופיל אישי</Text>
        <View style={{ width: 24 }} />
      </View>

      {initLoading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 100 }} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionSubtitle}>אפשר תמיד לעדכן את השם שיוצג לשוכרים שלך.</Text>

          <Text style={styles.label}>שם פרטי</Text>
          <View style={styles.inputContainer}>
            <User color="#8A9DB8" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="ישראל"
              placeholderTextColor="#64748B"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <Text style={styles.label}>שם משפחה</Text>
          <View style={[styles.inputContainer, { marginBottom: 40 }]}>
            <User color="#8A9DB8" size={20} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="ישראלי"
              placeholderTextColor="#64748B"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" /> : (
              <>
                <Save color="#ffffff" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>שמור שינויים</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  content: { padding: 24 },

  sectionSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'right', marginBottom: 32 },
  
  label: { color: colors.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right', marginTop: 12, marginBottom: 8 },
  inputContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: colors.surface, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: colors.border, 
    height: 60, 
    paddingHorizontal: 16,
    marginBottom: 16
  },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', marginRight: 12 },
  icon: { opacity: 0.7 },
  
  saveBtn: { 
    flexDirection: 'row-reverse', 
    backgroundColor: '#4F46E5', 
    borderRadius: 16, 
    height: 60, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#4F46E5', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 10 
  },
  saveBtnText: { color: colors.text, fontSize: 18, fontWeight: '900' }
});
