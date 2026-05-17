import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import WelcomeScreen from './components/Onboarding/WelcomeScreen';
import CharacterCreate from './components/CharacterCreate/CharacterCreate';
import Dashboard from './components/Dashboard/Dashboard';
import ChatRoom from './components/Chat/ChatRoom';

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (user?.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [user?.theme]);

  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400 dark:bg-gray-900">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400 dark:bg-gray-900">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarding_completed) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/welcome"
        element={
          <RequireAuth>
            <WelcomeScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/character/new"
        element={
          <RequireOnboarding>
            <CharacterCreate />
          </RequireOnboarding>
        }
      />
      <Route
        path="/chat/:chatId"
        element={
          <RequireOnboarding>
            <ChatRoom />
          </RequireOnboarding>
        }
      />
      <Route
        path="/"
        element={
          <RequireOnboarding>
            <Dashboard />
          </RequireOnboarding>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeWrapper>
          <AppRoutes />
        </ThemeWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}
