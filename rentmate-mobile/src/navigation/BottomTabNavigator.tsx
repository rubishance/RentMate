import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Home, Building2, FileText, CreditCard, Plus, Camera, Calculator } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';

import DashboardScreen from '../screens/DashboardScreen';
import PropertiesScreen from '../screens/PropertiesScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import TenantsListScreen from '../screens/TenantsListScreen';

const Tab = createBottomTabNavigator();

const FloatingActionButton = ({ onPress, color }: { onPress: () => void, color: string }) => (
  <TouchableOpacity onPress={onPress} style={styles.fabContainer}>
    <View style={[styles.fab, { backgroundColor: color, shadowColor: color }]}>
      <Plus color="#ffffff" size={32} />
    </View>
  </TouchableOpacity>
);

const EmptyComponent = () => null;

export default function BottomTabNavigator() {
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const navigateWithDelay = (screenName: string) => {
    setModalVisible(false);
    setTimeout(() => {
      navigation.navigate(screenName);
    }, 50);
  };

  const navigateToProperty = () => navigateWithDelay('AddProperty');
  const navigateToContract = () => navigateWithDelay('AddContract');
  const navigateToCalculator = () => navigateWithDelay('Calculator');
  const navigateToPayments = () => navigateWithDelay('Payments');

  // Generate a glassmorphism base color
  // Parse colors.surface to extract RGB or use fallback to keep it simple, 
  // relying on a standard approach for React Native 'glass' look depending on theme
  const tabBarBackgroundColor = isDark ? 'rgba(10, 17, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBarBackgroundColor,
            borderTopColor: colors.border,
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom || 10,
            paddingTop: 10,
            borderTopWidth: 1,
            position: 'absolute',
            elevation: 0, // Disable Android elevation shadow for pure glass look
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: 'bold' },
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'בית', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
        <Tab.Screen name="Properties" component={PropertiesScreen} options={{ tabBarLabel: 'נכסים', tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} /> }} />
        
        <Tab.Screen 
          name="Action" 
          component={EmptyComponent}
          options={{
            tabBarLabel: '',
            tabBarButton: () => (
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                <FloatingActionButton onPress={() => setModalVisible(true)} color={colors.primary} />
              </View>
            )
          }} 
        />
        
        <Tab.Screen name="Documents" component={DocumentsScreen} options={{ tabBarLabel: 'מסמכים', tabBarIcon: ({ color, size }) => <FileText color={color} size={size} /> }} />
        <Tab.Screen name="Payments" component={PaymentsScreen} options={{ tabBarLabel: 'תשלומים', tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} /> }} />
      </Tab.Navigator>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.dragHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>מה תרצה לעשות?</Text>
            
            <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={navigateToProperty}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                <Building2 color="#4F46E5" size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>הוסף נכס חדש</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={navigateToContract}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Camera color="#10B981" size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>סרוק חוזה שכירות (AI)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={navigateToCalculator}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                <Calculator color="#EC4899" size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>מחשבון הצמדה לשכירות</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={navigateToPayments}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <CreditCard color="#F59E0B" size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>דווח על סטטוס תשלום</Text>
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: { justifyContent: 'center', alignItems: 'center', height: '100%', paddingHorizontal: 10 },
  fab: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 50, borderWidth: 1 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  actionRow: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  actionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  actionText: { fontSize: 18, fontWeight: '500' }
});
