import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet,  ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowRight, Building2, MapPin, FileText, CreditCard, Key, Settings, Edit, MessageSquare } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function PropertyDetailsScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const { propertyId } = route.params;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', street: '', house_number: '', city: '' });

  useEffect(() => {
    fetchPropertyDetails();
  }, []);

  const fetchPropertyDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, active_contract:contracts(*)')
        .eq('id', propertyId)
        .single();
        
      if (error) throw error;
      setProperty(data);
    } catch (err: any) {
      console.error('Error fetching property data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderImage = (type: string | null) => {
    switch (type) {
      case 'apartment': return require('../../../src/assets/placeholder-apartment.png');
      case 'penthouse': return require('../../../src/assets/placeholder-penthouse.png');
      case 'garden': return require('../../../src/assets/placeholder-garden.png');
      case 'house': return require('../../../src/assets/placeholder-house.png');
      case 'roof': 
      case 'roof_apartment': return require('../../../src/assets/placeholder-roof.png');
      default: return require('../../../src/assets/placeholder-generic.png');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>שגיאה בטעינת הנתונים</Text>
      </View>
    );
  }

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase.from('properties').update(editForm).eq('id', propertyId);
      if (error) throw error;
      setProperty({ ...property, ...editForm });
      setEditModalVisible(false);
      Alert.alert('נשמר', 'פרטי הנכס עודכנו בהצלחה', [{ text: 'אישור' }]);
    } catch (err: any) {
      Alert.alert('שגיאה', 'ארעה שגיאה בשמירה: ' + err.message);
    }
  };

  const imageSource = property.image_url 
    ? { uri: property.image_url.startsWith('http') ? property.image_url : supabase.storage.from('property-images').getPublicUrl(property.image_url).data.publicUrl } 
    : getPlaceholderImage(property.property_type);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Image & NavBar */}
      <View style={styles.headerImageContainer}>
        <Image source={imageSource} style={styles.headerImage} />
        <View style={styles.headerOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowRight color="#ffffff" size={24} />
          </TouchableOpacity>
          <View style={{flexDirection: 'row-reverse', gap: 12}}>
             <TouchableOpacity style={styles.iconBtn} onPress={() => {
                setEditForm({ name: property.name || '', street: property.street || '', house_number: property.house_number || '', city: property.city || '' });
                setEditModalVisible(true);
             }}>
               <Edit color="#ffffff" size={20} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.iconBtn}>
               <Settings color="#ffffff" size={20} />
             </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title and Address */}
        <View style={styles.titleSection}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.address}>{`${property.street} ${property.house_number}, ${property.city}`}</Text>
            <MapPin color="#8A9DB8" size={16} style={{ marginLeft: 6 }} />
          </View>
        </View>

        {/* Quick Actions (Dashboard like) */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MainTabs', { screen: 'Documents' })}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
              <FileText color="#4F46E5" size={24} />
            </View>
            <Text style={styles.actionText}>מסמכים וחוזים</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MainTabs', { screen: 'Payments' })}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <CreditCard color="#F59E0B" size={24} />
            </View>
            <Text style={styles.actionText}>דיווח תשלומים</Text>
          </TouchableOpacity>
        </View>

        {/* Contract Status (Current Tenant) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>סטטוס פעיל</Text>
          {property.active_contract && property.active_contract.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardText}>שוכר: {property.active_contract[0].tenant_name}</Text>
              <Text style={styles.cardText}>שכירות: ₪{property.active_contract[0].rent_amount}</Text>
              <Text style={styles.cardText}>סיום חוזה: {property.active_contract[0].end_date}</Text>
            </View>
          ) : (
             <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>אין חוזה פעיל</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddContract')}>
                   <Text style={styles.addBtnText}>הוסף חוזה חדש</Text>
                </TouchableOpacity>
             </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Property Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>עריכת פרטי נכס</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>שם הנכס</Text>
              <TextInput
                style={styles.input}
                value={editForm.name}
                onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                placeholder="לדוגמה: דירה בתל אביב"
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>רחוב</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.street}
                  onChangeText={(text) => setEditForm({ ...editForm, street: text })}
                  placeholderTextColor="#475569"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>בית</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.house_number}
                  onChangeText={(text) => setEditForm({ ...editForm, house_number: text })}
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>עיר</Text>
              <TextInput
                style={styles.input}
                value={editForm.city}
                onChangeText={(text) => setEditForm({ ...editForm, city: text })}
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>שמירה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', textAlign: 'center', marginTop: 20 },
  headerImageContainer: { height: 260, width: '100%', position: 'relative' },
  headerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerOverlay: { position: 'absolute', top: 50, left: 24, right: 24, flexDirection: 'row-reverse', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  
  content: { padding: 24, paddingBottom: 100 },
  titleSection: { marginBottom: 32 },
  propertyName: { color: colors.text, fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  address: { color: colors.textSecondary, fontSize: 16 },
  
  actionsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  actionCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionText: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  
  section: { marginBottom: 32 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'right' },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  cardText: { color: '#E2E8F0', fontSize: 16, marginBottom: 8, textAlign: 'right' },
  
  emptyCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginBottom: 16 },
  addBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  addBtnText: { color: colors.text, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#0F172A', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, direction: 'rtl' },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'right' },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  inputLabel: { color: colors.textSecondary, fontSize: 14, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: '#0B1121', borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'right', fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 10, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: 'transparent' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 16 },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#4F46E5' },
  saveBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 16 }
});
