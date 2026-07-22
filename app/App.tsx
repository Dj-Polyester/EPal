import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import type { ThemePreference } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import NameSetupScreen from './src/screens/NameSetupScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import CharactersScreen from './src/screens/CharactersScreen';
import CharacterCreateScreen from './src/screens/CharacterCreateScreen';
import ChatScreen from './src/screens/ChatScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { MessageCircle, Users } from 'lucide-react-native';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  NameSetup: undefined;
  Welcome: undefined;
  Main: undefined;
  CharacterCreate: undefined;
  Chat: { chatId: string; characterName: string; avatarUrl: string | null };
  Settings: undefined;
};

type MainTabParamList = {
  Chats: undefined;
  Characters: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function ThemeSync() {
  const { user } = useAuth();
  const { setTheme } = useTheme();

  useEffect(() => {
    const userTheme = user?.theme as ThemePreference | undefined;
    if (userTheme && ['light', 'dark', 'system'].includes(userTheme)) {
      console.log('[ThemeSync] Applying server theme:', userTheme);
      setTheme(userTheme);
    }
  }, [user?.theme, setTheme]);

  return null;
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          if (route.name === 'Chats') {
            return <MessageCircle size={size} color={color} />;
          }
          return <Users size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Characters" component={CharactersScreen} />
    </Tab.Navigator>
  );
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
            <Stack.Screen name="Main" component={MainTabs} />
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
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
