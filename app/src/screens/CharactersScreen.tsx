import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, Alert, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { proxyImageUrl } from '../lib/images';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Plus, User, Trash2, Settings, LogOut } from 'lucide-react-native';

interface CharacterItem {
  id: string;
  name: string;
  personality_prompt: string | null;
  avatar_url: string | null;
  chat_id: string | null;
  created_at: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function CharactersScreen() {
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const fetchCharacters = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCharacters();
    }, [])
  );

  const doDelete = async (character: CharacterItem) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/characters/${character.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== character.id));
      } else {
        const data = await res.json();
        Alert.alert('Error', data.detail || 'Failed to delete character');
      }
    } catch {
      Alert.alert('Error', 'Failed to delete character');
    }
  };

  const handleDelete = (character: CharacterItem) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete "${character.name}" and all their chats?`);
      if (confirmed) doDelete(character);
    } else {
      Alert.alert(
        'Delete Character',
        `Delete "${character.name}" and all their chats? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => doDelete(character) },
        ]
      );
    }
  };

  const handlePress = (character: CharacterItem) => {
    if (character.chat_id) {
      navigation.navigate('Chat', {
        chatId: character.chat_id,
        characterName: character.name,
        avatarUrl: character.avatar_url,
      });
    }
  };

  const handleStartChat = async (character: CharacterItem) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ character_id: character.id }),
      });
      if (res.ok) {
        const chat = await res.json();
        navigation.navigate('Chat', {
          chatId: chat.id,
          characterName: character.name,
          avatarUrl: character.avatar_url,
        });
      } else {
        const data = await res.json();
        Alert.alert('Error', data.detail || 'Failed to start chat');
      }
    } catch {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const renderItem = ({ item }: { item: CharacterItem }) => {
    const hasAvatar = item.avatar_url && !imgErrors[item.avatar_url];
    const hasChat = !!item.chat_id;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => handlePress(item)}
          style={styles.cardBody}
          activeOpacity={hasChat ? 0.7 : 1}
          disabled={!hasChat}
        >
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              {hasAvatar ? (
                <Image
                  source={{ uri: proxyImageUrl(item.avatar_url) || '' }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => {
                    if (item.avatar_url) {
                      setImgErrors((prev) => ({ ...prev, [item.avatar_url!]: true }));
                    }
                  }}
                />
              ) : (
                <User size={20} color={colors.primary} />
              )}
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.personality_prompt ? (
                <Text style={[styles.personality, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.personality_prompt}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
        {!hasChat ? (
          <TouchableOpacity
            onPress={() => handleStartChat(item)}
            style={[styles.startChatButton, { backgroundColor: colors.primaryLight }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.startChatText, { color: colors.primary }]}>Start Chat</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => handleDelete(item)}
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
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Characters</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CharacterCreate')} style={styles.iconButton}>
            <Plus size={20} color={colors.textMuted} />
          </TouchableOpacity>
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
        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading...</Text>
        ) : characters.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <User size={48} color={colors.border} />
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
            data={characters}
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
  list: { gap: 10 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  personality: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  deleteButton: {
    padding: 14,
    paddingLeft: 8,
    backgroundColor: 'transparent',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startChatButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  startChatText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 4, marginBottom: 20, textAlign: 'center', paddingHorizontal: 24 },
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
