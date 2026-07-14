import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Moon, Sun, ChevronRight, X } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function SettingsScreen() {
  const { user, refreshUser } = useAuth();
  const { isDark, setTheme, colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [theme, setLocalTheme] = useState<'light' | 'dark'>((user?.theme as 'light' | 'dark') ?? 'light');
  const [saving, setSaving] = useState(false);

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const handleThemeChange = async (next: 'light' | 'dark') => {
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          </View>
        </View>
      </View>
    </View>
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
});
