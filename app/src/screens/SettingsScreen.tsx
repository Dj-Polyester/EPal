import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Moon, Sun, Monitor, ChevronRight, X, Send, MessageSquare } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function SettingsScreen() {
  const { user, refreshUser } = useAuth();
  const { setTheme, colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [theme, setLocalTheme] = useState<'light' | 'dark' | 'system'>((user?.theme as 'light' | 'dark' | 'system') ?? 'system');
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const handleThemeChange = async (next: 'light' | 'dark' | 'system') => {
    if (next === theme) return;
    setLocalTheme(next);
    setTheme(next);
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/users/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: next }),
      });
      if (res.ok) await refreshUser();
    } catch {
      setLocalTheme(theme);
      setTheme(theme);
    } finally {
      setSaving(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      if (res.ok) {
        setFeedbackSent(true);
        setFeedbackText('');
        setTimeout(() => {
          setFeedbackOpen(false);
          setFeedbackSent(false);
        }, 1500);
      }
    } catch {
      // ignore
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <X size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Moon size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            Choose your preferred color scheme.
          </Text>
          <View style={styles.themeGrid}>
            <TouchableOpacity
              onPress={() => handleThemeChange('light')}
              style={[
                styles.themeButton,
                { borderColor: theme === 'light' ? colors.primary : colors.border },
                theme === 'light' && { backgroundColor: colors.primaryLight },
              ]}
            >
              <Sun size={20} color={colors.text} />
              <Text style={[styles.themeText, { color: colors.text }]}>Light</Text>
              {theme === 'light' && <ChevronRight size={16} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleThemeChange('dark')}
              style={[
                styles.themeButton,
                { borderColor: theme === 'dark' ? colors.primary : colors.border },
                theme === 'dark' && { backgroundColor: colors.primaryLight },
              ]}
            >
              <Moon size={20} color={colors.text} />
              <Text style={[styles.themeText, { color: colors.text }]}>Dark</Text>
              {theme === 'dark' && <ChevronRight size={16} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleThemeChange('system')}
              style={[
                styles.themeButton,
                { borderColor: theme === 'system' ? colors.primary : colors.border },
                theme === 'system' && { backgroundColor: colors.primaryLight },
              ]}
            >
              <Monitor size={20} color={colors.text} />
              <Text style={[styles.themeText, { color: colors.text }]}>System</Text>
              {theme === 'system' && <ChevronRight size={16} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Feedback</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            Have suggestions or found a bug? Let us know!
          </Text>
          <TouchableOpacity
            onPress={() => setFeedbackOpen(true)}
            style={[styles.feedbackButton, { backgroundColor: colors.primary }]}
          >
            <Send size={16} color="#ffffff" />
            <Text style={styles.feedbackButtonText}>Give Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={feedbackOpen} transparent animationType="slide" onRequestClose={() => setFeedbackOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackOpen(false)} style={styles.closeButton}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {feedbackSent ? (
              <View style={styles.modalBody}>
                <Text style={[styles.successText, { color: colors.primary }]}>
                  Thank you! Your feedback has been sent.
                </Text>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <TextInput
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholder="Tell us what you think..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.feedbackInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
                />
                <TouchableOpacity
                  onPress={handleSendFeedback}
                  disabled={feedbackLoading || !feedbackText.trim()}
                  style={[styles.sendFeedbackButton, { backgroundColor: colors.primary }, (!feedbackText.trim() || feedbackLoading) && styles.disabled]}
                >
                  {feedbackLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.sendFeedbackButtonText}>Send Feedback</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: '600' },
  closeButton: { padding: 6 },
  content: { padding: 20 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  themeGrid: { flexDirection: 'row', gap: 12 },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  themeText: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginBottom: 28 },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  feedbackButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalBody: { gap: 16 },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    height: 140,
  },
  sendFeedbackButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendFeedbackButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
  successText: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 20 },
});
