from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db import get_db
from app.dependencies import get_current_user
from app.models import User, UserSettings

router = APIRouter(prefix="/users", tags=["users"])


class OnboardingRequest(BaseModel):
    bio: str | None = None


class SettingsRequest(BaseModel):
    thinking_mode: bool | None = None
    theme: str | None = None


@router.post("/onboarding")
async def onboarding(
    req: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.bio = req.bio or None
    current_user.onboarding_completed = True
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": str(current_user.id),
        "bio": current_user.bio,
        "onboarding_completed": current_user.onboarding_completed,
    }


@router.post("/onboarding/skip")
async def skip_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.onboarding_completed = True
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": str(current_user.id),
        "bio": current_user.bio,
        "onboarding_completed": current_user.onboarding_completed,
    }


@router.patch("/settings")
async def update_settings(
    req: SettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ensure settings row exists
    if not current_user.settings:
        current_user.settings = UserSettings(user_id=current_user.id)
        db.add(current_user.settings)

    if req.thinking_mode is not None:
        current_user.settings.thinking_mode = req.thinking_mode
    if req.theme is not None:
        current_user.settings.theme = req.theme
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": str(current_user.id),
        "thinking_mode": current_user.settings.thinking_mode,
        "theme": current_user.settings.theme,
    }
