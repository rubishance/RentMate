import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Mail, ArrowRight } from 'lucide-react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('שגיאה', 'יש להזין אימייל');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'rentmate://reset-password', // Custom deeplink handled by AuthNavigator
    });

    if (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח בקשה לאיפוס סיסמה.');
    } else {
      setIsSent(true);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>שכחת סיסמה?</Text>
          <Text style={styles.subtitle}>
            {isSent 
              ? 'שלחנו קישור לאיפוס הסיסמה לכתובת האימייל שלך. הפעל אותו כדי להגדיר סיסמה חדשה.'
              : 'הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס.'}
          </Text>
        </View>

        {!isSent ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="אימייל"
                placeholderTextColor="#8A9DB8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Mail color="#8A9DB8" size={20} style={styles.icon} />
            </View>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleReset} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>שלח קישור לאיפוס</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#10B981', shadowColor: '#10B981' }]} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>חזרה להתחברות</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  header: { marginBottom: 40, alignItems: 'flex-end' },
  logo: { fontSize: 32, fontWeight: 'bold', color: colors.text, letterSpacing: 1, textAlign: 'right' },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 10, textAlign: 'right', lineHeight: 24 },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 60 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', paddingRight: 12 },
  icon: { marginLeft: 12 },
  button: { backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: 'bold' }
});
