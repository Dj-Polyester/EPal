import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Sparkles, Wand2, ArrowLeft, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function CharacterCreateScreen() {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;

    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) {
      // Fallback: if base64 not available, try using URI (web)
      if (asset.uri) {
        setReferenceImage(asset.uri);
        setReferenceUrl(asset.uri);
      }
      return;
    }

    setReferenceImage(`data:${asset.mimeType || 'image/png'};base64,${base64}`);

    // Upload to API
    setUploadingImage(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: `data:${asset.mimeType || 'image/png'};base64,${base64}`,
          filename: `ref-${Date.now()}.png`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReferenceUrl(data.url);
      }
    } catch {
      // ignore upload failure, still keep local preview
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setReferenceImage(null);
    setReferenceUrl(null);
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
      const body: any = { name: name.trim(), personality_prompt: personality.trim() };
      if (referenceUrl) body.reference_image_url = referenceUrl;

      const res = await fetch(`${API_BASE}/api/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
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

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Reference Image (optional)</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Upload a photo and the AI will use it as a reference for the character avatar.
          </Text>

          {referenceImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: referenceImage }} style={styles.previewImage} />
              <TouchableOpacity onPress={handleRemoveImage} style={[styles.removeButton, { backgroundColor: colors.surfaceAlt }]}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={uploadingImage}
              style={[styles.uploadButton, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
            >
              {uploadingImage ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Upload size={20} color={colors.primary} />
                  <Text style={[styles.uploadText, { color: colors.primary }]}>Upload Reference Image</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.primary }, loading && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {referenceUrl ? 'Create Character from Reference' : 'Create Character & Start Chat'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  hint: { fontSize: 12, lineHeight: 16, marginBottom: 10 },
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
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadText: { fontSize: 14, fontWeight: '600' },
  previewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
});
