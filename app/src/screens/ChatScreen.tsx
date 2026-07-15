import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { proxyImageUrl } from '../lib/images';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import CharacterDetailModal from '../components/CharacterDetailModal';
import TypingIndicator from '../components/TypingIndicator';
import { ArrowLeft, Send, User } from 'lucide-react-native';

interface Message {
  id: string;
  role: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function ChatScreen() {
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { chatId, characterName, avatarUrl } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [personality, setPersonality] = useState<string | null>(null);
  const [headerImgError, setHeaderImgError] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();
  const { colors } = useTheme();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const fetchMessages = async () => {
    try {
      const token = await getToken();
      const [chatRes, msgRes] = await Promise.all([
        fetch(`${API_BASE}/api/chats/${chatId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/chats/${chatId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        setPersonality(chatData.character_personality);
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    const channel = import('../lib/supabase')
      .then((m) =>
        m.supabase
          .channel(`messages:${chatId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
            (payload) => {
              const newMsg = payload.new as Message;
              setMessages((prev) => {
                if (prev.find((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              if (newMsg.role === 'assistant') {
                setTyping(false);
                setSending(false);
              }
            }
          )
          .subscribe()
      );

    return () => {
      channel.then((c) => c.unsubscribe());
    };
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, typing]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setTyping(true);
    setApiError(null);
    const content = input.trim();
    setInput('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/chat/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chat_id: chatId, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('[Chat] API error:', data);
        setTyping(false);
        setSending(false);
        setApiError(data.detail || 'Something went wrong. Please try again.');
        return;
      }
      setApiError(null);
    } catch (err: any) {
      console.error('[Chat] Network error:', err);
      setTyping(false);
      setSending(false);
      setApiError('Network error. Please check your connection.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.rowEnd : styles.rowStart]}>
        {!isUser && (
          <TouchableOpacity onPress={() => setDetailOpen(true)} style={styles.smallAvatar}>
            {avatarUrl && !headerImgError ? (
              <Image
                source={{ uri: proxyImageUrl(avatarUrl) || '' }}
                style={styles.smallAvatarImage}
                resizeMode="cover"
                onError={() => setHeaderImgError(true)}
              />
            ) : (
              <User size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: isUser ? '#ffffff' : colors.text }]}>
            {item.content}
          </Text>
          {item.media_url && item.media_type === 'image' && (
            <Image
              source={{ uri: proxyImageUrl(item.media_url) || '' }}
              style={styles.mediaImage}
              resizeMode="cover"
              onError={() => console.log('[Chat] Media image failed to load:', item.media_url)}
            />
          )}
          <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDetailOpen(true)} style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight }]}>
            {avatarUrl && !headerImgError ? (
              <Image
                source={{ uri: proxyImageUrl(avatarUrl) || '' }}
                style={styles.headerAvatarImage}
                resizeMode="cover"
                onError={() => {
                  console.log('[Chat] Header avatar failed to load:', avatarUrl);
                  setHeaderImgError(true);
                }}
              />
            ) : (
              <User size={18} color={colors.primary} />
            )}
          </View>
          <View>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {characterName}
            </Text>
            <Text style={[styles.headerStatus, { color: colors.textMuted }]}>
              {typing ? 'typing...' : 'online'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          loading ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading messages...</Text>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No messages yet. Say hello!</Text>
          )
        }
      />

      {typing && (
        <View style={styles.typingRow}>
          <View style={[styles.smallAvatar, { backgroundColor: colors.primaryLight }]}>
            {avatarUrl && !headerImgError ? (
              <Image
                source={{ uri: proxyImageUrl(avatarUrl) || '' }}
                style={styles.smallAvatarImage}
                resizeMode="cover"
                onError={() => setHeaderImgError(true)}
              />
            ) : (
              <User size={16} color={colors.primary} />
            )}
          </View>
          <View style={[styles.typingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TypingIndicator color={colors.textMuted} />
          </View>
        </View>
      )}

      {apiError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{apiError}</Text>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text }]}
          editable={!sending}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={[styles.sendButton, { backgroundColor: colors.primary }, (!input.trim() || sending) && styles.disabled]}
        >
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <CharacterDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        name={characterName}
        avatarUrl={avatarUrl}
        personality={personality}
      />
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: { padding: 6 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarImage: { width: 38, height: 38, borderRadius: 19 },
  headerName: { fontSize: 14, fontWeight: '600' },
  headerStatus: { fontSize: 11, marginTop: 1 },
  messageList: { padding: 12, gap: 10 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 2,
  },
  smallAvatarImage: { width: 28, height: 28, borderRadius: 14 },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  mediaImage: { width: 200, height: 150, borderRadius: 10, marginTop: 8 },
  timeText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 12, marginBottom: 6 },
  typingBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  errorBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
