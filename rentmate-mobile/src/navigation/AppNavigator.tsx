import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';
import AddPropertyWizard from '../screens/AddPropertyWizard';
import AddContractWizard from '../screens/AddContractWizard';
import PropertyDetailsScreen from '../screens/PropertyDetailsScreen';
import ContractDetailsScreen from '../screens/ContractDetailsScreen';
import CalculatorScreen from '../screens/CalculatorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AutopilotInboxScreen from '../screens/AutopilotInboxScreen';
import TenantsListScreen from '../screens/TenantsListScreen';
import RentyAssistantScreen from '../screens/RentyAssistantScreen';
import AIScannerScreen from '../screens/AIScannerScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProtocolWizardScreen from '../screens/ProtocolWizardScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      <Stack.Screen name="AddProperty" component={AddPropertyWizard} />
      <Stack.Screen name="AddContract" component={AddContractWizard} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
      <Stack.Screen name="ContractDetails" component={ContractDetailsScreen} />
      <Stack.Screen name="Calculator" component={CalculatorScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AutopilotInbox" component={AutopilotInboxScreen} />
      <Stack.Screen name="TenantsList" component={TenantsListScreen} />
      <Stack.Screen name="RentyAssistant" component={RentyAssistantScreen} />
      <Stack.Screen name="AIScanner" component={AIScannerScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ProtocolWizard" component={ProtocolWizardScreen} />
    </Stack.Navigator>
  );
}
