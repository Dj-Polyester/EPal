# Graph Report - .  (2026-05-17)

## Corpus Check
- 57 files · ~12,145 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 387 nodes · 525 edges · 79 communities (41 shown, 38 thin omitted)
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend React App|Frontend React App]]
- [[_COMMUNITY_Backend Core API|Backend Core API]]
- [[_COMMUNITY_Infrastructure & Deployment|Infrastructure & Deployment]]
- [[_COMMUNITY_Auth & User Endpoints|Auth & User Endpoints]]
- [[_COMMUNITY_Frontend Logic & Requirements|Frontend Logic & Requirements]]
- [[_COMMUNITY_Frontend Architecture|Frontend Architecture]]
- [[_COMMUNITY_ComfyUI Media Generation|ComfyUI Media Generation]]
- [[_COMMUNITY_Chat & AI Services|Chat & AI Services]]
- [[_COMMUNITY_Data Models & Characters|Data Models & Characters]]
- [[_COMMUNITY_Domain Models|Domain Models]]
- [[_COMMUNITY_AI Pipeline Services|AI Pipeline Services]]
- [[_COMMUNITY_ComfyUI Workflows|ComfyUI Workflows]]
- [[_COMMUNITY_Auth Request Models|Auth Request Models]]
- [[_COMMUNITY_Database Schema|Database Schema]]
- [[_COMMUNITY_App Configuration|App Configuration]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_Initial Migration|Initial Migration]]
- [[_COMMUNITY_Database Session|Database Session]]
- [[_COMMUNITY_Auth Guards|Auth Guards]]
- [[_COMMUNITY_User Onboarding|User Onboarding]]
- [[_COMMUNITY_Migration Operations|Migration Operations]]
- [[_COMMUNITY_Character Creation|Character Creation]]
- [[_COMMUNITY_Vite Proxy Config|Vite Proxy Config]]
- [[_COMMUNITY_WebSocket Handlers|WebSocket Handlers]]
- [[_COMMUNITY_Frontend Styling|Frontend Styling]]
- [[_COMMUNITY_Health Check|Health Check]]
- [[_COMMUNITY_Settings Getter|Settings Getter]]
- [[_COMMUNITY_Auth DTO Models|Auth DTO Models]]
- [[_COMMUNITY_Auth DTO Models|Auth DTO Models]]
- [[_COMMUNITY_Auth DTO Models|Auth DTO Models]]
- [[_COMMUNITY_Auth DTO Models|Auth DTO Models]]
- [[_COMMUNITY_Auth DTO Models|Auth DTO Models]]
- [[_COMMUNITY_Character Features|Character Features]]
- [[_COMMUNITY_API Response Models|API Response Models]]
- [[_COMMUNITY_API Response Models|API Response Models]]
- [[_COMMUNITY_API Response Models|API Response Models]]
- [[_COMMUNITY_API Response Models|API Response Models]]
- [[_COMMUNITY_Migration Offline|Migration Offline]]
- [[_COMMUNITY_App Routes|App Routes]]
- [[_COMMUNITY_Auth UI Pages|Auth UI Pages]]
- [[_COMMUNITY_Auth UI Pages|Auth UI Pages]]
- [[_COMMUNITY_Frontend Startup|Frontend Startup]]
- [[_COMMUNITY_Health Endpoint|Health Endpoint]]
- [[_COMMUNITY_Password Utils|Password Utils]]
- [[_COMMUNITY_Password Utils|Password Utils]]
- [[_COMMUNITY_Auth Me Endpoint|Auth Me Endpoint]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]
- [[_COMMUNITY_ComfyUI Model Configs|ComfyUI Model Configs]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 17 edges
2. `chat_websocket handler` - 12 edges
3. `User model` - 10 edges
4. `API Client` - 10 edges
5. `App Router` - 10 edges
6. `generate_avatar()` - 9 edges
7. `generate_media()` - 9 edges
8. `chat_websocket()` - 9 edges
9. `Chat model` - 9 edges
10. `Docker Compose Backend Service` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Docker Compose vLLM Service` --semantically_similar_to--> `Serve LLM PowerShell Script`  [INFERRED] [semantically similar]
  docker-compose.yml → serve_llm.ps1
- `Docker Compose Backend Service` --semantically_similar_to--> `Start Backend PowerShell Script`  [INFERRED] [semantically similar]
  docker-compose.yml → start_backend.ps1
- `Docker Compose ComfyUI Service` --semantically_similar_to--> `Start ComfyUI PowerShell Script`  [INFERRED] [semantically similar]
  docker-compose.yml → start_comfyui.ps1
- `run_migrations_online` --references--> `Docker Compose Backend Service`  [INFERRED]
  backend/alembic/env.py → docker-compose.yml
- `Scalability Design` --rationale_for--> `FastAPI Application`  [INFERRED]
  README.md → backend/app/main.py

## Hyperedges (group relationships)
- **Docker Compose Full Stack** — docker_compose_postgres, docker_compose_redis, docker_compose_vllm, docker_compose_comfyui, docker_compose_backend [INFERRED 0.85]
- **Database Domain Model** — user_model, character_model, chat_model, message_model, media_model [INFERRED 0.90]
- **JWT Authentication Flow** — create_access_token, create_refresh_token, decode_token, get_current_user, get_current_user_ws [INFERRED 0.90]
- **WebSocket Chat Processing Pipeline** — websocket:chat_websocket, memory_service:build_chat_context, vllm_service:chat_completion, memory_service:extract_media_requests, comfy_service:generate_media, memory_service:replace_media_tags [INFERRED 0.85]
- **Auth Token Issuance Flow** — auth:register, auth:login, auth:refresh, auth:TokenResponse [INFERRED 0.80]
- **ComfyUI Image Generation Workflows** — comfy_service:generate_avatar, comfy_service:generate_media, comfy_service:_CHARGEN_WORKFLOW, comfy_service:_CHAREDIT_WORKFLOW [INFERRED 0.85]
- **Authentication Flow** — login_component, register_component, auth_provider, api_client [INFERRED 0.85]
- **Onboarding Flow** — welcome_screen, app_require_onboarding, dashboard [INFERRED 0.80]
- **Real-time Chat Architecture** — chat_room, chat_room_ws_handler, api_client [INFERRED 0.85]

## Communities (79 total, 38 thin omitted)

### Community 0 - "Frontend React App"
Cohesion: 0.12
Nodes (20): client, refreshToken, token, Login(), Register(), CharacterCreate(), ChatRoom(), Message (+12 more)

### Community 1 - "Backend Core API"
Cohesion: 0.12
Nodes (32): login endpoint, me endpoint, refresh endpoint, register endpoint, Character model, create_character endpoint, get_character endpoint, list_characters endpoint (+24 more)

### Community 2 - "Infrastructure & Deployment"
Cohesion: 0.09
Nodes (31): Alembic Environment Configuration, renderContent, Create Access Token, Create Refresh Token, Cross-Platform Design, SQLAlchemy declarative base, Async Database Engine, Do Run Migrations (+23 more)

### Community 3 - "Auth & User Endpoints"
Cohesion: 0.13
Nodes (22): create_access_token(), create_refresh_token(), decode_token(), get_current_user(), get_current_user_ws(), hash_password(), verify_password(), BaseModel (+14 more)

### Community 4 - "Frontend Logic & Requirements"
Cohesion: 0.12
Nodes (24): AuthProvider, fetchMe, login, logout, register, handleRandomize, handleSubmit, ChatRoom (+16 more)

### Community 5 - "Frontend Architecture"
Cohesion: 0.16
Nodes (24): API Client, RequireAuth Guard, RequireOnboarding Guard, App Router, Authentication Context, AuthProvider Component, User Model, Character Creation Page (+16 more)

### Community 6 - "ComfyUI Media Generation"
Cohesion: 0.14
Nodes (22): _build_txt2img_workflow(), _ensure_comfy(), _ensure_image_in_input(), _generate_audio_stub(), generate_avatar(), _generate_image(), _generate_image_prompt(), generate_media() (+14 more)

### Community 7 - "Chat & AI Services"
Cohesion: 0.12
Nodes (13): websocket_chat(), Media, build_chat_context(), extract_media_requests(), Build the message list for vLLM including system prompt, memory, and recent hist, Extract media generation tags from assistant response.     Returns list of (medi, Replace media tags with either a URL or a 'not available' message., replace_media_tags() (+5 more)

### Community 8 - "Data Models & Characters"
Cohesion: 0.12
Nodes (12): Base, Character, Chat, Message, User, CharacterCreate, CharacterOut, Config (+4 more)

### Community 9 - "Domain Models"
Cohesion: 0.24
Nodes (17): Async Session Local, Character SQLAlchemy Model, Characters API Router, Chat SQLAlchemy Model, Chats API Router, ComfyScript Media Generation, Decode Token, Generate Avatar Service (+9 more)

### Community 10 - "AI Pipeline Services"
Cohesion: 0.17
Nodes (16): _CHAREDIT_WORKFLOW template, _CHARGEN_WORKFLOW template, _ensure_image_in_input helper, _generate_image_prompt helper, _run_workflow_http helper, generate_avatar public API, generate_media public API, CONTEXT_WINDOW constant (+8 more)

### Community 11 - "ComfyUI Workflows"
Cohesion: 0.31
Nodes (9): _build_txt2img_workflow, _ensure_comfy, _generate_audio_stub, generate_avatar, _generate_image, generate_media, _generate_video_stub, _poll_output (+1 more)

### Community 12 - "Auth Request Models"
Cohesion: 0.38
Nodes (7): LoginRequest Pydantic Model, RefreshRequest Pydantic Model, RegisterRequest Pydantic Model, TokenResponse Pydantic Model, login endpoint, refresh endpoint, register endpoint

### Community 13 - "Database Schema"
Cohesion: 0.33
Nodes (6): Characters Table Schema, Chats Table Schema, Initial Alembic Migration, Media Table Schema, Messages Table Schema, Users Table Schema

### Community 14 - "App Configuration"
Cohesion: 0.5
Nodes (4): Config, get_settings(), Settings, BaseSettings

### Community 15 - "Database Migrations"
Cohesion: 0.6
Nodes (3): do_run_migrations(), run_migrations_offline(), run_migrations_online()

### Community 16 - "Initial Migration"
Cohesion: 0.6
Nodes (3): downgrade(), Initial migration  Revision ID: 001 Revises: Create Date: 2025-05-14 00:00:00.00, upgrade()

### Community 18 - "Auth Guards"
Cohesion: 1.0
Nodes (3): RequireAuth, RequireOnboarding, useAuth

### Community 19 - "User Onboarding"
Cohesion: 0.67
Nodes (3): OnboardingRequest Pydantic Model, onboarding endpoint, skip_onboarding endpoint

## Knowledge Gaps
- **106 isolated node(s):** `Config`, `Poll ComfyUI history API for the latest output matching filename prefix.`, `Fallback: submit workflow via ComfyUI HTTP API and poll for result.`, `Generate a character avatar using ComfyScript when possible, falling back to HTT`, `Generate image/video/audio media.` (+101 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `chat_websocket()` connect `Chat & AI Services` to `Auth & User Endpoints`, `ComfyUI Media Generation`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `create_character()` connect `Data Models & Characters` to `ComfyUI Media Generation`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `generate_avatar()` connect `ComfyUI Media Generation` to `Data Models & Characters`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `chat_websocket handler` (e.g. with `User model` and `Character model`) actually correct?**
  _`chat_websocket handler` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `User model` (e.g. with `get_current_user` and `get_current_user_ws`) actually correct?**
  _`User model` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Config`, `Poll ComfyUI history API for the latest output matching filename prefix.`, `Fallback: submit workflow via ComfyUI HTTP API and poll for result.` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend React App` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._