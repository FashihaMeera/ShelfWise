from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional, List

from app.database import get_db
from app.models import Fine, Borrowing, Book, Profile
from app.schemas import FineOut
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/fines", tags=["fines"])


@router.get("", response_model=List[FineOut])
async def list_fines(
    user_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = (
        select(Fine, Borrowing, Book, Profile)
        .join(Borrowing, Fine.borrowing_id == Borrowing.id, isouter=True)
        .join(Book, Borrowing.book_id == Book.id, isouter=True)
        .join(Profile, Borrowing.user_id == Profile.id, isouter=True)
        .order_by(Fine.created_at.desc())
    )

    if current_user["role"] == "member":
        query = query.where(Fine.user_id == UUID(current_user["id"]))
    elif user_id:
        query = query.where(Fine.user_id == user_id)

    result = await db.execute(query)
    return [
        FineOut(
            id=f.id,
            borrowing_id=f.borrowing_id,
            user_id=f.user_id,
            amount=float(f.amount),
            paid=f.paid,
            waived=f.waived,
            waived_by=f.waived_by,
            created_at=f.created_at,
            book_title=book.title if book else "Unknown",
            member_name=profile.full_name if profile else "Unknown",
        )
        for f, borrowing, book, profile in result.all()
    ]


@router.put("/{fine_id}/waive")
async def waive_fine(
    fine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_staff()),
):
    result = await db.execute(select(Fine).where(Fine.id == fine_id))
    fine = result.scalar_one_or_none()
    if not fine:
        raise HTTPException(status_code=404, detail="Fine not found")

    fine.waived = True
    fine.waived_by = UUID(current_user["id"])
    await db.flush()
    return {"message": "Fine waived"}


@router.put("/{fine_id}/pay")
async def mark_fine_paid(
    fine_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_staff()),
):
    result = await db.execute(select(Fine).where(Fine.id == fine_id))
    fine = result.scalar_one_or_none()
    if not fine:
        raise HTTPException(status_code=404, detail="Fine not found")

    fine.paid = True
    await db.flush()
    return {"message": "Fine marked as paid"}
