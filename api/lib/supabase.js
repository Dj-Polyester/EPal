import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
}
// Diagnostic logging
const keyPrefix = supabaseSecretKey.substring(0, 14);
console.log(`[Supabase] URL: ${supabaseUrl}`);
console.log(`[Supabase] Secret key prefix: ${keyPrefix}...`);
if (supabaseSecretKey.includes('publishable')) {
    console.error('[Supabase] ERROR: SUPABASE_SECRET_KEY appears to be a publishable key!');
    console.error('[Supabase] Please use the service_role/secret key from Supabase Dashboard > Project Settings > API > service_role key.');
}
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
export const supabaseClient = (authToken) => createClient(supabaseUrl, supabasePublishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${authToken}` } },
});
