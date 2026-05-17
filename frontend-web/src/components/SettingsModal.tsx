import { useState } from 'react';
import { X, Brain, Moon, Sun, ChevronRight } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, refreshUser } = useAuth();
  const [thinking, setThinking] = useState(user?.thinking_mode ?? true);
  const [theme, setTheme] = useState<'light' | 'dark'>((user?.theme as 'light' | 'dark') ?? 'light');
  const [saving, setSaving] = useState(false);

  if (!open || !user) return null;

  const handleToggleThinking = async () => {
    const next = !thinking;
    setThinking(next);
    setSaving(true);
    try {
      await client.patch('/users/settings', { thinking_mode: next });
      await refreshUser();
    } catch {
      setThinking(!next);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (next: 'light' | 'dark') => {
    if (next === theme) return;
    setTheme(next);
    setSaving(true);
    try {
      await client.patch('/users/settings', { theme: next });
      await refreshUser();
    } catch {
      setTheme(theme);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white h-full w-full max-w-sm shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Thinking mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Thinking Mode</h3>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, characters will show their reasoning process before responding.
            </p>
            <button
              onClick={handleToggleThinking}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                thinking ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  thinking ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="ml-3 text-sm text-gray-600">{thinking ? 'On' : 'Off'}</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200" />

          {/* Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Appearance</h3>
            </div>
            <p className="text-sm text-gray-500">
              Choose your preferred color scheme.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="font-medium text-sm">Light</span>
                {theme === 'light' && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="font-medium text-sm">Dark</span>
                {theme === 'dark' && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
