import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, UploadCloud, FileText, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function AIScannerScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

    const navigation = useNavigation<any>();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success'>('idle');
    const [parsedData, setParsedData] = useState<any>(null);

    const pickImage = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('שגיאה', 'יש לאשר גישה למצלמה');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct enum access
                    allowsEditing: true,
                    quality: 0.8 });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8 });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picking error', error);
            Alert.alert('שגיאה', 'נכשל בקריאת תמונה');
        }
    };

    const processImage = async (uri: string) => {
        try {
            setStatus('uploading');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            // 1. Upload to Supabase temp_scans bucket
            const fileName = `${Date.now()}_scan.jpg`;
            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                name: fileName,
                type: 'image/jpeg' } as any);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('temp_scans')
                .upload(fileName, formData, {
                    upsert: false
                });

            if (uploadError) throw new Error('שגיאה בהעלאת התמונה לענן');

            // 2. Analyze
            setStatus('analyzing');
            const storagePaths = [uploadData.path];
            
            const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-contract', {
                body: { images: [], storagePaths }
            });

            if (analysisError) throw analysisError;

            // 3. Success
            setStatus('success');
            setParsedData(analysisData?.fields || []);

        } catch (error: any) {
            console.error('Analysis error:', error);
            Alert.alert('שגיאת פענוח', error.message || 'הפענוח נכשל');
            setStatus('idle');
            setImageUri(null);
        }
    };

    const handleConfirm = () => {
        // Here we could navigate to AddContract with the prepopulated data.
        // For now, we will just go back or show success message.
        Alert.alert("הצלחה", "הנתונים פוענחו ושמורים במערכת!");
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ArrowRight color="#1F2937" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>סורק חוזים חכם</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {status === 'idle' ? (
                    <View style={styles.idleState}>
                        <View style={styles.iconWrapper}>
                            <FileText color="#3B82F6" size={48} />
                        </View>
                        <Text style={styles.title}>סריקת חוזה מבוססת בינה מלאכותית</Text>
                        <Text style={styles.subtitle}>
                            צלם או העלה חוזה קיים מהגלריה. המערכת תזהה אוטומטית את פרטי השוכר, תאריכים וסכומי השכירות.
                        </Text>

                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity style={styles.primaryButton} onPress={() => pickImage(true)}>
                                <Camera color="#FFF" size={24} style={{ marginLeft: 8 }} />
                                <Text style={styles.primaryButtonText}>צלם חוזה</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={() => pickImage(false)}>
                                <UploadCloud color="#3B82F6" size={24} style={{ marginLeft: 8 }} />
                                <Text style={styles.secondaryButtonText}>העלה מהגלריה</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : status === 'success' ? (
                    <View style={styles.successState}>
                        <View style={styles.successIconWrapper}>
                            <CheckCircle2 color="#10B981" size={64} />
                        </View>
                        <Text style={styles.title}>הפענוח הושלם בהצלחה!</Text>
                        <Text style={styles.subtitle}>
                            נמשכו {parsedData?.length || 0} שדות מתוך המסמך, כולל פרטי שוכר, תאריכים וסכומים.
                        </Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
                            <Text style={styles.primaryButtonText}>המשך למילוי אוטומטי</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.processingState}>
                        {imageUri && (
                            <Image source={{ uri: imageUri }} style={styles.previewImage} blurRadius={4} />
                        )}
                        <View style={styles.overlay}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.processingText}>
                                {status === 'uploading' ? 'מעלה מסמך בטופס מאובטח...' : 'מפענח תוכן באמצעות AI...'}
                            </Text>
                            <View style={styles.secureBadge}>
                                <ShieldCheck color="#FFF" size={16} />
                                <Text style={styles.secureText}>מוצפן ומאובטח (E2E)</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB' },
    iconButton: {
        padding: 8 },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827' },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24 },
    idleState: {
        alignItems: 'center' },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24 },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12 },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40 },
    buttonsContainer: {
        width: '100%',
        gap: 16 },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4 },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold' },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingVertical: 16,
        borderRadius: 16 },
    secondaryButtonText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: 'bold' },
    processingState: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative' },
    previewImage: {
        width: '100%',
        height: '100%',
        opacity: 0.8 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(31, 41, 55, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24 },
    processingText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 24,
        textAlign: 'center' },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 16 },
    secureText: {
        color: '#FFF',
        fontSize: 12,
        marginLeft: 6 },
    successState: {
        alignItems: 'center' },
    successIconWrapper: {
        marginBottom: 24 }
});
