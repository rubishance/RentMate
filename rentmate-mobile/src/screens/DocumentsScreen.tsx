import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, ScrollView, Modal, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, Download, FileJson, Image as ImageIcon, X, ExternalLink, Filter } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function DocumentsScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Custom Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyId: 'all',
    type: 'all'
  });
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const uniqueProperties = React.useMemo(() => {
    const props = new Map();
    docs.forEach(d => {
      if (d.propertyId && d.address) {
        props.set(d.propertyId, d.address);
      }
    });
    return Array.from(props.entries()).map(([id, address]) => ({ id, address }));
  }, [docs]);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const [contractsRes, docsRes, protocolsRes] = await Promise.all([
        supabase
          .from('contracts')
          .select('id, contract_file_url, created_at, properties(id, address)')
          .not('contract_file_url', 'is', null)
          .eq('user_id', session.user.id),
        supabase
          .from('property_documents')
          .select('id, storage_path, storage_bucket, category, title, created_at, file_name, properties(id, address)')
          .eq('user_id', session.user.id),
        supabase
          .from('protocols')
          .select('id, protocol_date, created_at, properties(id, address)')
          .eq('user_id', session.user.id)
      ]);

      const contracts = (contractsRes.data || []).map((c: any) => ({
        id: `contract_${c.id}`,
        title: 'חוזה שכירות',
        propertyId: Array.isArray(c.properties) ? c.properties[0]?.id : c.properties?.id,
        address: Array.isArray(c.properties) ? c.properties[0]?.address : c.properties?.address,
        file_url: c.contract_file_url,
        created_at: c.created_at,
        type: 'contract'
      }));

      const protocols = (protocolsRes.data || []).map((p: any) => ({
        id: `protocol_${p.id}`,
        title: 'פרוטוקול מסירה',
        propertyId: Array.isArray(p.properties) ? p.properties[0]?.id : p.properties?.id,
        address: Array.isArray(p.properties) ? p.properties[0]?.address : p.properties?.address,
        file_url: '', 
        created_at: p.created_at || p.protocol_date,
        type: 'protocol'
      }));

      const otherDocs = (docsRes.data || []).map((d: any) => {
        let finalUrl = '';
        if (d.storage_path) {
          finalUrl = supabase.storage.from(d.storage_bucket || 'secure_documents').getPublicUrl(d.storage_path).data.publicUrl;
        }
        return {
          id: `doc_${d.id}`,
          title: d.title || d.file_name || 'מסמך כללי',
          propertyId: Array.isArray(d.properties) ? d.properties[0]?.id : d.properties?.id,
          address: Array.isArray(d.properties) ? d.properties[0]?.address : d.properties?.address,
          file_url: finalUrl,
          created_at: d.created_at,
          type: d.category || 'other'
        };
      });

      const merged = [...contracts, ...otherDocs, ...protocols].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocs(merged);
    } catch (err: any) {
      console.error('Error fetching docs', err);
    }

    setLoading(false);
  };

  const [downloading, setDownloading] = useState(false);

  const handleOpenDoc = async (url: string, title?: string) => {
    if (!url) {
        alert('לא הוגדר קובץ למסמך זה');
        return;
    }
    
    try {
      setDownloading(true);
      const safeTitle = (title || 'document').replace(/[^\w\u0590-\u05FF]/g, '_');
      let ext = url.split('.').pop()?.split('?')[0];
      if (!ext || ext.length > 5 || ext.includes('/')) ext = 'pdf';
      
      const fileUri = `${(FileSystem as any).documentDirectory}${safeTitle}_${Date.now()}.${ext}`;
      
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      
      if (downloadRes.status !== 200) {
        alert('התרחשה שגיאה בהורדת הקובץ');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadRes.uri, { dialogTitle: 'שמירת מסמך' });
      } else {
        alert('אין אפשרות לשתף/לשמור במכשיר זה');
      }
    } catch (err) {
      console.error('Error downloading doc:', err);
      alert('תקלה בזמן הורדת הקובץ');
    } finally {
      setDownloading(false);
    }
  };

  const filteredDocs = docs.filter((doc: any) => {
      // Type filter
      if (filters.type !== 'all') {
          if (filters.type === 'contract' && doc.type !== 'contract') return false;
          if (filters.type === 'protocol' && doc.type !== 'protocol') return false;
          if (filters.type === 'other' && (doc.type === 'contract' || doc.type === 'protocol')) return false;
      }
      // Property filter
      if (filters.propertyId !== 'all') {
          if (doc.propertyId !== filters.propertyId) return false;
      }
      return true;
  });

  const sortedFilteredDocs = [...filteredDocs].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>מסמכים וחוזים</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Filter color={showFilters ? '#4F46E5' : '#8A9DB8'} size={20} />
            <Text style={styles.filterBtnText}>סינונים</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
      ) : sortedFilteredDocs.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText color="#1e293b" size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>אין מסמכים בקטגוריה זו</Text>
        </View>
      ) : (
        <FlatList
          data={sortedFilteredDocs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isImage = item.file_url && (item.file_url.includes('.jpg') || item.file_url.includes('.png') || item.file_url.includes('.jpeg'));
            const isJson = item.type === 'parse_result' || (item.file_url && item.file_url.includes('.json'));
            
            let IconComp = FileText;
            let iconColor = '#10B981';
            let iconBg = 'rgba(16, 185, 129, 0.1)';

            if (item.type === 'contract') {
              IconComp = FileText;
              iconColor = '#4F46E5';
              iconBg = 'rgba(79, 70, 229, 0.1)';
            } else if (isImage) {
              IconComp = ImageIcon;
              iconColor = '#F59E0B';
              iconBg = 'rgba(245, 158, 11, 0.1)';
            } else if (isJson) {
              IconComp = FileJson;
              iconColor = '#EC4899';
              iconBg = 'rgba(236, 72, 153, 0.1)';
            }

            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setSelectedDoc(item)}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  <IconComp color={iconColor} size={24} />
                </View>
                <View style={styles.contentBox}>
                  <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.propAddressText} numberOfLines={1}>{item.address || 'לא משויך לנכס'}</Text>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateText}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('he-IL') : 'תאריך לא ידוע'}
                    </Text>
                    <Calendar color="#8A9DB8" size={14} style={{ marginLeft: 4 }} />
                  </View>
                </View>
                <TouchableOpacity style={styles.downloadBtn} onPress={() => handleOpenDoc(item.file_url, item.title)}>
                   <Download color="#ffffff" size={18} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Filter Modal Sheet */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.iconBtn}>
                 <X color={colors.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>מסננים מתקדמים</Text>
              <TouchableOpacity onPress={() => {
                setFilters({ propertyId: 'all', type: 'all' });
                setSortOrder('desc');
              }}>
                 <Text style={styles.resetText}>אפס הכל</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetContent}>
               <Text style={styles.filterTitle}>סוג מסמך</Text>
               <View style={styles.filterOptions}>
                  {[
                    { id: 'all', label: 'הכל' },
                    { id: 'contract', label: 'חוזים' },
                    { id: 'protocol', label: 'פרוטוקולים' },
                    { id: 'other', label: 'שונות' }
                  ].map(opt => (
                    <TouchableOpacity 
                      key={opt.id}
                      style={[styles.filterOptBtn, filters.type === opt.id && styles.filterOptBtnActive]}
                      onPress={() => setFilters({...filters, type: opt.id})}
                    >
                      <Text style={[styles.filterOptText, filters.type === opt.id && {color: '#fff'}]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
               </View>

               {uniqueProperties.length > 0 && (
                 <>
                   <Text style={[styles.filterTitle, {marginTop: 24}]}>נכסים</Text>
                   <View style={styles.filterOptions}>
                     <TouchableOpacity
                       style={[styles.filterOptBtn, filters.propertyId === 'all' && styles.filterOptBtnActive]}
                       onPress={() => setFilters({ ...filters, propertyId: 'all' })}
                     >
                       <Text style={[styles.filterOptText, filters.propertyId === 'all' && { color: '#fff' }]}>הכל</Text>
                     </TouchableOpacity>
                     {uniqueProperties.map(prop => (
                       <TouchableOpacity
                         key={prop.id}
                         style={[styles.filterOptBtn, filters.propertyId === prop.id && styles.filterOptBtnActive]}
                         onPress={() => setFilters({ ...filters, propertyId: prop.id })}
                       >
                         <Text style={[styles.filterOptText, filters.propertyId === prop.id && { color: '#fff' }]} numberOfLines={1}>
                           {prop.address}
                         </Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                 </>
               )}

               <Text style={[styles.filterTitle, {marginTop: 24}]}>סדר הודעות</Text>
               <View style={styles.filterOptions}>
                  <TouchableOpacity 
                    style={[styles.filterOptBtn, sortOrder === 'desc' && styles.filterOptBtnActive]}
                    onPress={() => setSortOrder('desc')}
                  >
                    <Text style={[styles.filterOptText, sortOrder === 'desc' && {color: '#fff'}]}>
                      מהחדש לישן
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterOptBtn, sortOrder === 'asc' && styles.filterOptBtnActive]}
                    onPress={() => setSortOrder('asc')}
                  >
                    <Text style={[styles.filterOptText, sortOrder === 'asc' && {color: '#fff'}]}>
                      מהישן לחדש
                    </Text>
                  </TouchableOpacity>
               </View>
               <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Document Details Modal */}
      <Modal visible={!!selectedDoc} animationType="fade" transparent>
         <View style={styles.modalBg}>
            <View style={styles.bottomSheet}>
               <View style={styles.sheetHeader}>
                  <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.iconBtn}>
                     <X color={colors.text} size={24} />
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>פרטי מסמך</Text>
                  <View style={{ width: 40 }} />
               </View>

               {selectedDoc && (
                 <ScrollView style={styles.sheetContent}>
                    <View style={styles.detailBox}>
                       <Text style={styles.filterTitle}>שם המסמך</Text>
                       <Text style={styles.detailValue}>{selectedDoc.title}</Text>
                       
                       <Text style={[styles.filterTitle, {marginTop: 16}]}>סוג מסמך</Text>
                       <Text style={styles.detailValue}>
                         {selectedDoc.type === 'contract' ? 'חוזה שכירות' : 
                          selectedDoc.type === 'protocol' ? 'פרוטוקול מסירה' : 
                          'מסמך מותאם אישית'}
                       </Text>

                       <Text style={[styles.filterTitle, {marginTop: 16}]}>נכס משויך</Text>
                       <Text style={styles.detailValue}>{selectedDoc.address || 'לא משויך לנכס'}</Text>
                       
                       <Text style={[styles.filterTitle, {marginTop: 16}]}>תאריך הוספה</Text>
                       <Text style={styles.detailValue}>
                         {selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleDateString('he-IL') : 'לא ידוע'}
                       </Text>
                    </View>

                    <TouchableOpacity 
                       style={[styles.primaryBtn, { marginTop: 24, paddingVertical: 16 }]} 
                       onPress={() => {
                         handleOpenDoc(selectedDoc.file_url, selectedDoc.title);
                         setSelectedDoc(null);
                       }}
                       disabled={downloading}
                    >
                       <Download color="white" size={20} style={{ marginLeft: 8 }} />
                       <Text style={{color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16}}>
                          {downloading ? 'מוריד קובץ...' : 'שמור מסמך'}
                       </Text>
                    </TouchableOpacity>
                 </ScrollView>
               )}
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 24, paddingVertical: 20, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  filterBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  filterBtnText: { color: colors.textSecondary, fontWeight: 'bold', marginRight: 8, fontSize: 13 },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  card: { flexDirection: 'row-reverse', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  iconBox: { width: 44, height: 44, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  contentBox: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 12 },
  docTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 2, textAlign: 'right' },
  propAddressText: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, textAlign: 'right' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { color: '#64748B', fontSize: 12 },
  downloadBtn: { width: 44, height: 44, backgroundColor: colors.border, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 0, borderWidth: 1, borderColor: colors.border },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '50%', maxHeight: '80%', borderWidth: 1, borderColor: colors.border },
  sheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 4 },
  resetText: { color: '#4F46E5', fontWeight: 'bold' },
  sheetContent: { flex: 1 },
  filterTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' },
  filterOptions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  filterOptBtn: { backgroundColor: colors.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  filterOptBtnActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterOptText: { color: colors.textSecondary, fontWeight: 'bold' },
  detailBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  detailValue: { color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  primaryBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});
