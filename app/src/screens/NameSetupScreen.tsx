import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export default function NameSetupScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshUser } = useAuth();
  const { colors } = useTheme();

  const getToken = async () => {
    const { data } = await import('../lib/supabase').then((m) => m.supabase.auth.getSession());
    return data.session?.access_token || '';
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      const token = await getToken();
      console.log('[NameSetup] Saving name with token:', token ? 'present' : 'missing');
      const res = await fetch(`${API_BASE}/api/users/name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      console.log('[NameSetup] API response status:', res.status);
      if (res.ok) {
        console.log('[NameSetup] Name saved, refreshing user...');
        await refreshUser();
      } else {
        const data = await res.json();
        console.error('[NameSetup] API error:', data);
        setError(data.detail || 'Failed to save name. Please try again.');
      }
    } catch (err: any) {
      console.error('[NameSetup] Network error:', err);
      setError('Network error. Please check your connection.');
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
        <Text style={[styles.title, { color: colors.primary }]}>What should we call you?</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your characters will use this name when they talk to you.
        </Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.dangerBg }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceAlt }]}
            placeholder="e.g., Alex"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !name.trim()}
          style={[styles.button, { backgroundColor: colors.primary }, (!name.trim() || loading) && styles.disabled]}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
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
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
});
