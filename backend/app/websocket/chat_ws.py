import asyncio
import json
import time
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.db import AsyncSessionLocal
from app.dependencies import get_current_user_ws
from app.models import Chat, Message, Character, User, Media
from app.services.memory_service import build_chat_context, extract_media_requests, replace_media_tags
from app.services.vllm_service import chat_completion
from app.services.comfy_service import generate_media, _generate_media_image_prompt


async def chat_websocket(websocket: WebSocket, chat_id: str, token: str):
    await websocket.accept()

    db: AsyncSession = AsyncSessionLocal()
    try:
        # Authenticate
        user = await get_current_user_ws(token, db)
        if not user:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close(code=4001)
            return

        # Verify chat ownership
        chat_uuid = uuid.UUID(chat_id)
        result = await db.execute(
            select(Chat)
            .where(and_(Chat.id == chat_uuid, Chat.user_id == user.id))
            .options(selectinload(Chat.character))
        )
        chat = result.scalar_one_or_none()
        if not chat:
            await websocket.send_json({"type": "error", "message": "Chat not found"})
            await websocket.close(code=4004)
            return

        character = chat.character
        user_bio = user.bio

        await websocket.send_json({"type": "connected", "chat_id": chat_id})

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = payload.get("type")
            if msg_type != "message":
                continue

            user_text = payload.get("content", "").strip()
            if not user_text:
                continue

            # Save user message
            user_msg = Message(chat_id=chat.id, role="user", content=user_text)
            db.add(user_msg)
            await db.commit()

            await websocket.send_json({
                "type": "user_message",
                "id": str(user_msg.id),
                "content": user_text,
                "created_at": user_msg.created_at.isoformat() if user_msg.created_at else None,
            })

            t0 = time.time()

            # Build context with memory
            context = await build_chat_context(
                db=db,
                chat=chat,
                character_personality=character.personality_prompt,
                user_bio=user_bio,
                new_user_message=user_text,
            )

            # Stream thinking indicator
            await websocket.send_json({"type": "typing", "status": "start"})

            # Get vLLM response
            try:
                thinking_mode = user.settings.thinking_mode if user.settings else True
                assistant_text = await chat_completion(
                    context,
                    max_tokens=512,
                    temperature=0.8,
                    thinking_mode=thinking_mode,
                )
            except Exception as e:
                await websocket.send_json({"type": "typing", "status": "stop"})
                await websocket.send_json({"type": "error", "message": f"AI response failed: {str(e)}"})
                continue
            t1 = time.time()
            print(f"[WS] vLLM response took {t1 - t0:.2f}s: {assistant_text[:200]}...")

            # Extract media requests — only process the FIRST one to avoid spam
            media_requests = extract_media_requests(assistant_text)
            print(f"[WS] Found {len(media_requests)} media requests: {media_requests}")

            media_replacements: list[tuple[str, str | None]] = []

            # Only process the first media request; ignore the rest
            for media_type, description in media_requests[:1]:
                await websocket.send_json({"type": "status", "message": f"Generating {media_type}..."})
                print(f"[WS] Generating {media_type} prompt for: {description}")
                # Generate a refined image prompt using vLLM with the full chat context
                image_prompt = await _generate_media_image_prompt(context, description)
                t2 = time.time()
                print(f"[WS] Media image prompt took {t2 - t1:.2f}s: {image_prompt[:200]}...")

                print(f"[WS] Calling generate_media for {media_type} with source_image={character.avatar_url}")
                media_url = await generate_media(
                    media_type,
                    image_prompt,
                    source_image_url=character.avatar_url,
                )
                t3 = time.time()
                print(f"[WS] generate_media returned in {t3 - t2:.2f}s: {media_url}")
                media_replacements.append((media_type, media_url))
                await websocket.send_json({"type": "status", "message": f"{media_type} generation done"})

                # If media generated, save media record
                if media_url:
                    media_record = Media(
                        chat_id=chat.id,
                        media_type=media_type,
                        prompt=image_prompt,
                        url=media_url,
                        status="completed",
                    )
                    db.add(media_record)

            # Replace tags in text
            final_text = replace_media_tags(assistant_text, media_replacements)
            print(f"[WS] Final text: {final_text[:300]}...")

            # Save assistant message
            # Find first media url if any, for media_url field
            first_media = next(((mt, url) for mt, url in media_replacements if url), None)
            assistant_msg = Message(
                chat_id=chat.id,
                role="assistant",
                content=final_text,
                media_url=first_media[1] if first_media else None,
                media_type=first_media[0] if first_media else None,
            )
            db.add(assistant_msg)
            await db.commit()
            await db.refresh(assistant_msg)

            await websocket.send_json({"type": "typing", "status": "stop"})

            t4 = time.time()
            print(f"[WS] Total turn took {t4 - t0:.2f}s")

            await websocket.send_json({
                "type": "assistant_message",
                "id": str(assistant_msg.id),
                "content": final_text,
                "media_url": assistant_msg.media_url,
                "media_type": assistant_msg.media_type,
                "created_at": assistant_msg.created_at.isoformat() if assistant_msg.created_at else None,
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        await db.close()
