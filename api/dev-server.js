import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env.local');
// Manually parse .env.local and force-assign to process.env
// This guarantees .env.local takes precedence over shell env vars
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const key in envConfig) {
        const oldVal = process.env[key];
        const newVal = envConfig[key];
        process.env[key] = newVal;
        if (oldVal && oldVal !== newVal) {
            const mask = (s) => s ? `${s.slice(0, 4)}...${s.slice(-4)}` : '(empty)';
            console.log(`[Env] Overridden ${key} from .env.local`);
            console.log(`[Env]   old (shell): ${mask(oldVal)}`);
            console.log(`[Env]   new (.env):  ${mask(newVal)}`);
        }
    }
    console.log(`[Env] Loaded and applied ${Object.keys(envConfig).length} vars from ${envPath}`);
}
else {
    console.warn(`[Env] ${envPath} not found`);
}
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import characterRoutes from './routes/characters';
import chatRoutes from './routes/chats';
import respondRoute from './routes/chat';
import feedbackRoutes from './routes/feedback';
import uploadRoutes from './routes/upload';
import imageProxyRoutes from './routes/images';
const app = new Hono().basePath('/api');
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));
app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/characters', characterRoutes);
app.route('/chats', chatRoutes);
app.route('/chat', respondRoute);
app.route('/feedback', feedbackRoutes);
app.route('/upload', uploadRoutes);
app.route('/images', imageProxyRoutes);
app.get('/health', (c) => c.json({ status: 'ok' }));
const port = Number(process.env.PORT) || 8000;
serve({
    fetch: app.fetch,
    port,
}, async () => {
    console.log(`API running at http://localhost:${port}`);
    // Test Supabase connection
    try {
        const { supabaseAdmin } = await import('./lib/supabase');
        const { error } = await supabaseAdmin.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('[Startup] Supabase connection test FAILED:', error.message);
            if (error.message.includes('permission denied')) {
                console.error('[Startup] Your SUPABASE_SECRET_KEY is likely a publishable key.');
                console.error('[Startup] Get the correct key from: Supabase Dashboard > Project Settings > API > service_role key');
            }
        }
        else {
            console.log('[Startup] Supabase connection OK');
        }
    }
    catch (err) {
        console.error('[Startup] Supabase connection test error:', err.message);
    }
});
