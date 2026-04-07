import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, ArrowRight, Bot, Trash2, Plus, Paperclip, Volume2, VolumeX, Menu as MenuIcon, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useChatBot, Message } from '../hooks/useChatBot';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import { supabase } from '../lib/supabase';

import { useAppTheme } from '../hooks/useAppTheme';
const QUICK_PROMPTS = [
  "מה הסטטוס של החוזים שלי?",
  "האם יש תשלומים פתוחים החודש?",
  "סכם לי את הנתונים העסקיים",
  "איך מוסיפים שוכר חדש?"
];

export default function RentyAssistantScreen() {
  const { colors } = useAppTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const navigation = useNavigation();
  const { messages, isLoading, sendMessage, resetChat } = useChatBot();
  const [inputText, setInputText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const lastMessageCount = useRef(messages.length);

  // Text-to-Speech Effect
  useEffect(() => {
    if (isTtsEnabled && messages.length > lastMessageCount.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !isLoading) {
        // Strip markdown before speaking
        const cleanText = lastMessage.content.replace(/[\*\#\_]/g, '');
        Speech.speak(cleanText, { language: 'he-IL' });
      }
    }
    lastMessageCount.current = messages.length;
  }, [messages, isLoading, isTtsEnabled]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  const handlePromptClick = (prompt: string) => {
    setShowOptions(false);
    sendMessage(prompt);
  };

  const toggleTts = async () => {
    if (isTtsEnabled) {
      Speech.stop();
      setIsTtsEnabled(false);
    } else {
      setIsTtsEnabled(true);
      Speech.speak("הקראה קולית מופעלת", { language: 'he-IL' });
    }
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowOptions(false);
        setIsUploading(true);
        const asset = result.assets[0];
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsUploading(false);
          return;
        }

        const fileName = `${Date.now()}_${asset.name}`;
        const path = `${user.id}/chat-temp/${fileName}`;

        // Fetch local URI and convert to Blob for Supabase Storage
        const res = await fetch(asset.uri);
        const blob = await res.blob();

        const { error } = await supabase.storage
          .from('secure_documents')
          .upload(path, blob);

        setIsUploading(false);
        if (!error) {
          sendMessage(`צורף מסמך: ${asset.name}`, { name: asset.name, path });
        } else {
          alert('שגיאה בהעלאת הקובץ.');
        }
      }
    } catch (err) {
      setIsUploading(false);
      console.error('File pick error:', err);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) return null;

    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Bot color="#FFF" size={16} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowRight color="#1F2937" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>העוזר האישי - Renty</Text>
          <TouchableOpacity onPress={resetChat} style={styles.iconButton}>
            <Trash2 color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity 
             style={styles.optionsTrigger} 
             onPress={() => setShowOptions(true)}
             disabled={isUploading || isLoading}
          >
             {isUploading ? <ActivityIndicator size="small" color="#9CA3AF" /> : <Plus color="#6B7280" size={24} />}
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="איך אפשר לעזור?"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlign="right"
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Send color="#FFF" size={20} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Options Menu Modal */}
      <Modal visible={showOptions} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowOptions(false)} activeOpacity={1}>
          <View style={styles.optionsSheet}>
            <View style={styles.optionsSheetHeader}>
               <Text style={styles.optionsSheetTitle}>אפשרויות</Text>
               <TouchableOpacity onPress={() => setShowOptions(false)}>
                  <X color="#9CA3AF" size={24} />
               </TouchableOpacity>
            </View>

            <View style={styles.actionsRow}>
               <TouchableOpacity style={styles.actionBtn} onPress={handleAttachFile}>
                  <View style={[styles.actionIconBox, { backgroundColor: '#E0E7FF' }]}>
                     <Paperclip color="#4F46E5" size={24} />
                  </View>
                  <Text style={styles.actionText}>הוסף קובץ</Text>
               </TouchableOpacity>

               <TouchableOpacity style={styles.actionBtn} onPress={toggleTts}>
                  <View style={[styles.actionIconBox, { backgroundColor: isTtsEnabled ? '#D1FAE5' : '#F3F4F6' }]}>
                     {isTtsEnabled ? <Volume2 color="#10B981" size={24} /> : <VolumeX color="#9CA3AF" size={24} />}
                  </View>
                  <Text style={styles.actionText}>הקראה {isTtsEnabled ? 'פעילה' : 'כבויה'}</Text>
               </TouchableOpacity>
            </View>

            <View style={styles.promptsSection}>
               <View style={styles.promptsHeader}>
                 <MenuIcon color="#6B7280" size={16} />
                 <Text style={styles.promptsTitle}>אפשרויות מהירות</Text>
               </View>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll} contentContainerStyle={{ flexDirection: 'row-reverse', paddingHorizontal: 16 }}>
                 {QUICK_PROMPTS.map((prompt, idx) => (
                    <TouchableOpacity key={idx} style={styles.promptChip} onPress={() => handlePromptClick(prompt)}>
                       <Text style={styles.promptChipText}>{prompt}</Text>
                    </TouchableOpacity>
                 ))}
               </ScrollView>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  keyboardView: { flex: 1 },
  chatList: { padding: 16, paddingBottom: 24 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperBot: { justifyContent: 'flex-start', flexDirection: 'row-reverse' },
  botAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 2, borderColor: '#FFF' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  userBubble: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22, textAlign: 'right' },
  userText: { color: '#FFF' },
  botText: { color: '#1F2937' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: Platform.OS === 'ios' ? 8 : 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  optionsTrigger: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, marginRight: 8, fontSize: 16, color: '#1F2937' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#9CA3AF' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  optionsSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 12 },
  optionsSheetHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  optionsSheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  actionsRow: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 24, marginBottom: 32 },
  actionBtn: { alignItems: 'center', width: 80 },
  actionIconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 13, color: '#4B5563', textAlign: 'center', fontWeight: '500' },
  
  promptsSection: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  promptsHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  promptsTitle: { fontSize: 14, fontWeight: 'bold', color: '#6B7280', marginRight: 8 },
  promptsScroll: { marginHorizontal: -24 },
  promptChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginHorizontal: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  promptChipText: { fontSize: 14, color: '#374151', fontWeight: '500' }
});
