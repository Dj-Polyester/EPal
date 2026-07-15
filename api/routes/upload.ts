import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase';
import { uploadBase64Image, isR2Configured } from '../lib/r2';

const app = new Hono();

app.post('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return c.json({ detail: 'Unauthorized' }, 401);

  const { image, filename } = await c.req.json();
  if (!image?.trim()) return c.json({ detail: 'Image base64 required' }, 400);

  if (!isR2Configured()) {
    return c.json({ detail: 'Image upload not configured' }, 500);
  }

  try {
    const key = `uploads/${userData.user.id}/${filename || Date.now()}.png`;
    const url = await uploadBase64Image(image, key);
    return c.json({ url });
  } catch (err: any) {
    console.error('[Upload] Failed:', err.message);
    return c.json({ detail: 'Upload failed' }, 500);
  }
});

export default app;
