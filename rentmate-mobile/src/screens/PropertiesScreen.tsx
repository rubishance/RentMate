import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet,  FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Building2, Plus, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../hooks/useAppTheme';
export default function PropertiesScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch properties and their active contracts
    const { data: propertiesData, error } = await supabase
      .from('properties')
      .select('*, contracts(status, base_rent, start_date, end_date)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && propertiesData) {
      setProperties(propertiesData);
    }
    setLoading(false);
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

  const renderItem = ({ item }: { item: any }) => {
    // Find active contract
    const activeContract = item.contracts?.find((c: any) => c.status === 'active');
    const isOccupied = !!activeContract;
    
    // Placeholder URI if no image
    const imageSource = item.image_url 
      ? { uri: supabase.storage.from('property-images').getPublicUrl(item.image_url).data.publicUrl }
      : getPlaceholderImage(item.property_type);

    return (
      <TouchableOpacity 
         style={styles.card} 
         activeOpacity={0.9} 
         onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
      >
        <View style={styles.imageContainer}>
          <Image source={imageSource} style={styles.propertyImage} />
          <LinearGradient
            colors={['transparent', 'rgba(10,17,30,0.8)', '#0A111E']}
            style={styles.gradientOverlay}
          />
          {/* Status Badge */}
          <View style={[styles.statusBadge, isOccupied ? styles.statusOccupied : styles.statusVacant]}>
            <Text style={[styles.statusText, isOccupied ? styles.statusTextOccupied : styles.statusTextVacant]}>
               {isOccupied ? 'מושכר' : 'פנוי'}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.topRow}>
            <View style={styles.headerRight}>
               <Text style={styles.titleText}>{item.address || item.name}</Text>
               {item.city && (
                 <Text style={styles.cityText}>{item.city}</Text>
               )}
            </View>
            <View style={styles.headerLeft}>
              <Text style={styles.priceText}>
                ₪{(activeContract?.base_rent || 0).toLocaleString()}
              </Text>
              <Text style={styles.priceLabel}>שכירות חודשית</Text>
            </View>
          </View>

          <View style={styles.datesRow}>
             {isOccupied ? (
               <>
                 <View style={styles.dateCol}>
                   <Text style={styles.dateLabel}>תאריך התחלה</Text>
                   <Text style={styles.dateValue}>{activeContract.start_date}</Text>
                 </View>
                 <View style={styles.dateCol}>
                   <Text style={styles.dateLabel}>תאריך סיום</Text>
                   <Text style={styles.dateValue}>{activeContract.end_date || '-'}</Text>
                 </View>
               </>
             ) : (
                <Text style={styles.noContractText}>אין חוזה פעיל</Text>
             )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>הנכסים שלי</Text>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('AddProperty')}
        >
          <Plus color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
      ) : properties.length === 0 ? (
        <View style={styles.emptyState}>
          <Building2 color="#1e293b" size={64} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>אין נכסים כרגע</Text>
          <Text style={styles.emptySub}>לחץ על ה-➕ כדי להוסיף את הנכס הראשון שלך.</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
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
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  fab: { backgroundColor: '#4F46E5', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 120 },
  
  card: { backgroundColor: colors.surface, borderRadius: 24, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 },
  imageContainer: { width: '100%', height: 260, position: 'relative' },
  propertyImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  
  statusBadge: { position: 'absolute', top: 20, left: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 5 },
  statusOccupied: { backgroundColor: 'rgba(255,255,255,0.95)' },
  statusVacant: { backgroundColor: 'rgba(245, 158, 11, 0.95)' },
  statusText: { fontSize: 13, fontWeight: 'bold' },
  statusTextOccupied: { color: '#059669' },
  statusTextVacant: { color: colors.text },

  cardContent: { padding: 24, paddingTop: 10 },
  topRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 20, marginBottom: 16 },
  headerRight: { flex: 1, alignItems: 'flex-end', marginLeft: 16 },
  titleText: { fontSize: 24, fontWeight: '900', color: '#4F46E5', marginBottom: 4, writingDirection: 'rtl' },
  cityText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  
  headerLeft: { alignItems: 'flex-start' },
  priceText: { fontSize: 26, fontWeight: '900', color: colors.text },
  priceLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  
  datesRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', paddingTop: 8 },
  dateCol: { alignItems: 'center' },
  dateLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  dateValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  noContractText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' }
});
