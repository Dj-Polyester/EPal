import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase';
import { generateAvatar } from '../lib/fal';
import { uploadImageFromUrl, isR2Configured, getPublicUrl } from '../lib/r2';
const app = new Hono();
const RANDOM_NAMES = [
    'Zephyr the Wizard',
    'Luna the Dreamer',
    'Kai the Traveler',
    'Nova the Stargazer',
    'Echo the Bard',
    'Orion the Guardian',
    'Aria the Healer',
    'Sol the Flame',
    'Iris the Seer',
    'Cypher the Hacker',
];
const RANDOM_PERSONALITIES = [
    'A wise and mysterious wizard who speaks in riddles and loves astronomy. Calm, patient, but occasionally sarcastic.',
    'A cheerful dreamer who sees the good in everyone. Speaks softly, uses metaphors, and loves stargazing.',
    'An adventurous traveler with endless stories. Energetic, curious, and always ready with a joke.',
    'A stoic guardian who protects those they care about. Speaks few words but with deep meaning.',
    'A playful bard who communicates through songs and rhymes. Optimistic, dramatic, and loves compliments.',
    'A tech-savvy hacker with a dry sense of humor. Blunt, efficient, but secretly loyal.',
    'A gentle healer who always puts others first. Soft-spoken, nurturing, and wise beyond their years.',
    'A passionate artist who sees beauty in chaos. Emotional, expressive, and deeply empathetic.',
    'A cunning strategist who always thinks three moves ahead. Cool, collected, and occasionally arrogant.',
    'A whimsical spirit who flits between topics. Unpredictable, joyful, and fascinated by small details.',
];
async function getUserFromToken(token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user)
        return null;
    return data.user;
}
app.get('/prompts/random', async (c) => {
    const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const prompt = RANDOM_PERSONALITIES[Math.floor(Math.random() * RANDOM_PERSONALITIES.length)];
    return c.json({ name, prompt });
});
app.post('/', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const user = await getUserFromToken(token);
    if (!user)
        return c.json({ detail: 'Unauthorized' }, 401);
    const { name, personality_prompt } = await c.req.json();
    if (!name?.trim() || !personality_prompt?.trim()) {
        return c.json({ detail: 'Name and personality required' }, 400);
    }
    // Generate avatar
    let avatarUrl = null;
    try {
        console.log('[Character] Generating avatar with Fal.AI...');
        const falUrl = await generateAvatar(personality_prompt.trim());
        console.log('[Character] Fal.AI generated URL:', falUrl);
        if (isR2Configured()) {
            const key = `avatars/${user.id}/${Date.now()}.png`;
            avatarUrl = await uploadImageFromUrl(falUrl, key);
            console.log('[Character] Uploaded to R2:', avatarUrl);
        }
        else {
            console.log('[Character] R2 not configured, using Fal.AI URL directly');
            avatarUrl = falUrl;
        }
    }
    catch (err) {
        console.error('[Character] Avatar generation failed:', err.message);
        // Continue without avatar - placeholder will be shown
    }
    const { data: character, error: charError } = await supabaseAdmin
        .from('characters')
        .insert({
        user_id: user.id,
        name: name.trim(),
        personality_prompt: personality_prompt.trim(),
        avatar_url: avatarUrl,
    })
        .select()
        .single();
    if (charError || !character) {
        return c.json({ detail: charError?.message || 'Character creation failed' }, 400);
    }
    const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .insert({ user_id: user.id, character_id: character.id })
        .select()
        .single();
    if (chatError || !chat) {
        return c.json({ detail: chatError?.message || 'Chat creation failed' }, 400);
    }
    return c.json({
        character: {
            ...character,
            avatar_url: getPublicUrl(character.avatar_url),
        },
        chat,
    }, 201);
});
app.delete('/:id', async (c) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const user = await getUserFromToken(token);
    if (!user)
        return c.json({ detail: 'Unauthorized' }, 401);
    const id = c.req.param('id');
    console.log('[Character] Delete request for id:', id, 'user:', user.id);
    // Delete related chats first (messages cascade via chat FK)
    const { error: chatDeleteError } = await supabaseAdmin
        .from('chats')
        .delete()
        .eq('character_id', id)
        .eq('user_id', user.id);
    if (chatDeleteError) {
        console.error('[Character] Chat delete failed:', chatDeleteError.message);
        return c.json({ detail: chatDeleteError.message, code: chatDeleteError.code }, 400);
    }
    // Delete the character
    const { error } = await supabaseAdmin
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
    if (error) {
        console.error('[Character] Delete failed:', error.message, error.code);
        return c.json({ detail: error.message, code: error.code }, 400);
    }
    console.log('[Character] Delete success for id:', id);
    return c.json({ success: true });
});
export default app;
