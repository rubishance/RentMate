import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet,  ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowRight, FileText, Calendar, DollarSign, UserCheck } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function ContractDetailsScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const { contractId } = route.params || {};
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contractId) {
      loadContract();
    } else {
      setLoading(false);
    }
  }, [contractId]);

  const loadContract = async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, properties(address), tenants(id, full_name)')
      .eq('id', contractId)
      .single();

    if (!error && data) {
      setContract(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={{ color: '#fff', textAlign: 'center', marginTop: 100 }}>חוזה לא נמצא</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פירוט חוזה שכירות</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>פרטים כלליים</Text>
          
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>נכס</Text>
              <Text style={styles.value}>{contract.properties?.address || 'לא צוין'}</Text>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <HomeIcon color="#10B981" size={24} />
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>שוכר מקושר</Text>
              <Text style={styles.value}>
                {contract.tenants && contract.tenants.length > 0 
                  ? contract.tenants[0].full_name 
                  : 'אין שוכר משוייך'}
              </Text>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <UserCheck color="#3B82F6" size={24} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>תנאים פיננסיים</Text>
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>שכר דירה חודשי</Text>
              <Text style={[styles.value, { color: '#10B981', fontSize: 20 }]}>₪ {contract.monthly_rent}</Text>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <DollarSign color="#F59E0B" size={24} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>תקופת שכירות</Text>
              <Text style={styles.value}>
                {contract.start_date ? new Date(contract.start_date).toLocaleDateString('he-IL') : '--'}
                {' עד '}
                {contract.end_date ? new Date(contract.end_date).toLocaleDateString('he-IL') : '--'}
              </Text>
            </View>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Calendar color="#8B5CF6" size={24} />
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const HomeIcon = ({ color, size }: any) => {
  return <FileText color={color} size={size} />;
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  content: { flexGrow: 1, padding: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 20, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  infoBlock: { flex: 1 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 4, textAlign: 'right' },
  value: { fontSize: 16, color: colors.text, fontWeight: '500', textAlign: 'right' },
  iconCircle: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 }
});
