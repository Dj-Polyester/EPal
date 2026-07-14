import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const setTheme = (theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? darkColors : lightColors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
