import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase';
import { getPublicUrl } from '../lib/r2';

const app = new Hono();

async function getUserFromToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

app.get('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const user = await getUserFromToken(token);
  if (!user) return c.json({ detail: 'Unauthorized' }, 401);

  const { data, error } = await supabaseAdmin
    .from('chats')
    .select(`
      id,
      character_id,
      characters ( name, avatar_url, personality_prompt ),
      updated_at
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) return c.json({ detail: error.message }, 400);

  const formatted = (data || []).map((chat: any) => ({
    id: chat.id,
    character_id: chat.character_id,
    character_name: chat.characters?.name || 'Unknown',
    character_avatar_url: getPublicUrl(chat.characters?.avatar_url || null),
    character_personality: chat.characters?.personality_prompt || null,
    updated_at: chat.updated_at,
  }));

  return c.json(formatted);
});

app.get('/:id', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const user = await getUserFromToken(token);
  if (!user) return c.json({ detail: 'Unauthorized' }, 401);

  const chatId = c.req.param('id');

  const { data, error } = await supabaseAdmin
    .from('chats')
    .select(`
      id,
      character_id,
      characters ( name, avatar_url, personality_prompt )
    `)
    .eq('id', chatId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return c.json({ detail: 'Chat not found' }, 404);

  return c.json({
    id: data.id,
    character_id: data.character_id,
    character_name: data.characters?.name || 'Unknown',
    character_avatar_url: getPublicUrl(data.characters?.avatar_url || null),
    character_personality: data.characters?.personality_prompt || null,
  });
});

app.get('/:id/messages', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const user = await getUserFromToken(token);
  if (!user) return c.json({ detail: 'Unauthorized' }, 401);

  const chatId = c.req.param('id');

  const { data: chat } = await supabaseAdmin
    .from('chats')
    .select('id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .single();

  if (!chat) return c.json({ detail: 'Chat not found' }, 404);

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) return c.json({ detail: error.message }, 400);
  return c.json(data || []);
});

export default app;
