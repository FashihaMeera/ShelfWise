from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional, List

from app.database import get_db
from app.models import Reservation, Book, Profile
from app.schemas import ReservationOut, ReservationCreate, ReservationUpdate
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/reservations", tags=["reservations"])


@router.get("", response_model=List[ReservationOut])
async def list_reservations(
    status: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = (
        select(Reservation, Book, Profile)
        .join(Book, Reservation.book_id == Book.id, isouter=True)
        .join(Profile, Reservation.user_id == Profile.id, isouter=True)
        .order_by(Reservation.reserved_at.desc())
    )

    if current_user["role"] == "member":
        query = query.where(Reservation.user_id == UUID(current_user["id"]))
    elif user_id:
        query = query.where(Reservation.user_id == user_id)

    if status and status != "all":
        query = query.where(Reservation.status == status)

    result = await db.execute(query)
    return [
        ReservationOut(
            id=r.id, book_id=r.book_id, user_id=r.user_id,
            reserved_at=r.reserved_at, status=r.status,
            notified_at=r.notified_at, expires_at=r.expires_at,
            created_at=r.created_at,
            book_title=book.title if book else None,
            book_author=book.author if book else None,
            member_name=profile.full_name if profile else None,
        )
        for r, book, profile in result.all()
    ]


@router.post("", response_model=ReservationOut)
async def create_reservation(
    body: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    reservation = Reservation(book_id=body.book_id, user_id=body.user_id)
    db.add(reservation)
    await db.flush()
    await db.refresh(reservation)

    book = (await db.execute(select(Book).where(Book.id == reservation.book_id))).scalar_one_or_none()
    profile = (await db.execute(select(Profile).where(Profile.id == reservation.user_id))).scalar_one_or_none()

    return ReservationOut(
        id=reservation.id, book_id=reservation.book_id, user_id=reservation.user_id,
        reserved_at=reservation.reserved_at, status=reservation.status,
        notified_at=reservation.notified_at, expires_at=reservation.expires_at,
        created_at=reservation.created_at,
        book_title=book.title if book else None,
        book_author=book.author if book else None,
        member_name=profile.full_name if profile else None,
    )


@router.put("/{reservation_id}")
async def update_reservation(
    reservation_id: UUID,
    body: ReservationUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation.status = body.status
    await db.flush()
    return {"message": "Reservation updated"}


@router.delete("/{reservation_id}")
async def cancel_reservation(
    reservation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation.status = "cancelled"
    await db.flush()
    return {"message": "Reservation cancelled"}
