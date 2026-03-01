from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import Waitlist, Profile
from app.schemas import WaitlistOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


@router.get("/{book_id}", response_model=List[WaitlistOut])
async def get_waitlist(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Waitlist, Profile)
        .join(Profile, Waitlist.user_id == Profile.id, isouter=True)
        .where(Waitlist.book_id == book_id)
        .order_by(Waitlist.position.asc())
    )
    return [
        WaitlistOut(
            id=w.id, book_id=w.book_id, user_id=w.user_id,
            position=w.position, notified=w.notified,
            created_at=w.created_at,
            member_name=p.full_name if p else None,
        )
        for w, p in result.all()
    ]


@router.post("")
async def join_waitlist(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    book_id = UUID(body["book_id"])
    user_id = UUID(body["user_id"])

    # Get current max position
    result = await db.execute(
        select(func.max(Waitlist.position)).where(Waitlist.book_id == book_id)
    )
    max_pos = result.scalar() or 0

    entry = Waitlist(book_id=book_id, user_id=user_id, position=max_pos + 1)
    db.add(entry)
    await db.flush()
    return {"message": "Added to waitlist"}


@router.delete("/{book_id}/{user_id}")
async def leave_waitlist(
    book_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Waitlist).where(Waitlist.book_id == book_id, Waitlist.user_id == user_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Not on waitlist")

    await db.delete(entry)
    return {"message": "Removed from waitlist"}
