import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function WelcomeScreen() {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout, refreshUser } = useAuth();
  const { colors } = useTheme();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/users/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio }),
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/users/onboarding/skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.primary }]}>Welcome to EPal!</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Tell us a little about yourself so your characters can remember you.
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>About you (optional)</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textarea, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder="I love sci-fi, hiking, and my cat Luna..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }, loading && styles.disabled]}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save & Continue'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSkip}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.surfaceAlt }, loading && styles.disabled]}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutRow}>
          <Text style={[styles.logoutText, { color: colors.textMuted }]}>Log out</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    height: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  logoutRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
