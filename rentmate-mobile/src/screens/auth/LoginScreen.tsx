import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Lock, Mail } from 'lucide-react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
export default function LoginScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'יש להזין אימייל וסיסמה');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      Alert.alert('שגיאת התחברות', 'פרטים שגויים או שגיאת רשת.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>RentMate</Text>
          <Text style={styles.subtitle}>ברוך שובך! התחבר לניהול הנכסים שלך.</Text>
        </View>

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

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="סיסמה"
              placeholderTextColor="#8A9DB8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Lock color="#8A9DB8" size={20} style={styles.icon} />
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword} 
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>שכחת סיסמה?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>התחברות מאובטחת</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.linkText}>עדיין אין לך חשבון? הירשם כאן</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'flex-end' },
  logo: { fontSize: 42, fontWeight: 'bold', color: colors.text, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 10, textAlign: 'right' },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 60 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', paddingRight: 12 },
  icon: { marginLeft: 12 },
  forgotPassword: { alignSelf: 'flex-start', marginTop: 4 },
  forgotText: { color: colors.textSecondary, fontSize: 14 },
  button: { backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: 16 }
});
