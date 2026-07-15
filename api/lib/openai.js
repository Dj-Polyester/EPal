import OpenAI from 'openai';
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
// Diagnostic logging
const keyPrefix = deepseekApiKey ? `${deepseekApiKey.slice(0, 8)}...` : '(empty)';
console.log(`[OpenAI] DEEPSEEK_API_KEY loaded: ${keyPrefix}`);
if (!deepseekApiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY');
}
export const openai = new OpenAI({
    apiKey: deepseekApiKey,
    baseURL: 'https://api.deepseek.com',
});
export const DEEPSEEK_MODEL = 'deepseek-chat';
