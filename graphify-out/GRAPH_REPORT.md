# Graph Report - .  (2026-05-14)

## Corpus Check
- Corpus is ~8,304 words - fits in a single context window. You may not need a graph.

## Summary
- 238 nodes · 306 edges · 45 communities (25 shown, 20 thin omitted)
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Components & Auth|Frontend Components & Auth]]
- [[_COMMUNITY_Frontend State & Chat UI|Frontend State & Chat UI]]
- [[_COMMUNITY_Backend Character & Chat API|Backend Character & Chat API]]
- [[_COMMUNITY_Pydantic Schemas & Routers|Pydantic Schemas & Routers]]
- [[_COMMUNITY_AI Chat Pipeline & Memory|AI Chat Pipeline & Memory]]
- [[_COMMUNITY_ComfyScript Media Generation|ComfyScript Media Generation]]
- [[_COMMUNITY_JWT Authentication Dependencies|JWT Authentication Dependencies]]
- [[_COMMUNITY_SQLAlchemy Database Models|SQLAlchemy Database Models]]
- [[_COMMUNITY_Docker Compose Infrastructure|Docker Compose Infrastructure]]
- [[_COMMUNITY_Auth Router & Settings|Auth Router & Settings]]
- [[_COMMUNITY_Miscellaneous 10|Miscellaneous 10]]
- [[_COMMUNITY_Miscellaneous 11|Miscellaneous 11]]
- [[_COMMUNITY_Miscellaneous 13|Miscellaneous 13]]
- [[_COMMUNITY_Miscellaneous 14|Miscellaneous 14]]
- [[_COMMUNITY_Miscellaneous 15|Miscellaneous 15]]
- [[_COMMUNITY_Miscellaneous 17|Miscellaneous 17]]
- [[_COMMUNITY_Miscellaneous 18|Miscellaneous 18]]
- [[_COMMUNITY_Miscellaneous 19|Miscellaneous 19]]
- [[_COMMUNITY_Miscellaneous 29|Miscellaneous 29]]
- [[_COMMUNITY_Miscellaneous 30|Miscellaneous 30]]
- [[_COMMUNITY_Miscellaneous 31|Miscellaneous 31]]
- [[_COMMUNITY_Miscellaneous 32|Miscellaneous 32]]
- [[_COMMUNITY_Miscellaneous 33|Miscellaneous 33]]
- [[_COMMUNITY_Miscellaneous 34|Miscellaneous 34]]
- [[_COMMUNITY_Miscellaneous 35|Miscellaneous 35]]
- [[_COMMUNITY_Miscellaneous 36|Miscellaneous 36]]
- [[_COMMUNITY_Miscellaneous 37|Miscellaneous 37]]
- [[_COMMUNITY_Miscellaneous 38|Miscellaneous 38]]
- [[_COMMUNITY_Miscellaneous 39|Miscellaneous 39]]
- [[_COMMUNITY_Miscellaneous 40|Miscellaneous 40]]
- [[_COMMUNITY_Miscellaneous 41|Miscellaneous 41]]
- [[_COMMUNITY_Miscellaneous 42|Miscellaneous 42]]
- [[_COMMUNITY_Miscellaneous 43|Miscellaneous 43]]
- [[_COMMUNITY_Miscellaneous 44|Miscellaneous 44]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 14 edges
2. `chat_websocket handler` - 12 edges
3. `User model` - 10 edges
4. `API Client` - 10 edges
5. `chat_websocket()` - 9 edges
6. `Chat model` - 9 edges
7. `get_current_user` - 8 edges
8. `Character model` - 8 edges
9. `generate_avatar()` - 7 edges
10. `generate_media()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `backend service` --references--> `run_migrations_online`  [INFERRED]
  docker-compose.yml → backend/alembic/env.py
- `AuthProvider` --implements--> `JWT Authentication`  [INFERRED]
  frontend-web/src/contexts/AuthContext.tsx → README.md
- `WelcomeScreen` --implements--> `Skippable Onboarding`  [INFERRED]
  frontend-web/src/components/Onboarding/WelcomeScreen.tsx → task.txt
- `CharacterCreate` --implements--> `Character Creation`  [INFERRED]
  frontend-web/src/components/CharacterCreate/CharacterCreate.tsx → task.txt
- `Dashboard` --conceptually_related_to--> `Character Memory`  [INFERRED]
  frontend-web/src/components/Dashboard/Dashboard.tsx → task.txt

## Hyperedges (group relationships)
- **Database Relational Schema** — user_user, character_character, chat_chat, message_message, media_media [EXTRACTED 1.00]
- **REST API Endpoints** — auth_register, auth_login, auth_refresh, users_onboarding, characters_create_character, chats_list_chats [INFERRED 0.85]
- **AI Chat Pipeline** — chat_ws_chat_websocket, memory_service_build_chat_context, vllm_service_chat_completion, comfy_service_generate_media [INFERRED 0.85]
- **Database Migration System** — env_run_migrations_offline, env_run_migrations_online, env_do_run_migrations, 001_initial_upgrade [EXTRACTED 1.00]
- **JWT Token Lifecycle** — authcontext_login, authcontext_register, authcontext_logout, client_request_interceptor, client_response_interceptor [INFERRED 0.85]
- **Onboarding Guard Flow** — app_requireonboarding, welcomescreen_welcomescreen, authcontext_authprovider [INFERRED 0.75]

## Communities (45 total, 20 thin omitted)

### Community 0 - "Frontend Components & Auth"
Cohesion: 0.12
Nodes (17): client, refreshToken, token, Login(), Register(), ChatRoom(), Message, AuthContext (+9 more)

### Community 1 - "Frontend State & Chat UI"
Cohesion: 0.12
Nodes (24): AuthProvider, fetchMe, login, logout, register, handleRandomize, handleSubmit, ChatRoom (+16 more)

### Community 2 - "Backend Character & Chat API"
Cohesion: 0.17
Nodes (23): me endpoint, Character model, create_character endpoint, get_character endpoint, list_characters endpoint, Chat model, chat_websocket handler, get_messages endpoint (+15 more)

### Community 3 - "Pydantic Schemas & Routers"
Cohesion: 0.1
Nodes (11): BaseModel, LoginRequest, RefreshRequest, RegisterRequest, CharacterCreate, CharacterOut, Config, ChatOut (+3 more)

### Community 4 - "AI Chat Pipeline & Memory"
Cohesion: 0.14
Nodes (12): websocket_chat(), build_chat_context(), extract_media_requests(), Build the message list for vLLM including system prompt, memory, and recent hist, Extract media generation tags from assistant response.     Returns list of (medi, Replace media tags with either a URL or a 'not available' message., replace_media_tags(), chat_completion() (+4 more)

### Community 5 - "ComfyScript Media Generation"
Cohesion: 0.22
Nodes (15): _build_txt2img_workflow(), _ensure_comfy(), _generate_audio_stub(), generate_avatar(), _generate_image(), generate_media(), _generate_video_stub(), _poll_output() (+7 more)

### Community 6 - "JWT Authentication Dependencies"
Cohesion: 0.3
Nodes (11): create_access_token(), create_refresh_token(), decode_token(), get_current_user(), get_current_user_ws(), hash_password(), verify_password(), login() (+3 more)

### Community 7 - "SQLAlchemy Database Models"
Cohesion: 0.18
Nodes (7): Base, Character, Chat, Media, Message, User, create_character()

### Community 8 - "Docker Compose Infrastructure"
Cohesion: 0.24
Nodes (10): renderContent, backend service, comfyui service, postgres service, redis service, vllm service, do_run_migrations, run_migrations_online (+2 more)

### Community 9 - "Auth Router & Settings"
Cohesion: 0.33
Nodes (9): login endpoint, refresh endpoint, register endpoint, Settings config class, create_access_token, create_refresh_token, decode_token, hash_password (+1 more)

### Community 10 - "Miscellaneous 10"
Cohesion: 0.31
Nodes (9): _build_txt2img_workflow, _ensure_comfy, _generate_audio_stub, generate_avatar, _generate_image, generate_media, _generate_video_stub, _poll_output (+1 more)

### Community 11 - "Miscellaneous 11"
Cohesion: 0.5
Nodes (4): Config, get_settings(), Settings, BaseSettings

### Community 14 - "Miscellaneous 14"
Cohesion: 0.67
Nodes (3): SQLAlchemy declarative base, SQLAlchemy async engine, lifespan

### Community 15 - "Miscellaneous 15"
Cohesion: 1.0
Nodes (3): RequireAuth, RequireOnboarding, useAuth

## Knowledge Gaps
- **68 isolated node(s):** `Config`, `Poll ComfyUI history API for the latest output matching filename prefix.`, `Fallback: submit workflow via ComfyUI HTTP API and poll for result.`, `Generate a character avatar using ComfyScript when possible, falling back to HTT`, `Generate image/video/audio media.` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `chat_websocket()` connect `AI Chat Pipeline & Memory` to `ComfyScript Media Generation`, `JWT Authentication Dependencies`, `SQLAlchemy Database Models`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `create_character()` connect `SQLAlchemy Database Models` to `Pydantic Schemas & Routers`, `ComfyScript Media Generation`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `get_current_user_ws()` connect `JWT Authentication Dependencies` to `AI Chat Pipeline & Memory`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `chat_websocket handler` (e.g. with `User model` and `Character model`) actually correct?**
  _`chat_websocket handler` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `User model` (e.g. with `register endpoint` and `login endpoint`) actually correct?**
  _`User model` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Config`, `Poll ComfyUI history API for the latest output matching filename prefix.`, `Fallback: submit workflow via ComfyUI HTTP API and poll for result.` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Components & Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._