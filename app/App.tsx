import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NameSetupScreen from './src/screens/NameSetupScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CharacterCreateScreen from './src/screens/CharacterCreateScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  NameSetup: undefined;
  Welcome: undefined;
  Dashboard: undefined;
  CharacterCreate: undefined;
  Chat: { chatId: string; characterName: string; avatarUrl: string | null };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function ThemeSync() {
  const { user } = useAuth();
  const { setTheme, isDark } = useTheme();

  useEffect(() => {
    const userTheme = user?.theme as 'light' | 'dark' | undefined;
    if (userTheme && (userTheme === 'light' || userTheme === 'dark')) {
      const wantsDark = userTheme === 'dark';
      if (wantsDark !== isDark) {
        setTheme(userTheme);
      }
    }
  }, [user?.theme]);

  return null;
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) return null;

  const isAuthenticated = !!user;
  const hasName = !!user?.username;
  const isOnboarded = user?.onboarding_completed ?? false;

  return (
    <NavigationContainer>
      <ThemeSync />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#111827' : '#f9fafb' },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !hasName ? (
          <Stack.Screen name="NameSetup" component={NameSetupScreen} />
        ) : !isOnboarded ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="CharacterCreate" component={CharacterCreateScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
