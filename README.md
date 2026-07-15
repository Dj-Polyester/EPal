# EPal

A cross-platform mobile application where users can create virtual AI characters and chat with them. Characters remember past events, the user's bio, and their own personality. Built with Expo, Supabase, Vercel, DeepSeek-Chat, and Fal.AI.

## Features

- **Authentication** via Supabase Auth (email + password)
- **Name setup** — users choose a name for characters to address them by
- **Skippable onboarding** — users can share a bio so characters remember them
- **Character creation** with auto-generated avatars via Fal.AI FLUX 1 Schnell
- **Prompt randomization** for users who don't know what character to create
- **Multi-chat support** — each character has its own chat thread
- **Personality-driven responses** — DeepSeek-Chat stays in character using system prompts
- **Image generation** — when a user explicitly requests a picture, DeepSeek composes a scene prompt and invokes Fal.AI FLUX 2 Klein 9B Edit (img2img) using the character avatar as reference
- **Graceful decline** — if image generation fails, the character declines in their own speaking style
- **Real-time messaging** via Supabase Realtime
- **Dark mode** settings persisted per user
- **In-app feedback** — users can send feedback directly to the team via email (powered by Resend)

## Project Structure

```
EPal/
├── app/          # Expo React Native app (TypeScript)
├── api/          # Vercel serverless API (Hono + TypeScript)
└── README.md
```

## Prerequisites

