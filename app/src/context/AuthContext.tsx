import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

interface Profile {
  id: string;
  username: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  theme: string;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AuthContext] fetchProfile: session?', !!session);
      if (!session) {
        console.log('[AuthContext] fetchProfile: no session');
        setUser(null);
        setLoading(false);
        return;
      }
      console.log('[AuthContext] fetchProfile: calling /api/auth/me...');
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      console.log('[AuthContext] fetchProfile: /api/auth/me status', res.status);
      if (res.ok) {
        const profile = await res.json();
        console.log('[AuthContext] fetchProfile: profile loaded', profile.id, profile.email);
        setUser(profile);
      } else {
        const text = await res.text();
        console.error('[AuthContext] fetchProfile: /api/auth/me error', res.status, text);
        setUser(null);
      }
    } catch (err: any) {
      console.error('[AuthContext] fetchProfile: exception', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Process OAuth callback URL (used by both web and deep link handlers)
  const processAuthUrl = async (url: string) => {
    console.log('[AuthContext] Processing auth URL:', url);
    const searchParams = new URLSearchParams(url.split('?')[1] || '');
    const hashParams = new URLSearchParams(url.split('#')[1] || '');
    const code = searchParams.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (code) {
      console.log('[AuthContext] Deep link PKCE: exchanging code...');
      setLoading(true);
      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('[AuthContext] exchangeCodeForSession error:', exchangeError);
        } else {
          console.log('[AuthContext] Code exchanged successfully');
        }
      } catch (err: any) {
        console.error('[AuthContext] Deep link exchange error:', err);
      }
      return;
    }

    if (accessToken && refreshToken) {
      console.log('[AuthContext] Deep link implicit: setting session...');
      setLoading(true);
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[AuthContext] setSession error:', error);
        } else {
          console.log('[AuthContext] Session set from deep link');
        }
      } catch (err: any) {
        console.error('[AuthContext] Deep link setSession error:', err);
      }
    }
  };

  // On mount: set up listeners and check for auth redirects
  useEffect(() => {
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    let linkSubscription: { remove: () => void } | null = null;

    const init = async () => {
      // 1. Set up auth state listener FIRST
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AuthContext] onAuthStateChange:', event, 'session?', !!session);
        fetchProfile();
      });
      authListener = sub;

      // 2. Set up deep link listener for mobile OAuth callbacks
      if (Platform.OS !== 'web') {
        const handleDeepLink = (event: { url: string }) => {
          console.log('[AuthContext] Deep link received:', event.url);
          if (event.url.includes('code=') || event.url.includes('access_token=')) {
            processAuthUrl(event.url);
          }
        };
        linkSubscription = Linking.addEventListener('url', handleDeepLink);

        // Check if app was opened via deep link
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (initialUrl.includes('code=') || initialUrl.includes('access_token='))) {
          console.log('[AuthContext] App opened via auth deep link:', initialUrl);
          await processAuthUrl(initialUrl);
          return; // fetchProfile will be triggered by onAuthStateChange
        }
      }

      // 3. On web, check for OAuth redirect code in URL
      if (Platform.OS === 'web') {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code || (accessToken && refreshToken)) {
          await processAuthUrl(window.location.href);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // If URL is clean but we may have just been redirected back from OAuth,
        // Supabase might have already established the session via cookies/localStorage.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[AuthContext] Web: session already exists after clean redirect');
          await fetchProfile();
          return;
        }
      }

      // 4. Normal init: fetch profile
      await fetchProfile();
    };

    init();
    return () => {
      authListener?.subscription.unsubscribe();
      linkSubscription?.remove();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    await fetchProfile();
  };

  const register = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    await fetchProfile();
  };

  const signInWithGoogle = async () => {
    const redirectTo = makeRedirectUri();
    console.log('[GoogleAuth] Redirect URI:', redirectTo);

    // On web, use default Supabase behavior (browser redirect, cookie-based session)
    if (Platform.OS === 'web') {
      console.log('[GoogleAuth] Web platform: starting Supabase OAuth redirect...');
      const { error: webError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (webError) {
        console.error('[GoogleAuth] Web sign-in error:', webError);
        throw new Error(webError.message || 'Google sign-in failed');
      }
      // Supabase redirects the browser to Google. When it comes back, useEffect picks up the session.
      return;
    }

    // Mobile: use skipBrowserRedirect so we can open the URL in-app
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('[GoogleAuth] signInWithOAuth error:', error);
      throw new Error(error.message || 'Failed to start Google sign-in');
    }
    if (!data?.url) {
      console.error('[GoogleAuth] No OAuth URL returned from Supabase');
      throw new Error('No OAuth URL returned');
    }

    // Validate the URL is actually a Supabase/Google OAuth URL, not the app itself
    if (!data.url.includes('supabase.co') && !data.url.includes('google.com')) {
      console.error('[GoogleAuth] Invalid OAuth URL (points to app, not Google):', data.url);
      throw new Error(
        'OAuth misconfigured: the sign-in URL points back to the app instead of Google. ' +
        'Add this redirect URL to Supabase Authentication → URL Configuration → Redirect URLs: ' +
        redirectTo
      );
    }

    console.log('[GoogleAuth] OAuth URL:', data.url);

    // Mobile: open browser. Deep link listener will catch the redirect when app reopens.
    console.log('[GoogleAuth] Mobile platform: opening browser...');
    await WebBrowser.openBrowserAsync(data.url);
    console.log('[GoogleAuth] Browser opened, waiting for deep link...');
    // The deep link listener (set up in useEffect) will handle the redirect.
    // Return immediately — auth completion is handled asynchronously via deep link + onAuthStateChange.
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, signInWithGoogle, logout, refreshUser: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
