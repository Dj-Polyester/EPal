import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  border: string;
  danger: string;
  dangerBg: string;
}

const lightColors: ThemeColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f6',
  text: '#111827',
  textMuted: '#6b7280',
  primary: '#4f46e5',
  primaryLight: '#e0e7ff',
  border: '#e5e7eb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
};

const darkColors: ThemeColors = {
  background: '#111827',
  surface: '#1f2937',
  surfaceAlt: '#374151',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  primary: '#818cf8',
  primaryLight: '#312e81',
  border: '#374151',
  danger: '#f87171',
  dangerBg: '#450a0a',
};

interface ThemeContextType {
  theme: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === 'light') return false;
  if (preference === 'dark') return true;
  return Appearance.getColorScheme() === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  const applyTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    setIsDark(resolveIsDark(next));
  }, []);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('epal_theme');
        const parsed: ThemePreference =
          stored === 'light' || stored === 'dark' || stored === 'system'
            ? stored
            : 'system';
        applyTheme(parsed);
      } catch {
        applyTheme('system');
      } finally {
        setReady(true);
      }
    })();
  }, [applyTheme]);

  // Listen to system theme changes when preference is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, [theme]);

  const setTheme = async (next: ThemePreference) => {
    applyTheme(next);
    try {
      await AsyncStorage.setItem('epal_theme', next);
    } catch {
      // ignore
    }
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors: isDark ? darkColors : lightColors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
