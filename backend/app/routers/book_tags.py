from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import BookTag
from app.schemas import BookTagOut, BookTagCreate
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/book-tags", tags=["book-tags"])


@router.get("/{book_id}", response_model=List[BookTagOut])
async def list_book_tags(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(BookTag).where(BookTag.book_id == book_id).order_by(BookTag.tag)
    )
    return result.scalars().all()


@router.get("/all/unique", response_model=List[str])
async def list_all_tags(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(BookTag.tag).distinct().order_by(BookTag.tag))
    return [row[0] for row in result.all()]


@router.post("", response_model=BookTagOut)
async def add_book_tag(
    body: BookTagCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    tag = BookTag(book_id=body.book_id, tag=body.tag.strip().lower())
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
async def remove_book_tag(
    tag_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    result = await db.execute(select(BookTag).where(BookTag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    return {"message": "Tag removed"}
