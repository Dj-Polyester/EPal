import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  role: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

export default function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [wsError, setWsError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch history
  useEffect(() => {
    if (!chatId) return;
    client
      .get(`/chats/${chatId}/messages`)
      .then((res) => {
        setMessages(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      if (data.type === 'connected') {
        // ready
      } else if (data.type === 'user_message') {
        setMessages((prev) => [...prev, data]);
      } else if (data.type === 'assistant_message') {
        setMessages((prev) => [...prev, data]);
        setTyping(false);
        setSending(false);
      } else if (data.type === 'typing') {
        setTyping(data.status === 'start');
      } else if (data.type === 'error') {
        setWsError(data.message);
        setTyping(false);
        setSending(false);
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
    // Check if content has embedded media references like [Here is the image: url]
    const parts = content.split(/(\[Here is the [^\]]+\])/g);
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          const match = part.match(/\[Here is the (\w+): (.+)\]/);
          if (match) {
            const type = match[1];
            const url = match[2];
            return (
              <div key={i} className="mt-2">
                {type === 'image' && (
                  <img src={url} alt="generated" className="max-w-xs rounded-lg shadow-sm border" />
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
            // Unfulfilled media request message
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
              <img src={mediaUrl} alt="generated" className="max-w-xs rounded-lg shadow-sm border" />
            )}
            {mediaType === 'video' && (
              <video src={mediaUrl} controls className="max-w-xs rounded-lg shadow-sm border" />
            )}
            {mediaType === 'audio' && (
              <audio src={mediaUrl} controls className="w-full max-w-xs" />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-gray-900">Chat</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border rounded-bl-md shadow-sm'
                }`}
              >
                {renderContent(msg.content, msg.media_url, msg.media_type)}
              </div>
            </div>
          ))
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
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
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm text-center">{wsError}</div>
      )}

      <form
        onSubmit={handleSend}
        className="bg-white border-t px-4 py-3 flex items-center gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-sm"
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
    </div>
  );
}
