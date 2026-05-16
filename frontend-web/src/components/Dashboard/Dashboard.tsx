import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, MessageCircle, User, LogOut } from 'lucide-react';

interface ChatItem {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar_url: string | null;
  updated_at: string;
}

export default function Dashboard() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-indigo-700">EPal</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:inline">{user.username}</span>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 transition"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Your Chats</h2>
          <Link
            to="/character/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Character
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No characters yet</h3>
            <p className="text-gray-500 mb-6">Create your first virtual character to start chatting.</p>
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
                className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0">
                  {chat.character_avatar_url ? (
                    <img src={chat.character_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{chat.character_name}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {new Date(chat.updated_at).toLocaleString()}
                  </p>
                </div>
                <MessageCircle className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
