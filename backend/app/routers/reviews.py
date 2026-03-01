from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import BookReview, Profile
from app.schemas import ReviewOut, ReviewCreate
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("/{book_id}", response_model=List[ReviewOut])
async def list_reviews(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(BookReview, Profile)
        .join(Profile, BookReview.user_id == Profile.id, isouter=True)
        .where(BookReview.book_id == book_id)
        .order_by(BookReview.created_at.desc())
    )
    return [
        ReviewOut(
            id=r.id, book_id=r.book_id, user_id=r.user_id,
            rating=r.rating, review_text=r.review_text,
            created_at=r.created_at, updated_at=r.updated_at,
            reviewer_name=p.full_name if p else "Anonymous",
            reviewer_avatar=p.avatar_url if p else None,
        )
        for r, p in result.all()
    ]


@router.post("", response_model=ReviewOut)
async def create_review(
    body: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    review = BookReview(
        book_id=body.book_id,
        user_id=body.user_id,
        rating=body.rating,
        review_text=body.review_text,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)

    return ReviewOut(
        id=review.id, book_id=review.book_id, user_id=review.user_id,
        rating=review.rating, review_text=review.review_text,
        created_at=review.created_at, updated_at=review.updated_at,
        reviewer_name=current_user.get("full_name", "Anonymous"),
        reviewer_avatar=current_user.get("avatar_url"),
    )


@router.delete("/{review_id}")
async def delete_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(BookReview).where(BookReview.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Users can only delete their own reviews (staff can delete any)
    if str(review.user_id) != current_user["id"] and current_user["role"] == "member":
        raise HTTPException(status_code=403, detail="Not allowed")

    await db.delete(review)
    return {"message": "Review deleted"}
