import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.db import get_db
from app.dependencies import get_current_user
from app.models import User, Chat, Message

router = APIRouter(prefix="/chats", tags=["chats"])


class ChatOut(BaseModel):
    id: uuid.UUID
    character_id: uuid.UUID
    character_name: str
    character_avatar_url: str | None
    updated_at: str | None

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    media_url: str | None
    media_type: str | None
    created_at: str | None

    class Config:
        from_attributes = True


@router.get("", response_model=list[ChatOut])
async def list_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == current_user.id)
        .options(selectinload(Chat.character))
        .order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()
    out = []
    for c in chats:
        out.append({
            "id": c.id,
            "character_id": c.character_id,
            "character_name": c.character.name,
            "character_avatar_url": c.character.avatar_url,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })
    return out


@router.get("/{chat_id}/messages", response_model=list[MessageOut])
async def get_messages(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chat)
        .where(and_(Chat.id == chat_id, Chat.user_id == current_user.id))
        .options(selectinload(Chat.messages))
    )
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    msgs = []
    for m in chat.messages:
        msgs.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "media_url": m.media_url,
            "media_type": m.media_type,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return msgs