- Node.js 20+
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Vercel CLI](https://vercel.com/docs/cli)
- A [Supabase](https://supabase.com) project
- A [Fal.AI](https://fal.ai) API key
- A [DeepSeek](https://platform.deepseek.com) API key
- A [Resend](https://resend.com) API key
- A [Cloudflare R2](https://developers.cloudflare.com/r2/) bucket + credentials

## Environment Variables

### API (`api/.env.local`)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
DEEPSEEK_API_KEY=your-deepseek-key
FAL_KEY=your-fal-key
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
# Optional: custom public domain for R2 (e.g., https://media.yourdomain.com)
R2_PUBLIC_DOMAIN=
# Resend API key for feedback emails
RESEND_API_KEY=your-resend-key
```

### App (`app/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
EXPO_PUBLIC_API_URL=https://your-vercel-deployment.vercel.app
```

## Supabase Setup

### 1. Enable Auth

In your Supabase project, go to **Authentication > Providers** and ensure **Email** provider is enabled. Disable "Confirm email" if you want immediate access during development.

### 2. Run Migrations

In the Supabase SQL Editor, run:

```sql
-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  bio text,
  onboarding_completed boolean not null default false,
  theme text not null default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Characters table
create table if not exists public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  personality_prompt text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chats table
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  character_id uuid references public.characters(id) on delete cascade not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  media_url text,
  media_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Characters policies
create policy "Users can view own characters"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "Users can insert own characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own characters"
  on public.characters for delete
  using (auth.uid() = user_id);

-- Chats policies
create policy "Users can view own chats"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.chats for delete
  using (auth.uid() = user_id);

-- Messages policies
create policy "Users can view messages in own chats"
  on public.messages for select
  using (exists (
    select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()
  ));

create policy "Users can insert messages in own chats"
  on public.messages for insert
  with check (exists (
    select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid()
  ));

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, onboarding_completed, theme)
  values (new.id, null, false, 'light');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Note: The trigger above automatically creates a profile row when a user signs up.
-- The API does NOT manually insert profiles during registration.
```
For a fresh start
```sql
drop schema public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
```
### 3. Enable Realtime

In Supabase Dashboard, go to **Database > Replication** and enable realtime for the `messages` table.

## Running Locally

All commands can be run from the **project root** using npm workspaces.

### 1. Install Dependencies

```bash
npm install
```

This installs dependencies for both `api/` and `app/` workspaces.

### 2. Start API Dev Server

```bash
npm run dev:api
```

The API will be available at `http://localhost:8000`.

### 3. Start Expo App

In a separate terminal:

```bash
npm run dev:app
```

Then press `w` to open in the browser, or scan the QR code with the **Expo Go** app on your phone, or press `i` for iOS simulator / `a` for Android emulator.

### Available Root Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start the Hono API dev server (`localhost:8000`) |
| `npm run dev:app` | Start the Expo dev server (`localhost:8081`) |
| `npm run build:api` | Type-check and build the API |
| `npm run deploy:api` | Deploy the API to Vercel |
| `npm run prebuild:app` | Run `expo prebuild` for native modules |
| `npm run run:android` | Start Expo on Android emulator |
| `npm run run:ios` | Start Expo on iOS simulator |
| `npm run build:app` | Build the app with EAS |
| `npm run submit:app` | Submit the app to stores with EAS |

## Testing

### Manual Test Flows

1. **Auth**
   - Register with email and password only
   - Log out and log back in with email
   - Verify token refresh works by leaving the app open

2. **Name Setup**
   - After registration, enter your name
   - Verify characters address you by this name in chat

3. **Onboarding**
   - After name setup, enter a bio and save
   - Verify the bio is persisted
   - Log out, register again, and skip onboarding
   - Verify you land on the Dashboard immediately

4. **Character Creation**
   - Tap "New Character"
   - Enter a name and personality
   - Tap "Create Character & Start Chat"
   - Verify an avatar is auto-generated
   - Go back and tap "Randomize" to test prompt randomization

5. **Chat**
   - Send a text message
   - Verify the character responds in character
   - Request an image (e.g., "Can you send me a picture of yourself?")
   - Verify an image is generated using the avatar as reference
   - Test graceful failure by temporarily breaking Fal.AI credentials
   - Verify the character declines naturally

6. **Settings**
   - Switch between light and dark themes
   - Verify changes persist after restart

7. **Feedback**
    - Go to Settings and tap "Give Feedback"
    - Write a message and send
    - Verify the email is received at the configured address

8. **Delete**
    - Delete a character from the Dashboard
    - Verify the chat and character are removed

## Building

### API

```bash
npm run build:api
```

This type-checks the API code. For production deployment:

```bash
npm run deploy:api
```

### Mobile App

For a development build (required for native modules):

```bash
npm run prebuild:app
npm run run:android   # or npm run run:ios
```

For production builds via EAS (from project root):

```bash
npm install -g eas-cli
npm run build:app -- --platform android   # or --platform ios
```

## Deploying

### API

1. Link your Vercel project:
   ```bash
   cd api
   vercel link
   ```
2. Add environment variables in the Vercel dashboard or via CLI:
   ```bash
   vercel env add SUPABASE_SECRET_KEY
   ```
3. Deploy from project root:
   ```bash
   npm run deploy:api
   ```

### App

1. Update `EXPO_PUBLIC_API_URL` in `app/.env` to your production Vercel URL.
2. Build with EAS from project root:
   ```bash
   npm run build:app -- --platform all
   ```
3. Submit to stores from project root:
   ```bash
   npm run submit:app -- --platform ios
   npm run submit:app -- --platform android
   ```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Expo, React Native, TypeScript, React Navigation |
| API | Vercel Edge Functions, Hono, TypeScript |
| Auth & Database | Supabase (PostgreSQL + Auth + Realtime) |
| LLM | DeepSeek-Chat via OpenAI-compatible API |
| Avatar Generation | Fal.AI FLUX 1 Schnell (text-to-image) |
| Chat Image Generation | Fal.AI FLUX 2 Klein 9B Edit (img2img, avatar as reference) |
| Media Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Icons | lucide-react-native |

## Notes

- **Never commit `.env` or `.env.local` files.** Add them to `.gitignore`.
- The API uses **function calling** with DeepSeek. Only when the user explicitly requests a picture of the character does the `generate_image` tool fire.
- **Img2img** uses Fal.AI FLUX 2 Klein 9B Edit with the character's stored `avatar_url` as the image reference and a prompt composed by DeepSeek based on chat context.
- If Fal.AI or R2 fails during image generation, the tool returns an error to DeepSeek, which then generates a natural, in-character decline response.
- All database queries enforce **Row Level Security** so users can only access their own data.
- The dev server loads `.env.local` with `override: true` behavior (forced via `dotenv.parse`) so `.env.local` always takes precedence over shell env vars.
