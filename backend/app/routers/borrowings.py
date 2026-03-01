from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timezone

from app.database import get_db
from app.models import Borrowing, Book, Profile
from app.schemas import BorrowingOut, BorrowingCreate
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/borrowings", tags=["borrowings"])


def _map_borrowing(b, book, profile) -> dict:
    return {
        "id": b.id,
        "book_id": b.book_id,
        "user_id": b.user_id,
        "borrowed_at": b.borrowed_at,
        "due_date": b.due_date,
        "returned_at": b.returned_at,
        "issued_by": b.issued_by,
        "created_at": b.created_at,
        "book_title": book.title if book else None,
        "book_author": book.author if book else None,
        "member_name": profile.full_name if profile else None,
    }


@router.get("", response_model=List[BorrowingOut])
async def list_borrowings(
    status: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    book_id: Optional[UUID] = Query(None),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = (
        select(Borrowing, Book, Profile)
        .join(Book, Borrowing.book_id == Book.id, isouter=True)
        .join(Profile, Borrowing.user_id == Profile.id, isouter=True)
        .order_by(Borrowing.borrowed_at.desc())
        .limit(limit)
    )

    # Members can only see their own borrowings
    if current_user["role"] == "member":
        query = query.where(Borrowing.user_id == UUID(current_user["id"]))
    elif user_id:
        query = query.where(Borrowing.user_id == user_id)

    if book_id:
        query = query.where(Borrowing.book_id == book_id)

    if status == "active":
        query = query.where(Borrowing.returned_at.is_(None))
    elif status == "returned":
        query = query.where(Borrowing.returned_at.isnot(None))

    result = await db.execute(query)
    rows = result.all()

    items = [_map_borrowing(b, book, profile) for b, book, profile in rows]

    if status == "overdue":
        now = datetime.now(timezone.utc)
        items = [i for i in items if i["returned_at"] is None and i["due_date"] and i["due_date"] < now]

    return items


@router.post("", response_model=BorrowingOut)
async def create_borrowing(
    body: BorrowingCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    borrowing = Borrowing(
        book_id=body.book_id,
        user_id=body.user_id,
        due_date=datetime.fromisoformat(body.due_date),
        issued_by=body.issued_by,
    )
    db.add(borrowing)
    await db.flush()
    await db.refresh(borrowing)

    # Fetch related data for response
    book = (await db.execute(select(Book).where(Book.id == borrowing.book_id))).scalar_one_or_none()
    profile = (await db.execute(select(Profile).where(Profile.id == borrowing.user_id))).scalar_one_or_none()

    return _map_borrowing(borrowing, book, profile)


@router.put("/{borrowing_id}/return", response_model=BorrowingOut)
async def return_book(
    borrowing_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    result = await db.execute(select(Borrowing).where(Borrowing.id == borrowing_id))
    borrowing = result.scalar_one_or_none()
    if not borrowing:
        raise HTTPException(status_code=404, detail="Borrowing not found")

    if borrowing.returned_at:
        raise HTTPException(status_code=400, detail="Book already returned")

    borrowing.returned_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(borrowing)

    book = (await db.execute(select(Book).where(Book.id == borrowing.book_id))).scalar_one_or_none()
    profile = (await db.execute(select(Profile).where(Profile.id == borrowing.user_id))).scalar_one_or_none()

    return _map_borrowing(borrowing, book, profile)
