import { Hono } from 'hono';
import { Resend } from 'resend';
import { supabaseAdmin } from '../lib/supabase';

const resendApiKey = process.env.RESEND_API_KEY || '';

if (!resendApiKey) {
  console.warn('[Feedback] RESEND_API_KEY not set. Feedback emails will fail.');
}

const resend = new Resend(resendApiKey);

const app = new Hono();

app.post('/', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return c.json({ detail: 'Unauthorized' }, 401);

  const { message } = await c.req.json();
  if (!message?.trim()) return c.json({ detail: 'Message required' }, 400);

  if (!resendApiKey) {
    return c.json({ detail: 'Feedback service not configured' }, 500);
  }

  try {
    const { data, error: sendError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'eeeeeepal@gmail.com',
      subject: `EPal Feedback from ${userData.user.email}`,
      html: `<p><strong>User:</strong> ${userData.user.email}</p><p><strong>Feedback:</strong></p><p>${message.trim().replace(/\n/g, '<br>')}</p>`,
    });

    if (sendError) {
      console.error('[Feedback] Resend error:', sendError);
      return c.json({ detail: 'Failed to send feedback' }, 500);
    }

    console.log('[Feedback] Sent:', data?.id);
    return c.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('[Feedback] Resend exception:', err);
    return c.json({ detail: 'Failed to send feedback' }, 500);
  }
});

export default app;
