from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional, List

from app.database import get_db
from app.models import BookRequest, Profile
from app.schemas import BookRequestOut, BookRequestCreate
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/book-requests", tags=["book-requests"])


@router.get("", response_model=List[BookRequestOut])
async def list_book_requests(
    type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    query = (
        select(BookRequest, Profile)
        .join(Profile, BookRequest.user_id == Profile.id, isouter=True)
        .order_by(BookRequest.created_at.desc())
    )
    if type:
        query = query.where(BookRequest.type == type)

    result = await db.execute(query)
    return [
        BookRequestOut(
            id=r.id, user_id=r.user_id, title=r.title,
            author=r.author, reason=r.reason,
            type=r.type, status=r.status,
            created_at=r.created_at,
            member_name=p.full_name if p else None,
        )
        for r, p in result.all()
    ]


@router.post("")
async def create_book_request(
    body: BookRequestCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    req = BookRequest(
        user_id=body.user_id,
        title=body.title,
        author=body.author,
        reason=body.reason,
        type=body.type,
    )
    db.add(req)
    await db.flush()
    return {"message": "Request submitted"}


@router.put("/{request_id}")
async def update_book_request_status(
    request_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    result = await db.execute(select(BookRequest).where(BookRequest.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = body.get("status", req.status)
    await db.flush()
    return {"message": "Status updated"}
