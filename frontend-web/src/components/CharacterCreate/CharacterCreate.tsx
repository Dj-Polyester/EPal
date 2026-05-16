import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';

export default function CharacterCreate() {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [loading, setLoading] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const navigate = useNavigate();

  const handleRandomize = async () => {
    setRandomizing(true);
    try {
      const res = await client.get('/characters/prompts/random');
      setPersonality(res.data.prompt);
    } catch {
      // ignore
    } finally {
      setRandomizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !personality.trim()) return;
    setLoading(true);
    try {
      const res = await client.post('/characters', {
        name: name.trim(),
        personality_prompt: personality.trim(),
      });
      // Redirect to the newly created chat
      const chatRes = await client.get('/chats');
      const chat = chatRes.data.find(
        (c: any) => c.character_id === res.data.id
      );
      if (chat) {
        navigate(`/chat/${chat.id}`);
      } else {
        navigate('/');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-lg mt-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Create a Character</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Character Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Zephyr the Wizard"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Personality & Traits</label>
              <button
                type="button"
                onClick={handleRandomize}
                disabled={randomizing}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Wand2 className="w-4 h-4" />
                {randomizing ? 'Randomizing...' : 'Randomize'}
              </button>
            </div>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Describe their personality, speaking style, background, and quirks..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-40 resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create Character & Start Chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
