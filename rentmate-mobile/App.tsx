import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ActivityIndicator, View, Text, TouchableOpacity, LogBox } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock } from 'lucide-react-native';
import { registerForPushNotificationsAsync } from './src/lib/pushNotifications';

// Ignore the Expo Go notifications console error so it doesn't trigger a redbox for the user
LogBox.ignoreLogs([
  'expo-notifications: Android Push',
  'expo-notifications: Android Push notifications'
]);

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider } from './src/contexts/PreferencesContext';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) authenticateBiometric();
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) authenticateBiometric();
    });
  }, []);

  const authenticateBiometric = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'נא לאמת זהות לפתיחת RentMate',
        fallbackLabel: 'השתמש בסיסמה',
        cancelLabel: 'ביטול',
      });
      if (result.success) {
        setIsAuthenticated(true);
        registerForPushNotificationsAsync();
      } else {
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(true); // Fallback
      registerForPushNotificationsAsync();
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050B14' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (session && !isAuthenticated) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050B14', padding: 24 }}>
          <Lock color="#4F46E5" size={64} style={{marginBottom: 20}} />
          <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20}}>האפליקציה נעולה</Text>
          <TouchableOpacity style={{backgroundColor: '#4F46E5', padding: 16, borderRadius: 12}} onPress={authenticateBiometric}>
            <Text style={{color: '#fff', fontSize: 16}}>נסה שוב לשחרר נעילה</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <NavigationContainer>
          {session && session.user && isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
