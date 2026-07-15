import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase';
const app = new Hono();
app.post('/name', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    if (!token)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { name } = await c.req.json();
    if (!name?.trim()) {
        return c.json({ detail: 'Name is required' }, 400);
    }
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ username: name.trim() })
        .eq('id', userData.user.id);
    if (error)
        return c.json({ detail: error.message }, 400);
    return c.json({ success: true });
});
app.post('/onboarding', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    if (!token)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { bio } = await c.req.json();
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ bio: bio || null, onboarding_completed: true })
        .eq('id', userData.user.id);
    if (error)
        return c.json({ detail: error.message }, 400);
    return c.json({ success: true });
});
app.post('/onboarding/skip', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    if (!token)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userData.user.id);
    if (error)
        return c.json({ detail: error.message }, 400);
    return c.json({ success: true });
});
app.patch('/settings', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    if (!token)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user)
        return c.json({ detail: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const updates = {};
    if (body.theme === 'light' || body.theme === 'dark')
        updates.theme = body.theme;
    const { error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userData.user.id);
    if (error)
        return c.json({ detail: error.message }, 400);
    return c.json({ success: true });
});
export default app;
