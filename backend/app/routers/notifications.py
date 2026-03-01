from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import Notification
from app.schemas import NotificationOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == UUID(current_user["id"]))
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == UUID(current_user["id"]),
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.read = True
    await db.flush()
    return {"message": "Marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == UUID(current_user["id"]),
            Notification.read == False,
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.read = True
    await db.flush()
    return {"message": f"Marked {len(notifications)} as read"}


@router.delete("/clear-read")
async def clear_read_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == UUID(current_user["id"]),
            Notification.read == True,
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        await db.delete(n)
    await db.flush()
    return {"message": f"Cleared {len(notifications)} notifications"}
