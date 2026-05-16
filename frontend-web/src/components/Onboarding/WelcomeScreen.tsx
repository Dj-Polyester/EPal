import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function WelcomeScreen() {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSave = async () => {
    setLoading(true);
    try {
      await client.post('/users/onboarding', { bio });
      navigate('/');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await client.post('/users/onboarding/skip');
      navigate('/');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">Welcome to EPal!</h1>
        <p className="text-gray-600 mb-6">
          Tell us a little about yourself so your characters can remember you.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            About you (optional)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="I love sci-fi, hiking, and my cat Luna..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-32 resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
        <button
          onClick={logout}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
