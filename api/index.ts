import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import characterRoutes from './routes/characters';
import chatRoutes from './routes/chats';
import respondRoute from './routes/chat';

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

app.get('/health', (c) => c.json({ status: 'ok' }));

export const config = {
  runtime: 'edge',
};

export default handle(app);
