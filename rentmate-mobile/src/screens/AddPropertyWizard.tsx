import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { MapPin, Home, ArrowRight, Save, Camera, Building, Ruler, ImageIcon, UploadCloud } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAppTheme } from '../hooks/useAppTheme';
const PROPERTY_TYPES = ['דירה', 'בית פרטי', 'מסחרי'];

export default function AddPropertyWizard({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('דירה');
  const [size, setSize] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  const nextStep = () => {
    if (step === 1 && (!address || !city)) {
      Alert.alert('שגיאה', 'יש להזין רחוב ועיר');
      return;
    }
    setStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
    else navigation.goBack();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5 });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string, propertyId: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${propertyId}_${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false });

      if (error) throw error;
      return fileName;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('משתמש לא מחובר');

      let uploadedFileName = null;

      const { data: insertedProp, error } = await supabase
        .from('properties')
        .insert({
          user_id: userData.user.id,
          address,
          city,
          property_type: type,
          size_sqm: size ? parseInt(size) : null,
          status: 'active'
        })
        .select('id')
        .single();

      if (error) throw error;
      
      if (imageUri && insertedProp) {
        uploadedFileName = await uploadImage(imageUri, insertedProp.id);
        if (uploadedFileName) {
          await supabase
            .from('properties')
            .update({ image_url: uploadedFileName })
            .eq('id', insertedProp.id);
        }
      }

      Alert.alert('הצלחה', 'הנכס נוסף בהצלחה!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('שגיאה תפעולית', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הוספת נכס</Text>
        <View style={styles.stepIndicatorBox}>
          <Text style={styles.stepText}>שלב {step} מתוך 3</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Step 1: Location */}
        {step === 1 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>איפה הנכס ממוקם?</Text>
            <Text style={styles.sectionSubtitle}>הזן כתובת מדויקת לניהול נוח.</Text>

            <Text style={styles.label}>עיר</Text>
            <View style={styles.inputContainer}>
              <MapPin color="#8A9DB8" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="למשל: תל אביב, חיפה"
                placeholderTextColor="#64748B"
                value={city}
                onChangeText={setCity}
              />
            </View>

            <Text style={styles.label}>כתובת מדויקת</Text>
            <View style={styles.inputContainer}>
              <Home color="#8A9DB8" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="רחוב, מספר בית ודירה"
                placeholderTextColor="#64748B"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>פרטי הנכס</Text>
            <Text style={styles.sectionSubtitle}>סוג הנכס קובע את סוג החוזה למערכת.</Text>

            <Text style={styles.label}>סוג הנכס</Text>
            <View style={styles.typeContainer}>
              {PROPERTY_TYPES.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={[styles.typeOption, type === opt && styles.typeOptionActive]}
                  onPress={() => setType(opt)}
                >
                  <Text style={[styles.typeText, type === opt && styles.typeTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>גודל רשום בטאבו (מ״ר)</Text>
            <View style={styles.inputContainer}>
              <Ruler color="#8A9DB8" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="לדוגמה: 120"
                placeholderTextColor="#64748B"
                value={size}
                onChangeText={setSize}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Step 3: Photo & Save */}
        {step === 3 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>תמונת נושא</Text>
            <Text style={styles.sectionSubtitle}>תמונה יפה עוזרת למצוא את הנכס מהר.</Text>

            <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
              {imageUri ? (
                 <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.emptyImageBox}>
                  <UploadCloud color="#4F46E5" size={40} />
                  <Text style={styles.uploadText}>בחר תמונה מהטלפון</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons Footer */}
        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>המשך</Text>
            </TouchableOpacity>
          ) : (
             <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
               {loading ? <ActivityIndicator color="#ffffff" /> : (
                 <>
                   <Save color="#ffffff" size={20} style={{ marginRight: 8 }} />
                   <Text style={styles.saveBtnText}>צור נכס במערכת</Text>
                 </>
               )}
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  stepIndicatorBox: { backgroundColor: 'rgba(79, 70, 229, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stepText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 13 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'space-between' },
  formContainer: { flex: 1 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'right', marginBottom: 4 },
  sectionSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'right', marginBottom: 32 },
  label: { color: colors.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right', marginTop: 12, marginBottom: 8 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, height: 60, paddingHorizontal: 16 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', marginRight: 12 },
  icon: { opacity: 0.7 },
  typeContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  typeOption: { flex: 1, height: 60, borderRadius: 16, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeOptionActive: { backgroundColor: 'rgba(79, 70, 229, 0.1)', borderColor: '#4F46E5' },
  typeText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  typeTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  imageUploadBox: { height: 200, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 2, borderColor: 'rgba(79, 70, 229, 0.3)', borderStyle: 'dashed', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  emptyImageBox: { alignItems: 'center' },
  uploadText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 12 },
  footer: { marginTop: 40 },
  nextBtn: { backgroundColor: colors.text, borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: colors.background, fontSize: 18, fontWeight: '900' },
  saveBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  saveBtnText: { color: colors.text, fontSize: 18, fontWeight: '900' }
});
