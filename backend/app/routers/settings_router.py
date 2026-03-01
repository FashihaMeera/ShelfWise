from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict
from datetime import datetime, timezone

from app.database import get_db
from app.models import LibrarySetting
from app.schemas import SettingUpdate
from app.auth.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=Dict[str, str])
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(LibrarySetting))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.put("/{key}")
async def update_setting(
    key: str,
    body: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin()),
):
    result = await db.execute(select(LibrarySetting).where(LibrarySetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting.value = body.value
    setting.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Setting updated"}
