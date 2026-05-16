from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.db import get_db
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])


class OnboardingRequest(BaseModel):
    bio: str | None = None


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
