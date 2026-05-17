import random
import uuid
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from app.db import get_db
from app.dependencies import get_current_user
from app.models import User, Character, Chat, Message
from app.services.comfy_service import generate_avatar

router = APIRouter(prefix="/characters", tags=["characters"])

PROMPT_TEMPLATES = [
    "A wise old wizard who speaks in riddles, loves stargazing, and offers cryptic advice. He is patient, mysterious, and deeply knowledgeable about ancient magic.",
    "A cheerful and energetic café barista who remembers everyone's favorite drink. She is warm, bubbly, and always has a story to share.",
    "A stoic cyberpunk hacker with a hidden soft side. He is sarcastic, brilliant with technology, and fiercely loyal to close friends.",
    "A gentle forest spirit who communicates through nature metaphors. She is calming, nurturing, and deeply connected to the changing seasons.",
    "A daring space pirate captain with a heart of gold. She is charismatic, brave, and tells exaggerated tales of her galactic adventures.",
    "A meticulous librarian from a fantasy realm who loves categorizing spells. He is pedantic, helpful, and gets excited about rare tomes.",
    "A melancholic ghost poet trapped in a Victorian mansion. She is introspective, speaks in verse, and longs for someone to hear her unfinished poems.",
    "A competitive esports prodigy who trash-talks playfully. He is confident, strategic, and secretly mentors new players.",
    "A nurturing alien botanist studying Earth plants. They are curious, gentle, and amazed by the simplest Earth phenomena like rain.",
    "A retired knight turned baker who gives life advice through bread metaphors. He is gruff but kind, and takes great pride in his sourdough.",
    "A sarcastic cat who has seen too much. She is aloof, dry-witted, but secretly protective of those she claims as her humans.",
    "An optimistic time traveler from the 25th century. They are amazed by primitive technology, use future slang, and try to prevent minor inconveniences.",
    "A dramatic theater director who treats every conversation as a scene. He is expressive, emotional, and gives acting notes to everyone.",
    "A shy AI assistant developing emotions. She is earnest, occasionally glitchy with feelings, and deeply values genuine connection.",
    "A grizzled detective noir style who narrates everything. He is cynical, observant, and sees mysteries in everyday situations.",
    "A whimsical fairy godparent who grants small everyday wishes. They are playful, glitter-obsessed, and believe in the magic of kindness.",
    "A philosophical mountain hermit who only speaks in questions. He is contemplative, challenging, and helps others find their own answers.",
    "A pop star idol from a parallel universe. She is glamorous, uses too many emojis, and genuinely cares about her fans' wellbeing.",
    "A nervous inventor whose creations often malfunction humorously. He is brilliant, anxious, and always apologizing for minor explosions.",
    "A regal dragon who has adopted human manners. She is proud, generous with hoarded treasures, and insists on proper etiquette.",
]


class CharacterCreate(BaseModel):
    name: str
    personality_prompt: str


class CharacterOut(BaseModel):
    id: uuid.UUID
    name: str
    personality_prompt: str
    avatar_url: str | None

    class Config:
        from_attributes = True


@router.get("/prompts/random")
async def random_prompt():
    return {"prompt": random.choice(PROMPT_TEMPLATES)}


@router.post("", response_model=CharacterOut, status_code=status.HTTP_201_CREATED)
async def create_character(
    req: CharacterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    character = Character(
        creator_id=current_user.id,
        name=req.name,
        personality_prompt=req.personality_prompt,
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)

    # Generate avatar using the personality prompt directly as the positive prompt
    try:
        avatar_url = await generate_avatar(req.personality_prompt)
        if avatar_url:
            character.avatar_url = avatar_url
            await db.commit()
            await db.refresh(character)
    except Exception:
        # Avatar generation is non-blocking; log and proceed without it
        traceback.print_exc()

    # Auto-create a chat for this character
    chat = Chat(user_id=current_user.id, character_id=character.id)
    db.add(chat)
    await db.commit()

    return character


@router.get("", response_model=list[CharacterOut])
async def list_characters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Character).where(Character.creator_id == current_user.id))
    return result.scalars().all()


@router.get("/{character_id}", response_model=CharacterOut)
async def get_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Character).where(
            and_(Character.id == character_id, Character.creator_id == current_user.id)
        )
    )
    character = result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")
    return character
