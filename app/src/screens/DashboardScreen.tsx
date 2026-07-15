import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Alert, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { proxyImageUrl } from '../lib/images';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Plus, MessageCircle, User, LogOut, Settings, Trash2 } from 'lucide-react-native';

interface ChatItem {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar_url: string | null;
  character_personality: string | null;
  updated_at: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function DashboardScreen() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const fetchChats = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );

  const doDelete = async (chat: ChatItem) => {
    try {
      const token = await getToken();
      console.log('[Dashboard] Deleting character:', chat.character_id);
      const res = await fetch(`${API_BASE}/api/characters/${chat.character_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        console.log('[Dashboard] Delete success');
        setChats((prev) => prev.filter((c) => c.character_id !== chat.character_id));
      } else {
        const data = await res.json();
        console.error('[Dashboard] Delete failed:', data);
        Alert.alert('Error', data.detail || 'Failed to delete character');
      }
    } catch (err: any) {
      console.error('[Dashboard] Delete error:', err);
      Alert.alert('Error', 'Failed to delete character');
    }
  };

  const handleDelete = (chat: ChatItem) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete "${chat.character_name}" and all their chats?`);
      if (confirmed) doDelete(chat);
    } else {
      Alert.alert(
        'Delete Character',
        `Delete "${chat.character_name}" and all their chats? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => doDelete(chat) },
        ]
      );
    }
  };

  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const renderItem = ({ item }: { item: ChatItem }) => {
    const hasAvatar = item.character_avatar_url && !imgErrors[item.character_avatar_url];
    return (
      <View style={[styles.chatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Chat', {
              chatId: item.id,
              characterName: item.character_name,
              avatarUrl: item.character_avatar_url,
            })
          }
          style={styles.chatBody}
        >
          <View style={styles.chatRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              {hasAvatar ? (
                <Image
                  source={{ uri: proxyImageUrl(item.character_avatar_url) || '' }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('[Dashboard] Image failed to load:', item.character_avatar_url);
                    if (item.character_avatar_url) {
                      setImgErrors((prev) => ({ ...prev, [item.character_avatar_url!]: true }));
                    }
                  }}
                />
              ) : (
                <User size={20} color={colors.primary} />
              )}
            </View>
            <View style={styles.chatInfo}>
              <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                {item.character_name}
              </Text>
              <Text style={[styles.chatDate, { color: colors.textMuted }]}>
                {new Date(item.updated_at).toLocaleString()}
              </Text>
            </View>
            <MessageCircle size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log('[Dashboard] Trash pressed for:', item.character_name, item.character_id);
            handleDelete(item);
          }}
          style={styles.deleteButton}
          activeOpacity={0.5}
        >
          <Trash2 size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>EPal</Text>
        <View style={styles.headerActions}>
          <Text style={[styles.username, { color: colors.textMuted }]}>{user?.username}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
            <Settings size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.iconButton}>
            <LogOut size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Chats</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CharacterCreate')}
            style={[styles.newButton, { backgroundColor: colors.primary }]}
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.newButtonText}>New Character</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading...</Text>
        ) : chats.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <MessageCircle size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No characters yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create your first virtual character to start chatting.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CharacterCreate')}
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Create Character</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  username: { fontSize: 13, marginRight: 4 },
  iconButton: { padding: 6 },
  content: { flex: 1, padding: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  newButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },
  list: { gap: 10 },
  chatCard: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chatBody: {
    flex: 1,
    padding: 14,
  },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '600' },
  chatDate: { fontSize: 12, marginTop: 2 },
  deleteButton: {
    padding: 14,
    paddingLeft: 8,
    backgroundColor: 'transparent',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  emptyButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
