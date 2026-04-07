import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowRight, Save, Camera, Plus, X, CheckSquare, Settings2, Home, UploadCloud, CheckCircle2, Copy, Smartphone, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../hooks/useAppTheme';

const STEPS = [
  'פרטי מסירה',
  'מוני צריכה',
  'תכולה ומלאי',
  'ליקויים',
  'מפתחות ושלטים',
  'סיכום ושליחה'
];

export default function ProtocolWizardScreen({ route, navigation }: any) {
  const { propertyId } = route.params || {};
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Step 1: Handover
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().split('T')[0]);
  const [tenantName, setTenantName] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Step 2: Utilities
  const [utilities, setUtilities] = useState<any[]>([
    { id: '1', type: 'חשמל', meterNumber: '', reading: '', images: [] },
    { id: '2', type: 'מים', meterNumber: '', reading: '', images: [] },
    { id: '3', type: 'גז', meterNumber: '', reading: '', images: [] },
  ]);

  // Step 3: Inventory
  const [inventory, setInventory] = useState<any[]>([{ id: '1', name: '', condition: '' }]);
  const [inventoryImages, setInventoryImages] = useState<string[]>([]);

  // Step 4: Fixes
  const [fixes, setFixes] = useState<any[]>([]);

  // Step 5: Keys
  const [keys, setKeys] = useState({
    frontDoor: 2,
    buildingFob: 1,
    parkingRemote: 0,
    mailBox: 1
  });

  const uploadImage = async (uri: string) => {
    try {
      const ext = uri.substring(uri.lastIndexOf('.') + 1).toLowerCase();
      const fileName = `protocols/${propertyId || 'draft'}/${Date.now()}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: `photo.${ext}`,
        type: `image/${ext === 'png' ? 'png' : 'jpeg'}`
      } as any);
      
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, formData);

      if (error) throw error;
      return data.path;
    } catch (e) {
      console.error(e);
      Alert.alert("שגיאה", "שגיאה בהעלאת התמונה");
      return null;
    }
  };

  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [mediaCallback, setMediaCallback] = useState<((uri: string) => void) | null>(null);

  const handleMediaOption = (onResult: (uri: string) => void) => {
    setMediaCallback(() => onResult);
    setMediaModalVisible(true);
  };

  const handleTakePhoto = async () => {
    setMediaModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('שגיאה', 'יש לאשר גישה למצלמה');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled && result.assets?.[0]?.uri && mediaCallback) {
      mediaCallback(result.assets[0].uri);
    }
  };

  const handlePickGallery = async () => {
    setMediaModalVisible(false);
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled && result.assets?.[0]?.uri && mediaCallback) {
      mediaCallback(result.assets[0].uri);
    }
  };

  const pickUtilityImage = (id: string) => {
    handleMediaOption(async (uri) => {
      setLoading(true);
      const path = await uploadImage(uri);
      if (path) {
        setUtilities(prev => prev.map(u => u.id === id ? { ...u, images: [...u.images, path] } : u));
      }
      setLoading(false);
    });
  };

  const pickInventoryImage = () => {
    handleMediaOption(async (uri) => {
      setLoading(true);
      const path = await uploadImage(uri);
      if (path) setInventoryImages(prev => [...prev, path]);
      setLoading(false);
    });
  };

  const pickFixImage = (id: string) => {
    handleMediaOption(async (uri) => {
      setLoading(true);
      const path = await uploadImage(uri);
      if (path) {
        setFixes(prev => prev.map(f => f.id === id ? { ...f, images: [...f.images, path] } : f));
      }
      setLoading(false);
    });
  };

  const handleCreateProtocol = async () => {
    if (!tenantName || !tenantId) {
      Alert.alert("שגיאה", "יש להזין שם ות.ז של השוכר");
      return;
    }

    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const content = {
        utilities,
        inventory: { items: inventory, global_images: inventoryImages },
        fixes,
        keys,
        includeDisclaimer: true
      };

      const { error } = await supabase.from('protocols').insert({
        property_id: propertyId,
        status: 'pending_signature',
        handover_date: new Date().toISOString(),
        tenants_details: [{ name: tenantName, id: tenantId }],
        content: content,
        evidence_urls: null,
        tenant_signing_token: token
      });

      if (error) throw error;
      setGeneratedToken(token);
    } catch (e: any) {
      console.error(e);
      Alert.alert("שגיאה תפעולית", e.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!tenantName || !tenantId)) {
      Alert.alert('שגיאה', 'יש למלא שם מלא ותעודת זהות');
      return;
    }
    setStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
    else navigation.goBack();
  };

  if (generatedToken) {
    const signUrl = `https://rentmate.co.il/sign/${generatedToken}`;
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
        <View style={styles.successCard}>
          <CheckCircle2 color="#10B981" size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.successTitle}>הפרוטוקול נוצר!</Text>
          <Text style={styles.successSubtitle}>הפרוטוקול נשמר בהצלחה. כעת, שלח את הקישור לשוכר כדי שיוכל לעיין בכל הפרטים ולחתום עליו ישירות מהנייד שלו.</Text>
          
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: '#25D366', marginTop: 32 }]} 
            onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`שלום ${tenantName}, מצורף קישור לעיון וחתימה על פרוטוקול מסירת הנכס: ${signUrl}`)}`)}>
            <Smartphone color="#ffffff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>שליחה בוואטסאפ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.nextBtn, { marginTop: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
            <Text style={[styles.nextBtnText, { color: colors.text }]}>סיום וחזרה לראשי</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={prevStep}>
          <ArrowRight color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מסירת נכס</Text>
        <View style={styles.stepIndicatorBox}>
          <Text style={styles.stepText}>שלב {step} מתוך 6</Text>
        </View>
      </View>

      <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={() => setMediaModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMediaModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>איך תרצה להוסיף תמונה?</Text>
            <View style={styles.modalOptions}>
              <TouchableOpacity style={styles.modalOptionBtn} onPress={handleTakePhoto}>
                <View style={[styles.modalIconBox, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                  <Camera color="#4F46E5" size={28} />
                </View>
                <Text style={styles.modalOptionText}>צלם תמונה</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalOptionBtn} onPress={handlePickGallery}>
                <View style={[styles.modalIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <ImageIcon color="#10B981" size={28} />
                </View>
                <Text style={styles.modalOptionText}>בחר מגלריה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        
        {step === 1 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>פרטי המסירה</Text>
            <Text style={styles.sectionSubtitle}>למי הנכס נמסר ומתי</Text>

            <Text style={styles.label}>שם השוכר <Text style={{color:'red'}}>*</Text></Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} placeholder="ישראל ישראלי" placeholderTextColor="#64748B" value={tenantName} onChangeText={setTenantName} />
            </View>

            <Text style={styles.label}>ת.ז / דרכון <Text style={{color:'red'}}>*</Text></Text>
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} placeholder="מספר זיהוי" placeholderTextColor="#64748B" value={tenantId} onChangeText={setTenantId} keyboardType="numeric" />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>מוני צריכה</Text>
            <Text style={styles.sectionSubtitle}>רישום מספרי מונים וקריאה נוכחית</Text>
            {utilities.map(u => (
               <View key={u.id} style={styles.card}>
                 <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'}}>
                   <Text style={{fontWeight: 'bold', fontSize: 18, color: colors.text}}>{u.type}</Text>
                   <TouchableOpacity onPress={() => pickUtilityImage(u.id)} style={styles.cameraBtn}>
                     <Camera color={colors.text} size={20} />
                   </TouchableOpacity>
                 </View>
                 <View style={{flexDirection: 'row-reverse', gap: 12, marginTop: 12}}>
                    <View style={{flex: 1}}>
                      <Text style={styles.microLabel}>מספר מונה</Text>
                      <TextInput style={styles.microInput} value={u.meterNumber} onChangeText={(t) => setUtilities(prev => prev.map(x => x.id === u.id ? {...x, meterNumber: t} : x))} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.microLabel}>קריאה החל מ</Text>
                      <TextInput style={styles.microInput} value={u.reading} onChangeText={(t) => setUtilities(prev => prev.map(x => x.id === u.id ? {...x, reading: t} : x))} />
                    </View>
                 </View>
                 <Text style={{textAlign: 'right', marginTop: 8, fontSize: 12, color: colors.textSecondary}}>צולמו {u.images.length} תמונות</Text>
               </View>
            ))}
            <TouchableOpacity style={styles.dashedBtn} onPress={() => setUtilities(prev => [...prev, {id: Math.random().toString(), type: 'אחר', meterNumber: '', reading: '', images: []}])}>
               <Plus color={colors.text} size={20} />
               <Text style={{color: colors.text, fontWeight: 'bold', marginRight: 8}}>הוסף מונה נוסף</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>תכולה ומלאי</Text>
            <Text style={styles.sectionSubtitle}>מה צמוד לנכס (מזגנים, ריהוט וכו׳)</Text>
            
            <TouchableOpacity style={[styles.dashedBtn, {marginBottom: 20}]} onPress={pickInventoryImage}>
               <Camera color={colors.text} size={20} />
               <Text style={{color: colors.text, fontWeight: 'bold', marginRight: 8}}>צילום תכולה כללית ({inventoryImages.length} תמונות)</Text>
            </TouchableOpacity>

            {inventory.map(item => (
              <View key={item.id} style={{flexDirection: 'row-reverse', gap: 8, marginBottom: 12}}>
                <TextInput style={[styles.microInput, {flex: 2}]} placeholder="פריט (למשל: ספה)" placeholderTextColor="#888" value={item.name} onChangeText={(t) => setInventory(prev => prev.map(x => x.id === item.id ? {...x, name: t} : x))} />
                <TextInput style={[styles.microInput, {flex: 1}]} placeholder="מצב" placeholderTextColor="#888" value={item.condition} onChangeText={(t) => setInventory(prev => prev.map(x => x.id === item.id ? {...x, condition: t} : x))} />
                <TouchableOpacity onPress={() => setInventory(prev => prev.filter(x => x.id !== item.id))} style={styles.deleteBtn}><X color="white" size={16}/></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.dashedBtn} onPress={() => setInventory(prev => [...prev, {id: Math.random().toString(), name: '', condition: ''}])}>
               <Plus color={colors.text} size={20} />
               <Text style={{color: colors.text, fontWeight: 'bold', marginRight: 8}}>הוסף פריט תכולה</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>ליקויים ידועים</Text>
            <Text style={styles.sectionSubtitle}>אילו ליקויים קיימים בנכס במעמד המסירה?</Text>
            
            {fixes.map(fix => (
              <View key={fix.id} style={[styles.card, {marginBottom: 12}]}>
                 <View style={{flexDirection: 'row-reverse', gap: 8}}>
                    <TextInput style={[styles.microInput, {flex: 1}]} placeholder="ליקוי (לדוגמה: שריטה בדלת)" placeholderTextColor="#888" value={fix.description} onChangeText={(t) => setFixes(prev => prev.map(x => x.id === fix.id ? {...x, description: t} : x))} />
                    <TouchableOpacity onPress={() => setFixes(prev => prev.filter(x => x.id !== fix.id))} style={styles.deleteBtn}><X color="white" size={16}/></TouchableOpacity>
                 </View>
                 <TouchableOpacity style={[styles.dashedBtn, {marginTop: 12, height: 40}]} onPress={() => pickFixImage(fix.id)}>
                   <Camera color={colors.text} size={16} />
                   <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 13, marginRight: 8}}>הוסף צילום ({fix.images.length})</Text>
                 </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.dashedBtn} onPress={() => setFixes(prev => [...prev, {id: Math.random().toString(), description: '', images: []}])}>
               <Plus color={colors.text} size={20} />
               <Text style={{color: colors.text, fontWeight: 'bold', marginRight: 8}}>הוסף תיעוד ליקוי</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>מפתחות ושלטים</Text>
            <Text style={styles.sectionSubtitle}>כמות המפתחות והשלטים שנמסרים לידי השוכר</Text>
            
            <View style={{flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12}}>
              {[
                 { key: 'frontDoor', label: 'מפתחות דלת' },
                 { key: 'buildingFob', label: 'צ\'יפ כניסה' },
                 { key: 'parkingRemote', label: 'שלטי חניה' },
                 { key: 'mailBox', label: 'מפתח דואר' },
              ].map(k => (
                <View key={k.key} style={[styles.card, {width: '48%'}]}>
                   <Text style={{textAlign: 'center', fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12}}>{k.label}</Text>
                   <View style={{flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 16}}>
                      <TouchableOpacity onPress={() => setKeys(p => ({...p, [k.key]: (p as any)[k.key] + 1}))} style={styles.counterBtn}><Plus color={colors.text} size={16}/></TouchableOpacity>
                      <Text style={{fontSize: 20, fontWeight: '900', color: colors.text}}>{(keys as any)[k.key]}</Text>
                      <TouchableOpacity onPress={() => setKeys(p => ({...p, [k.key]: Math.max(0, (p as any)[k.key] - 1)}))} style={styles.counterBtn}><Text style={{fontWeight: '900', color: colors.text}}>-</Text></TouchableOpacity>
                   </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 6 && (
          <View style={styles.formContainer}>
             <Text style={styles.sectionTitle}>סיכום ויצירת מסמך</Text>
             <Text style={styles.sectionSubtitle}>הפרוטוקול כמעט מוכן לשליחה לשוכר</Text>

             <View style={styles.card}>
               <Text style={{textAlign: 'right', fontWeight: 'bold', color: colors.text, fontSize: 16}}>תיאור המסירה</Text>
               <Text style={{textAlign: 'right', marginTop: 8, color: colors.textSecondary}}>תאריך: {handoverDate}</Text>
               <Text style={{textAlign: 'right', marginTop: 4, color: colors.textSecondary}}>שוכר: {tenantName} ({tenantId})</Text>
               <Text style={{textAlign: 'right', marginTop: 16, color: colors.textSecondary, fontSize: 12}}>הפרוטוקול כולל סעיף ויתור על פגם נסתר שיאושר על ידי השוכר במעמד החתימה.</Text>
             </View>
          </View>
        )}

        {/* Action Buttons Footer */}
        <View style={styles.footer}>
          {step < 6 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <Text style={styles.nextBtnText}>המשך ({STEPS[step]})</Text>
            </TouchableOpacity>
          ) : (
             <TouchableOpacity style={styles.saveBtn} onPress={handleCreateProtocol} disabled={loading}>
               {loading ? <ActivityIndicator color="#ffffff" /> : (
                 <>
                   <Save color="#ffffff" size={20} style={{ marginRight: 8 }} />
                   <Text style={styles.saveBtnText}>צור פרוטוקול ושלוח</Text>
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
  backButton: { padding: 8, backgroundColor: colors.surface, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  stepIndicatorBox: { backgroundColor: 'rgba(79, 70, 229, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stepText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 13 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'space-between' },
  formContainer: { flex: 1 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'right', marginBottom: 4 },
  sectionSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'right', marginBottom: 32 },
  label: { color: colors.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right', marginTop: 12, marginBottom: 8 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, height: 60, paddingHorizontal: 16 },
  input: { flex: 1, color: colors.text, fontSize: 16, textAlign: 'right' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  cameraBtn: { backgroundColor: colors.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border },
  microLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'right', marginBottom: 4 },
  microInput: { backgroundColor: colors.background, borderRadius: 8, padding: 10, textAlign: 'right', color: colors.text, borderWidth: 1, borderColor: colors.border },
  dashedBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border },
  deleteBtn: { backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', width: 44, borderRadius: 8 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  footer: { marginTop: 40 },
  nextBtn: { backgroundColor: colors.text, borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: colors.background, fontSize: 18, fontWeight: '900' },
  saveBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  saveBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  successCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  successSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 32 },
  modalOptions: { flexDirection: 'row-reverse', justifyContent: 'space-evenly' },
  modalOptionBtn: { alignItems: 'center', gap: 12 },
  modalIconBox: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  modalOptionText: { fontSize: 16, fontWeight: 'bold', color: colors.text }
});
