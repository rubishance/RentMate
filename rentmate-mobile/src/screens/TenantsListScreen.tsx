import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet,  FlatList, ActivityIndicator, TouchableOpacity, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Users, Phone, MessageCircle, MapPin, ArrowRight, UserPlus } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function TenantsListScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setUserId(session.user.id);

    // Fetch active contracts to get current tenants
    const { data: contractsData, error } = await supabase
      .from('contracts')
      .select('id, tenant_name, tenant_phone, property_id, properties (address, city)')
      .eq('user_id', session.user.id)
      .eq('status', 'active');

    if (!error && contractsData) {
      // Filter out contracts without a tenant name
      const validTenants = contractsData.filter(c => c.tenant_name && c.tenant_name.trim() !== '');
      setTenants(validTenants);
    }
    setLoading(false);
  };

  const shareOnboardingForm = async () => {
    if (!userId) return;
    try {
      await Share.share({
        message: `שלום! להליכי הכניסה לנכס, אנא מלא את טופס פרטי השוכר של RentMate בקישור הבא: https://rentmate.co.il/tenant-onboarding?ref=${userId}`,
        title: 'טופס קליטת שוכר - RentMate'
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const handlePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(err => console.error('Error opening phone dialer', err));
  };

  const handleWhatsApp = (phoneNumber: string) => {
    if (!phoneNumber) return;
    // Format to intl if it starts with 0
    let formattedPhone = phoneNumber.replace(/[^0-9+]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+972' + formattedPhone.substring(1);
    }
    const url = `whatsapp://send?phone=${formattedPhone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        // Fallback to web whatsapp
        return Linking.openURL(`https://wa.me/${formattedPhone}`);
      }
    }).catch(err => console.error('An error occurred', err));
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.tenantInfo}>
            <Text style={styles.tenantName}>{item.tenant_name}</Text>
            <View style={styles.propertyRow}>
              <Text style={styles.propertyText}>
                {item.properties?.address} {item.properties?.city ? `, ${item.properties.city}` : ''}
              </Text>
              <MapPin color="#8A9DB8" size={14} style={{ marginLeft: 4 }} />
            </View>
          </View>
          <View style={styles.avatarCircle}>
             <Text style={styles.avatarText}>{item.tenant_name.charAt(0)}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
           <TouchableOpacity 
             style={[styles.actionBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }]} 
             onPress={() => handleWhatsApp(item.tenant_phone)}
             disabled={!item.tenant_phone}
           >
             <MessageCircle color={item.tenant_phone ? "#22C55E" : "#475569"} size={20} />
             <Text style={[styles.actionText, { color: item.tenant_phone ? '#22C55E' : '#475569' }]}>WhatsApp</Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]} 
             onPress={() => handlePhoneCall(item.tenant_phone)}
             disabled={!item.tenant_phone}
           >
             <Phone color={item.tenant_phone ? "#3B82F6" : "#475569"} size={20} />
             <Text style={[styles.actionText, { color: item.tenant_phone ? '#3B82F6' : '#475569' }]}>התקשר</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 12}}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowRight color="#ffffff" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>השוכרים שלי</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={shareOnboardingForm}>
          <UserPlus color="#4F46E5" size={24} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
      ) : tenants.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color="#1e293b" size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>אין שוכרים פעילים כרגע</Text>
          <Text style={styles.emptySub}>כאשר תוסיף שוכרים דרך יצירת חוזה, הם יופיעו כאן לצורך יצירת קשר מהירה.</Text>
          <TouchableOpacity style={styles.emptyShareBtn} onPress={shareOnboardingForm}>
             <UserPlus color="#ffffff" size={20} style={{marginRight: 8}} />
             <Text style={styles.emptyShareText}>שלח טופס לשוכר פוטנציאלי</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(79, 70, 229, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.3)' },
  listContainer: { padding: 24, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16, marginBottom: 16 },
  tenantInfo: { flex: 1, marginRight: 16 },
  tenantName: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  propertyRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' },
  propertyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'right' },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(79, 70, 229, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4F46E5' },
  avatarText: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row-reverse', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row-reverse', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  actionText: { fontSize: 15, fontWeight: 'bold', marginRight: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  emptySub: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyShareBtn: { flexDirection: 'row-reverse', backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  emptyShareText: { color: colors.text, fontSize: 16, fontWeight: 'bold' }
});
