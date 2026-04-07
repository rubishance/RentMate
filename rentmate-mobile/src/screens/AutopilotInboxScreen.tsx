import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet,  ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Inbox } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
export default function AutopilotInboxScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>תיבת Autopilot</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Inbox color="#4F46E5" size={48} />
          </View>
          <Text style={styles.emptyTitle}>אין משימות ממתינות</Text>
          <Text style={styles.emptySubtitle}>
            מערכת ה-Autopilot של RentMate סורקת את הנתונים שלך ומתריעה רק כשצריך את תשומת הלב שלך (למשל סיום חוזה מתקרב).
          </Text>
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
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { alignItems: 'center', opacity: 0.8 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(79, 70, 229, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, color: colors.text, fontWeight: 'bold', marginBottom: 12 },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 24 }
});
