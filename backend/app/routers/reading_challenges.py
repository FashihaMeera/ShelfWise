from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import ReadingChallenge, Borrowing
from app.schemas import ReadingChallengeOut, ReadingChallengeCreate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/reading-challenges", tags=["reading-challenges"])


@router.get("", response_model=List[ReadingChallengeOut])
async def list_challenges(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ReadingChallenge)
        .where(ReadingChallenge.user_id == UUID(current_user["id"]))
        .order_by(ReadingChallenge.created_at.desc())
    )
    return result.scalars().all()


@router.get("/books-count")
async def books_read_in_range(
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count(Borrowing.id))
        .where(
            Borrowing.user_id == UUID(current_user["id"]),
            Borrowing.returned_at.isnot(None),
            Borrowing.returned_at >= start_date,
            Borrowing.returned_at <= end_date + "T23:59:59",
        )
    )
    count = result.scalar() or 0
    return {"count": count}


@router.post("")
async def create_challenge(
    body: ReadingChallengeCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    challenge = ReadingChallenge(
        user_id=body.user_id,
        title=body.title,
        target_books=body.target_books,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(challenge)
    await db.flush()
    return {"message": "Challenge created"}


@router.delete("/{challenge_id}")
async def delete_challenge(
    challenge_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(ReadingChallenge).where(ReadingChallenge.id == challenge_id))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if str(challenge.user_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    await db.delete(challenge)
    return {"message": "Challenge deleted"}
