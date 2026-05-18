import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client, { API_BASE } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import CharacterDetailModal from '../CharacterDetailModal';
import { ArrowLeft, Send, Loader2, User } from 'lucide-react';

interface Message {
  id: string;
  role: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

interface ChatInfo {
  id: string;
  character_id: string;
  character_name: string;
  character_avatar_url: string | null;
  character_personality: string | null;
}

export default function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState('');
  const [wsError, setWsError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch chat info and messages
  useEffect(() => {
    if (!chatId) return;
    Promise.all([
      client.get(`/chats/${chatId}`).then((res) => setChatInfo(res.data)),
      client.get(`/chats/${chatId}/messages`).then((res) => setMessages(res.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chatId]);

  // WebSocket
  useEffect(() => {
    if (!chatId || !user) return;
    const token = localStorage.getItem('access_token') || '';
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/chat/${chatId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsError('');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[WS] received:', data.type, data);
      if (data.type === 'connected') {
        // ready
      } else if (data.type === 'user_message') {
        setMessages((prev) => [...prev, data]);
      } else if (data.type === 'assistant_message') {
        console.log('[WS] assistant_message content:', data.content);
        console.log('[WS] assistant_message media_url:', data.media_url);
        setMessages((prev) => [...prev, data]);
        setTyping(false);
        setSending(false);
      } else if (data.type === 'typing') {
        setTyping(data.status === 'start');
        if (data.status === 'stop') {
          setStatus('');
        }
      } else if (data.type === 'status') {
        setStatus(data.message);
      } else if (data.type === 'error') {
        setWsError(data.message);
        setTyping(false);
        setSending(false);
        setStatus('');
      }
    };

    ws.onclose = () => {
      setWsError('Connection closed');
    };

    ws.onerror = () => {
      setWsError('WebSocket error');
    };

    return () => {
      ws.close();
    };
  }, [chatId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !wsRef.current) return;
    setSending(true);
    setWsError('');
    wsRef.current.send(
      JSON.stringify({ type: 'message', content: input.trim() })
    );
    setInput('');
  };

  const renderContent = (content: string, mediaUrl: string | null, mediaType: string | null) => {
    // Rewrite ComfyUI image URLs to go through our backend proxy (avoids CORS)
    const proxyIfNeeded = (url: string) => {
      if (url.startsWith('http://localhost:8188/') || url.startsWith('http://127.0.0.1:8188/')) {
        return `${API_BASE}/media/proxy?url=${encodeURIComponent(url)}`;
      }
      return url;
    };

    const parts = content.split(/(\[Here is the [^\]]+\])/g);
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          const match = part.match(/\[Here is the (\w+): (.+)\]/);
          if (match) {
            const type = match[1];
            const url = proxyIfNeeded(match[2]);
            return (
              <div key={i} className="mt-2">
                {type === 'image' && (
                  imgErrors[url] ? (
                    <div className="max-w-xs p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200">
                      Image failed to load. URL: {url}
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt="generated"
                      className="max-w-xs rounded-lg shadow-sm border"
                      onError={() => setImgErrors((prev) => ({ ...prev, [url]: true }))}
                    />
                  )
                )}
                {type === 'video' && (
                  <video src={url} controls className="max-w-xs rounded-lg shadow-sm border" />
                )}
                {type === 'audio' && (
                  <audio src={url} controls className="w-full max-w-xs" />
                )}
              </div>
            );
          }
          if (part.startsWith('[') && part.endsWith(']')) {
            return (
              <p key={i} className="text-sm text-gray-500 italic">
                {part}
              </p>
            );
          }
          return <p key={i}>{part}</p>;
        })}
        {mediaUrl && !content.includes(mediaUrl) && (
          <div className="mt-2">
            {mediaType === 'image' && (
              imgErrors[proxyIfNeeded(mediaUrl)] ? (
                <div className="max-w-xs p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200">
                  Image failed to load. URL: {proxyIfNeeded(mediaUrl)}
                </div>
              ) : (
                <img
                  src={proxyIfNeeded(mediaUrl)}
                  alt="generated"
                  className="max-w-xs rounded-lg shadow-sm border"
                  onError={() => setImgErrors((prev) => ({ ...prev, [proxyIfNeeded(mediaUrl)]: true }))}
                />
              )
            )}
            {mediaType === 'video' && (
              <video src={proxyIfNeeded(mediaUrl)} controls className="max-w-xs rounded-lg shadow-sm border" />
            )}
            {mediaType === 'audio' && (
              <audio src={proxyIfNeeded(mediaUrl)} controls className="w-full max-w-xs" />
            )}
          </div>
        )}
      </div>
    );
  };

  const avatarUrl = chatInfo?.character_avatar_url;
  const charName = chatInfo?.character_name || 'Chat';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* WhatsApp-style header */}
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setDetailOpen(true)}
          className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1 transition -ml-1"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={charName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div className="text-left">
            <h1 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{charName}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {typing ? 'typing...' : 'online'}
            </p>
          </div>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-12">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
            >
              {/* Character avatar on assistant messages */}
              {msg.role === 'assistant' && (
                <button
                  onClick={() => setDetailOpen(true)}
                  className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0 self-end mb-1"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={charName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </button>
              )}

              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border dark:border-gray-700 rounded-bl-md shadow-sm'
                }`}
              >
                {renderContent(msg.content, msg.media_url, msg.media_type)}
                <span className="text-[10px] opacity-60 block mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        {typing && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0 self-end mb-1">
              {avatarUrl ? (
                <img src={avatarUrl} alt={charName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {wsError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">{wsError}</div>
      )}

      <form
        onSubmit={handleSend}
        className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-4 py-3 flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 outline-none text-sm"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>

      {/* Character detail modal */}
      <CharacterDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        name={charName}
        avatarUrl={avatarUrl || null}
        personality={chatInfo?.character_personality || null}
      />
    </div>
  );
}
