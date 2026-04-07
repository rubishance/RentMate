import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet,  ActivityIndicator, Alert, ScrollView, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowRight, Save, Building, Calendar, DollarSign, CheckCircle, Camera, UploadCloud, ScanLine } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAppTheme } from '../hooks/useAppTheme';

function formatDateForApi(date: Date | null): string | null {
  if (!date) return null;
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

function formatDateForDisplay(date: Date | null): string {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function AddContractWizard({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Select Property
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Step 2: Details
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [rentAmount, setRentAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const [datePickerConfig, setDatePickerConfig] = useState<{show: boolean, mode: 'start'|'end'}>({show: false, mode: 'start'});

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerConfig({ ...datePickerConfig, show: false });
    }
    if (selectedDate && event.type === 'set') {
      if (datePickerConfig.mode === 'start') {
        setStartDate(selectedDate);
      } else if (datePickerConfig.mode === 'end') {
        setEndDate(selectedDate);
      }
    }
  };

  const getActivePickerDate = () => {
    if (datePickerConfig.mode === 'start') return startDate || new Date();
    if (datePickerConfig.mode === 'end') return endDate || new Date();
    return new Date();
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    
    const { data, error } = await supabase
      .from('properties')
      .select('id, address, city')
      .eq('user_id', userData.user.id)
      .eq('status', 'active');
      
    if (!error && data) {
      setProperties(data);
    }
  };

  const handleAIScan = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('שגיאה', 'יש לאשר גישה למצלמה');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8 });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsScanning(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const uri = result.assets[0].uri;
        const fileName = `${Date.now()}_contract_scan.jpg`;
        const formData = new FormData();
        formData.append('file', {
          uri,
          name: fileName,
          type: 'image/jpeg' } as any);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('temp_scans')
          .upload(fileName, formData, { upsert: false });

        if (uploadError) throw new Error('שגיאה בהעלאת התמונה לענן');

        const storagePaths = [uploadData.path];
        
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-contract', {
          body: { images: [], storagePaths }
        });

        if (analysisError) throw analysisError;

        Alert.alert('הצלחה', 'הנתונים פוענחו בהצלחה מהרוזה וימלאו את השדות!');
        
        // Auto-fill fields from parsed data
        const fields = analysisData?.fields || [];
        const rentField = fields.find((f: any) => f.fieldName === 'monthly_rent');
        if (rentField) setRentAmount(rentField.extractedValue.toString());

        const startField = fields.find((f: any) => f.fieldName === 'start_date');
        if (startField && startField.extractedValue) {
           const d = new Date(startField.extractedValue);
           if (!isNaN(d.getTime())) setStartDate(d);
        }
        
        const endField = fields.find((f: any) => f.fieldName === 'end_date');
        if (endField && endField.extractedValue) {
           const d = new Date(endField.extractedValue);
           if (!isNaN(d.getTime())) setEndDate(d);
        }

      }
    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert('שגיאת פענוח', error.message || 'הפענוח נכשל');
    } finally {
      setIsScanning(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedPropertyId) {
      Alert.alert('שגיאה', 'יש לבחור נכס מתוך הרשימה');
      return;
    }
    if (step === 2 && (!startDate || !rentAmount)) {
      Alert.alert('שגיאה', 'יש להזין תאריך התחלה ודמי שכירות');
      return;
    }
    setStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
    else navigation.goBack();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('משתמש לא מחובר');

      const { error } = await supabase
        .from('contracts')
        .insert({
          user_id: userData.user.id,
          property_id: selectedPropertyId,
          start_date: startDate ? formatDateForApi(startDate) : new Date().toISOString().split('T')[0],
          end_date: endDate ? formatDateForApi(endDate) : null,
          base_rent: parseInt(rentAmount) || 0,
          status: 'active',
          linkage_type: 'none',
          status_updates: { events: [{ type: 'created', timestamp: new Date().toISOString() }] }
        });

      if (error) throw error;
      
      Alert.alert('הצלחה', 'החוזה נוסף בהצלחה!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('שגיאה תפעולית', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הוספת חוזה התקשרות</Text>
        <View style={styles.stepIndicatorBox}>
          <Text style={styles.stepText}>שלב {step} מתוך 3</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Step 1: Select Property */}
        {step === 1 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>לאיזה נכס משויך החוזה?</Text>
            <Text style={styles.sectionSubtitle}>בחר נכס מרשימת הנכסים הקיימים שלך.</Text>

            {properties.length === 0 ? (
               <View style={styles.emptyBox}>
                 <Text style={styles.emptyText}>לא נמצאו נכסים פעילים.</Text>
               </View>
            ) : (
              <View style={styles.propertyList}>
                {properties.map(p => {
                  const isSelected = selectedPropertyId === p.id;
                  return (
                    <TouchableOpacity 
                      key={p.id}
                      style={[styles.propertyCard, isSelected && styles.propertyCardSelected]}
                      onPress={() => setSelectedPropertyId(p.id)}
                    >
                       <Building color={isSelected ? '#4F46E5' : '#8A9DB8'} size={24} />
                       <View style={{flex: 1, marginRight: 12}}>
                          <Text style={[styles.propAddress, isSelected && {color: '#4F46E5'}]}>{p.address}</Text>
                          {p.city && <Text style={styles.propCity}>{p.city}</Text>}
                       </View>
                       {isSelected && <CheckCircle color="#4F46E5" size={20} />}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Contract Details */}
        {step === 2 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>פרטי החוזה</Text>
            <Text style={styles.sectionSubtitle}>הזן את החיוב החודשי ותאריכי הכניסה.</Text>

            <View style={styles.scanContainer}>
              <Text style={styles.scanTitle}>מילוי אוטומטי בעזרת בינה מלאכותית</Text>
              <Text style={styles.scanSubtitle}>סרוק או תעלה חוזה קיים ואנחנו נמלא את השדות עבורך</Text>
              
              <View style={styles.scanButtonsRow}>
                <TouchableOpacity 
                  style={styles.scanBtn} 
                  onPress={() => handleAIScan(true)}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <ActivityIndicator color="#4F46E5" size="small" />
                  ) : (
                    <>
                      <Camera color="#4F46E5" size={20} />
                      <Text style={styles.scanBtnText}>צלם חוזה</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.scanBtn} 
                  onPress={() => handleAIScan(false)}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <ActivityIndicator color="#4F46E5" size="small" />
                  ) : (
                    <>
                      <UploadCloud color="#4F46E5" size={20} />
                      <Text style={styles.scanBtnText}>העלה קובץ</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider}>
               <View style={styles.dividerLine} />
               <Text style={styles.dividerText}>או הכנס ידנית</Text>
               <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>דמי שכירות חודשיים (₪)</Text>
            <View style={styles.inputContainer}>
              <DollarSign color="#8A9DB8" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="למשל: 5000"
                placeholderTextColor="#64748B"
                value={rentAmount}
                onChangeText={setRentAmount}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>תאריך התחלה</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerConfig({show: true, mode: 'start'})}>
              <Calendar color="#8A9DB8" size={20} style={styles.icon} />
              <Text style={[styles.input, {color: startDate ? colors.text : '#64748B', paddingTop: 18}]}>
                {formatDateForDisplay(startDate) || 'בחירת תאריך התחלה'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>תאריך סיום (אופציונלי)</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerConfig({show: true, mode: 'end'})}>
              <Calendar color="#8A9DB8" size={20} style={styles.icon} />
              <Text style={[styles.input, {color: endDate ? colors.text : '#64748B', paddingTop: 18}]}>
                {formatDateForDisplay(endDate) || 'בחירת תאריך סיום'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>הכל מוכן!</Text>
            <Text style={styles.sectionSubtitle}>החוזה מקושר בהצלחה לנכס ויעודכן בלוח הבקרה שלך מיד בסיום השמירה.</Text>

            <View style={styles.summaryBox}>
               <Text style={styles.summaryTitle}>סיכום תנאי החוזה:</Text>
               <View style={styles.summaryRow}>
                 <Text style={styles.summaryVal}>₪{rentAmount || 0}</Text>
                 <Text style={styles.summaryKey}>שכירות:</Text>
               </View>
               <View style={styles.summaryRow}>
                 <Text style={styles.summaryVal}>{startDate ? formatDateForDisplay(startDate) : ''}</Text>
                 <Text style={styles.summaryKey}>התחלה:</Text>
               </View>
               <View style={styles.summaryRow}>
                 <Text style={styles.summaryVal}>{endDate ? formatDateForDisplay(endDate) : 'הסכם מתחדש'}</Text>
                 <Text style={styles.summaryKey}>סיום:</Text>
               </View>
            </View>
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
                   <Text style={styles.saveBtnText}>שמור חוזה במערכת</Text>
                 </>
               )}
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* DatePicker Modals */}
      {datePickerConfig.show && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}>
              <View style={{backgroundColor: colors.surface, padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24}}>
                <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 16}}>
                  <TouchableOpacity onPress={() => setDatePickerConfig({...datePickerConfig, show: false})}>
                    <Text style={{color: '#4F46E5', fontSize: 18, fontWeight: 'bold'}}>אישור / סגירה</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={getActivePickerDate()}
                  mode="date"
                  display="spinner"
                  onChange={onChangeDate}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={getActivePickerDate()}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )
      )}
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
  
  propertyList: { gap: 12 },
  propertyCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  propertyCardSelected: { backgroundColor: 'rgba(79, 70, 229, 0.1)', borderColor: '#4F46E5' },
  propAddress: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  propCity: { color: colors.textSecondary, fontSize: 14, textAlign: 'right', marginTop: 4 },
  emptyBox: { padding: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, alignItems: 'center' },
  emptyText: { color: '#EF4444', fontSize: 16 },

  label: { color: colors.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right', marginTop: 12, marginBottom: 8 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, height: 60, paddingHorizontal: 16 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right', marginRight: 12 },
  icon: { opacity: 0.7 },
  
  summaryBox: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 16 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginBottom: 12 },
  summaryKey: { color: colors.textSecondary, fontSize: 16, width: 80, textAlign: 'right' },
  summaryVal: { color: colors.text, fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'right' },

  scanContainer: { backgroundColor: 'rgba(79, 70, 229, 0.05)', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.2)' },
  scanTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  scanSubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: 'right', marginBottom: 16 },
  scanButtonsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 },
  scanBtn: { flex: 1, flexDirection: 'row-reverse', backgroundColor: 'rgba(79, 70, 229, 0.1)', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.3)' },
  scanBtnText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 15, marginRight: 8 },

  divider: { flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textSecondary, marginHorizontal: 16, fontSize: 14 },

  footer: { marginTop: 40 },
  nextBtn: { backgroundColor: colors.text, borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: colors.background, fontSize: 18, fontWeight: '900' },
  saveBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  saveBtnText: { color: colors.text, fontSize: 18, fontWeight: '900' }
});
