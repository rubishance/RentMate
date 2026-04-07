import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet,  FlatList, ActivityIndicator, Image, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Wrench, Plus, Upload, Camera, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

import { useAppTheme } from '../hooks/useAppTheme';
export default function MaintenanceScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form state
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('properties').select('id, address').eq('user_id', session.user.id);
    if (data) setProperties(data);
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('property_documents')
      .select('id, description, amount, document_date, storage_path, properties(address)')
      .eq('user_id', session.user.id)
      .eq('category', 'maintenance')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // For each ticket, get a signed URL if we have a path
      const withUrls = await Promise.all(data.map(async (t) => {
        if (t.storage_path) {
          const { data: urlData } = await supabase.storage.from('property_documents').createSignedUrl(t.storage_path, 3600);
          return { ...t, imageUrl: urlData?.signedUrl };
        }
        return t;
      }));
      setTickets(withUrls);
    }
    setLoading(false);
  };

  const pickImage = async (useCamera: boolean = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5 });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!selectedPropertyId) return Alert.alert('שגיאה', 'יש לבחור נכס');
    if (!description.trim()) return Alert.alert('שגיאה', 'יש להזין תיאור');
    
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let storagePath = '';
      if (imageUri) {
         const fileExt = imageUri.split('.').pop();
         const fileName = `${session.user.id}/${Date.now()}_maintenance.${fileExt}`;
         
         const response = await fetch(imageUri);
         const blob = await response.blob();
         
         const { error: uploadError } = await supabase.storage
            .from('property_documents')
            .upload(fileName, blob, { contentType: `image/${fileExt}` });
            
         if (uploadError) throw new Error('Upload failed');
         storagePath = fileName;
      }

      const { error } = await supabase.from('property_documents').insert({
         user_id: session.user.id,
         property_id: selectedPropertyId,
         category: 'maintenance',
         storage_bucket: 'property_documents',
         storage_path: storagePath || 'NO_PATH',
         file_name: storagePath ? storagePath.split('/').pop() : 'maintenance_record',
         description: description,
         amount: parseFloat(amount) || 0,
         document_date: new Date().toISOString()
      });

      if (error) throw error;
      
      Alert.alert('הצלחה', 'קריאת השירות נשמרה בהצלחה');
      setModalVisible(false);
      resetForm();
      fetchTickets();
    } catch (e: any) {
      Alert.alert('שגיאה', e.message);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setImageUri(null);
    setSelectedPropertyId('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>קריאות שירות</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus color="#4F46E5" size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{marginTop: 50}} />
      ) : tickets.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Wrench color="#4F46E5" size={48} />
            </View>
            <Text style={styles.emptyTitle}>אין קריאות שירות פתוחות</Text>
            <Text style={styles.emptySubtitle}>
              כאן תוכל לנהל תיקונים, לדבר עם אנשי מקצוע, ולעקוב אחרי טופולים בנכסים שלך.
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
               <Text style={styles.createBtnText}>הוסף קריאת שירות</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={i => i.id}
          contentContainerStyle={{padding: 20, paddingBottom: 100}}
          renderItem={({item}) => (
            <View style={styles.card}>
              {item.imageUrl && (
                <Image source={{uri: item.imageUrl}} style={styles.cardImage} />
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.description}</Text>
                <Text style={styles.cardSub}>{item.properties?.address}</Text>
                <Text style={styles.cardAmount}>₪{item.amount || 0}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><X color="#fff" size={24}/></TouchableOpacity>
            <Text style={styles.modalTitle}>קריאת שירות חדשה</Text>
            <View style={{width: 24}}/>
          </View>
          <ScrollView contentContainerStyle={{padding: 24}}>
            <Text style={styles.label}>בחר נכס</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
              {properties.map(p => (
                <TouchableOpacity 
                   key={p.id} 
                   style={[styles.propPill, selectedPropertyId === p.id && styles.propPillActive]}
                   onPress={() => setSelectedPropertyId(p.id)}
                >
                  <Text style={[styles.propPillText, selectedPropertyId === p.id && {color: '#fff'}]}>{p.address}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>תיאור התקלה / שירות</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="לדוגמה: נזילה בכיור המטבח..."
              placeholderTextColor="#8A9DB8"
              multiline
              value={description}
              onChangeText={setDescription}
              textAlign="right"
            />

            <Text style={styles.label}>עלות משוערת / שולמה (₪)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#8A9DB8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              textAlign="right"
            />

            <Text style={styles.label}>צילום מהשטח (אופציונלי)</Text>
            <View style={{flexDirection: 'row-reverse', gap: 12, marginBottom: 20}}>
               <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(true)}>
                 <Camera color="#4F46E5" size={20} />
                 <Text style={styles.imageBtnText}>מצלמה</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.imageBtn} onPress={() => pickImage(false)}>
                 <Upload color="#4F46E5" size={20} />
                 <Text style={styles.imageBtnText}>גלריה</Text>
               </TouchableOpacity>
            </View>
            
            {imageUri && (
               <Image source={{uri: imageUri}} style={styles.previewImage} />
            )}

          </ScrollView>
          
          <View style={styles.footer}>
             <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>שמור קריאת שירות</Text>}
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(79, 70, 229, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.3)' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', opacity: 1 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(79, 70, 229, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, color: colors.text, fontWeight: 'bold', marginBottom: 12 },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 24, marginBottom: 24 },
  createBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: colors.text, fontWeight: 'bold', fontSize: 16 },
  
  card: { backgroundColor: colors.surface, borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardImage: { width: '100%', height: 150, backgroundColor: colors.border },
  cardInfo: { padding: 16 },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  cardSub: { color: colors.textSecondary, fontSize: 14, textAlign: 'right', marginBottom: 8 },
  cardAmount: { color: '#10B981', fontSize: 16, fontWeight: 'bold', textAlign: 'right' },

  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  label: { color: colors.text, fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 10 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 16, marginBottom: 20 },
  inputArea: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 16, marginBottom: 20, height: 100, textAlignVertical: 'top' },
  propPill: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginLeft: 8 },
  propPillActive: { backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#4F46E5' },
  propPillText: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold' },
  imageBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 8 },
  imageBtnText: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 20 },
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: '#4F46E5', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.text, fontSize: 16, fontWeight: 'bold' }
});
