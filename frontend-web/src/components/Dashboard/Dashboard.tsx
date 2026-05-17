import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import CharacterDetailModal from '../CharacterDetailModal';
import SettingsModal from '../SettingsModal';
import { Plus, MessageCircle, User, LogOut, Settings } from 'lucide-react';

interface ChatItem {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar_url: string | null;
  character_personality: string | null;
  updated_at: string;
}

export default function Dashboard() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailChat, setDetailChat] = useState<ChatItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (!user.onboarding_completed) {
      navigate('/welcome');
      return;
    }
    client
      .get('/chats')
      .then((res) => setChats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">EPal</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{user.username}</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 transition"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Your Chats</h2>
          <Link
            to="/character/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Character
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-1">No characters yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first virtual character to start chatting.</p>
            <Link
              to="/character/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create Character
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                to={`/chat/${chat.id}`}
                className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 dark:border-gray-700"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDetailChat(chat);
                  }}
                  className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0 hover:ring-2 hover:ring-indigo-300 transition"
                >
                  {chat.character_avatar_url ? (
                    <img src={chat.character_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{chat.character_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {new Date(chat.updated_at).toLocaleString()}
                  </p>
                </div>
                <MessageCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </Link>
            ))}
          </div>
        )}
      </main>

      <CharacterDetailModal
        open={!!detailChat}
        onClose={() => setDetailChat(null)}
        name={detailChat?.character_name || ''}
        avatarUrl={detailChat?.character_avatar_url || null}
        personality={detailChat?.character_personality || null}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
