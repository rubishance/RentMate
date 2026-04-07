import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, User } from 'lucide-react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
export default function SignupScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('שגיאה', 'יש מלא את כל השדות');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName }
      }
    });

    if (error) {
      Alert.alert('שגיאה בהרשמה', error.message);
    } else {
      Alert.alert('הצלחה', 'נוצר חשבון בהצלחה! שלחנו לך אימייל לאימות.');
      navigation.navigate('Login');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>הצטרף ל-RentMate</Text>
          <Text style={styles.subtitle}>נהל את הנכסים שלך בחכמה ובקלות.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="שם מלא"
              placeholderTextColor="#8A9DB8"
              value={fullName}
              onChangeText={setFullName}
            />
            <User color="#8A9DB8" size={20} style={styles.icon} />
          </View>

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
            style={styles.button} 
            onPress={handleSignup} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>יצירת חשבון</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>כבר יש לך חשבון? התחבר כאן</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'flex-end' },
  logo: { fontSize: 32, fontWeight: 'bold', color: colors.text, letterSpacing: 1, textAlign: 'right' },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 10, textAlign: 'right' },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 60 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', paddingRight: 12 },
  icon: { marginLeft: 12 },
  button: { backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: 16 }
});
