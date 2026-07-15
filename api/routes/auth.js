import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase';
const app = new Hono();
async function ensureProfile(userId) {
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId);
    if (!profiles || profiles.length === 0) {
        const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
            id: userId,
            username: null,
            bio: null,
            onboarding_completed: false,
            theme: 'light',
        });
        if (insertError) {
            console.error('Profile insert failed:', insertError.message);
            if (insertError.message.includes('permission denied')) {
                console.error('HINT: Your SUPABASE_SECRET_KEY may be a publishable key. Use the service_role key from Supabase Dashboard > Project Settings > API.');
            }
        }
    }
}
function isPermissionError(err) {
    return err?.message?.includes('permission denied') || err?.code === '42501';
}
app.post('/register', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (!email || !password) {
            return c.json({ detail: 'Email and password required' }, 400);
        }
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
            email,
            password,
        });
        if (authError || !authData.user) {
            return c.json({ detail: authError?.message || 'Registration failed' }, 400);
        }
        await ensureProfile(authData.user.id);
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });
        if (sessionError || !sessionData.session) {
            return c.json({ detail: sessionError?.message || 'Login failed after registration' }, 400);
        }
        return c.json({
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
        });
    }
    catch (err) {
        console.error('Register error:', err);
        if (isPermissionError(err)) {
            return c.json({ detail: 'Server configuration error: Supabase service role key is invalid. Check api/.env.local' }, 500);
        }
        return c.json({ detail: err.message || 'Internal server error' }, 500);
    }
});
app.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (!email || !password) {
            return c.json({ detail: 'Email and password required' }, 400);
        }
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        });
        if (sessionError || !sessionData.session) {
            return c.json({ detail: sessionError?.message || 'Invalid credentials' }, 401);
        }
        await ensureProfile(sessionData.user.id);
        return c.json({
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token,
        });
    }
    catch (err) {
        console.error('Login error:', err);
        if (isPermissionError(err)) {
            return c.json({ detail: 'Server configuration error: Supabase service role key is invalid. Check api/.env.local' }, 500);
        }
        return c.json({ detail: err.message || 'Internal server error' }, 500);
    }
});
app.get('/me', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '') || '';
        if (!token)
            return c.json({ detail: 'Unauthorized' }, 401);
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !userData.user) {
            return c.json({ detail: 'Unauthorized' }, 401);
        }
        await ensureProfile(userData.user.id);
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userData.user.id);
        if (profileError) {
            console.error('Profile fetch error:', profileError.message);
            if (profileError.message.includes('permission denied')) {
                return c.json({ detail: 'Server configuration error: Supabase service role key is invalid. Check api/.env.local' }, 500);
            }
            return c.json({ detail: 'Failed to fetch profile' }, 500);
        }
        if (!profiles || profiles.length === 0) {
            return c.json({ detail: 'Profile not found' }, 404);
        }
        return c.json(profiles[0]);
    }
    catch (err) {
        console.error('Me error:', err);
        if (isPermissionError(err)) {
            return c.json({ detail: 'Server configuration error: Supabase service role key is invalid. Check api/.env.local' }, 500);
        }
        return c.json({ detail: err.message || 'Internal server error' }, 500);
    }
});
app.post('/refresh', async (c) => {
    try {
        const { refresh_token } = await c.req.json();
        if (!refresh_token)
            return c.json({ detail: 'Refresh token required' }, 400);
        const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
        if (error || !data.session) {
            return c.json({ detail: error?.message || 'Invalid refresh token' }, 401);
        }
        return c.json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });
    }
    catch (err) {
        console.error('Refresh error:', err);
        return c.json({ detail: err.message || 'Internal server error' }, 500);
    }
});
export default app;
