import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Lock } from 'lucide-react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
export default function ResetPasswordScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!password || password.length < 6) {
      Alert.alert('שגיאה', 'סיסמה חדשה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את הסיסמה.');
    } else {
      Alert.alert('הצלחה', 'הסיסמה עודכנה בהצלחה.');
      navigation.navigate('Login');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.logo}>איפוס סיסמה</Text>
          <Text style={styles.subtitle}>הזן את הסיסמה החדשה שלך למטה.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="סיסמה חדשה"
              placeholderTextColor="#8A9DB8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Lock color="#8A9DB8" size={20} style={styles.icon} />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleUpdate} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>עדכן סיסמה</Text>
            )}
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
  logo: { fontSize: 32, fontWeight: 'bold', color: colors.text, letterSpacing: 1, textAlign: 'right' },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 10, textAlign: 'right', lineHeight: 24 },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 60 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', paddingRight: 12 },
  icon: { marginLeft: 12 },
  button: { backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  buttonText: { color: colors.text, fontSize: 18, fontWeight: 'bold' }
});
