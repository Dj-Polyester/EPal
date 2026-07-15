import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Sparkles, Wand2, ArrowLeft } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function CharacterCreateScreen() {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const handleRandomize = async () => {
    setRandomizing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/characters/prompts/random`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setPersonality(data.prompt);
      }
    } catch {
      // ignore
    } finally {
      setRandomizing(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !personality.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), personality_prompt: personality.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        navigation.navigate('Chat', {
          chatId: data.chat.id,
          characterName: data.character.name,
          avatarUrl: data.character.avatar_url,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Sparkles size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Create a Character</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Character Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder="e.g., Zephyr the Wizard"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.text }]}>Personality & Traits</Text>
            <TouchableOpacity onPress={handleRandomize} disabled={randomizing} style={styles.randomButton}>
              <Wand2 size={14} color={colors.primary} />
              <Text style={[styles.randomText, { color: colors.primary }]}>
                {randomizing ? 'Randomizing...' : 'Randomize'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={personality}
            onChangeText={setPersonality}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder="Describe their personality, speaking style, background, and quirks..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Create Character & Start Chat</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backButton: { padding: 6, marginRight: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    height: 120,
  },
  randomButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  randomText: { fontSize: 12, fontWeight: '600' },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
