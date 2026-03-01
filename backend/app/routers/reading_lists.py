from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import ReadingList, Book
from app.schemas import ReadingListOut, BookOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/reading-lists", tags=["reading-lists"])


@router.get("", response_model=List[ReadingListOut])
async def get_reading_list(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ReadingList, Book)
        .join(Book, ReadingList.book_id == Book.id, isouter=True)
        .where(ReadingList.user_id == UUID(current_user["id"]))
        .order_by(ReadingList.created_at.desc())
    )
    return [
        ReadingListOut(
            id=rl.id, user_id=rl.user_id, book_id=rl.book_id,
            created_at=rl.created_at,
            books=BookOut.model_validate(book) if book else None,
        )
        for rl, book in result.all()
    ]


@router.post("")
async def add_to_reading_list(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    book_id = UUID(body["book_id"])
    user_id = UUID(current_user["id"])

    entry = ReadingList(user_id=user_id, book_id=book_id)
    db.add(entry)
    await db.flush()
    return {"message": "Added to reading list"}


@router.delete("/{book_id}")
async def remove_from_reading_list(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = UUID(current_user["id"])
    result = await db.execute(
        select(ReadingList).where(
            and_(ReadingList.user_id == user_id, ReadingList.book_id == book_id)
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found in reading list")

    await db.delete(entry)
    return {"message": "Removed from reading list"}
