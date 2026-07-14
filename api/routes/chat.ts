import { Hono } from 'hono';
import { supabaseAdmin } from '../lib/supabase';
import { openai, DEEPSEEK_MODEL } from '../lib/openai';
import { generateImageFromPrompt } from '../lib/fal';
import { uploadImageFromUrl } from '../lib/r2';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const app = new Hono();

async function getUserFromToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

app.post('/respond', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || '';
  const user = await getUserFromToken(token);
  if (!user) return c.json({ detail: 'Unauthorized' }, 401);

  const { chat_id, content } = await c.req.json();
  if (!chat_id || !content?.trim()) {
    return c.json({ detail: 'chat_id and content required' }, 400);
  }

  // Verify chat ownership
  const { data: chat } = await supabaseAdmin
    .from('chats')
    .select('id, character_id, characters ( name, personality_prompt, avatar_url )')
    .eq('id', chat_id)
    .eq('user_id', user.id)
    .single();

  if (!chat) return c.json({ detail: 'Chat not found' }, 404);

  const character = chat.characters as any;

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('bio')
    .eq('id', user.id)
    .single();

  // Save user message
  const { data: userMessage } = await supabaseAdmin
    .from('messages')
    .insert({ chat_id, role: 'user', content: content.trim() })
    .select()
    .single();

  // Fetch recent messages for context
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('role, content')
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: false })
    .limit(20);

  const history: ChatCompletionMessageParam[] = (recentMessages || [])
    .reverse()
    .map((m) => ({ role: m.role as any, content: m.content }));

  const systemPrompt = `You are ${character.name}. ${character.personality_prompt}

User bio: ${profile?.bio || 'No bio provided.'}

Rules:
- Always stay in character. Reflect your personality in every response.
- Remember past events from the conversation.
- Only call generate_image when the user EXPLICITLY asks for a picture or image of you or something visual related to you.
- If you call generate_image, provide a detailed, context-aware prompt based on the chat history and your character traits.
- If the generate_image tool returns an error, you MUST decline the request gracefully in your own character style. Do not mention technical errors; just say you cannot share such an image right now.
- Never generate images unless explicitly requested by the user.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'generate_image',
        description: 'Generate an image of the character using the character avatar as style reference. Only use when the user explicitly requests a picture.',
        parameters: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Detailed image generation prompt based on chat context and character traits',
            },
          },
          required: ['prompt'],
        },
      },
    },
  ];

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
    });
  } catch (err: any) {
    console.error('[Chat] DeepSeek API error:', err.status, err.message);
    if (err.status === 402) {
      return c.json({
        detail: 'DeepSeek API: Insufficient balance. Please check your DeepSeek account billing at https://platform.deepseek.com',
        code: 'INSUFFICIENT_BALANCE',
      }, 402);
    }
    if (err.status === 401) {
      return c.json({
        detail: 'DeepSeek API: Invalid API key. Please check your DEEPSEEK_API_KEY in api/.env.local',
        code: 'INVALID_API_KEY',
      }, 401);
    }
    return c.json({
      detail: err.message || 'AI service error',
      code: 'AI_ERROR',
    }, 500);
  }

  const choice = completion.choices[0];
  let assistantContent = choice.message.content || '';
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    const toolCall = choice.message.tool_calls[0];
    if (toolCall.function.name === 'generate_image') {
      let toolArgs: { prompt: string };
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        toolArgs = { prompt: '' };
      }

      const toolResultMessages: ChatCompletionMessageParam[] = [
        ...messages,
        choice.message,
      ];

      let imageUrl: string | null = null;
      try {
        if (toolArgs.prompt && character.avatar_url) {
          const falUrl = await generateImageFromPrompt(toolArgs.prompt, character.avatar_url);
          const key = `generated/${user.id}/${chat_id}/${Date.now()}.png`;
          imageUrl = await uploadImageFromUrl(falUrl, key);
        } else {
          throw new Error('Missing prompt or avatar');
        }
      } catch (err: any) {
        console.error('Image generation failed:', err.message);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: false, error: 'Unable to generate image' }),
        });

        const fallback = await openai.chat.completions.create({
          model: DEEPSEEK_MODEL,
          messages: toolResultMessages,
        });
        assistantContent = fallback.choices[0].message.content || '';
      }

      if (imageUrl) {
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: true, image_url: imageUrl }),
        });

        const finalCompletion = await openai.chat.completions.create({
          model: DEEPSEEK_MODEL,
          messages: toolResultMessages,
        });
        assistantContent = finalCompletion.choices[0].message.content || '';
        mediaUrl = imageUrl;
        mediaType = 'image';
      }
    }
  }

  const { data: assistantMessage } = await supabaseAdmin
    .from('messages')
    .insert({
      chat_id,
      role: 'assistant',
      content: assistantContent,
      media_url: mediaUrl,
      media_type: mediaType,
    })
    .select()
    .single();

  await supabaseAdmin
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chat_id);

  return c.json({ user_message: userMessage, assistant_message: assistantMessage });
});

export default app;
