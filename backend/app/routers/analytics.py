from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import Book, Borrowing, BookReview, Profile
from app.schemas import BookAnalytics, MemberReadingAnalytics
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/books", response_model=list[BookAnalytics])
async def get_book_analytics(
    genre: str = None,
    sort_by: str = "borrows",  # borrows, rating, recently_borrowed
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Get analytics for books - popularity, ratings, borrow trends"""
    query = select(Book).order_by(Book.created_at.desc())

    if genre:
        query = query.where(Book.genre == genre)

    result = await db.execute(query)
    books = result.scalars().all()

    analytics = []
    for book in books:
        # Get borrowing stats
        borrow_result = await db.execute(
            select(Borrowing).where(Borrowing.book_id == book.id)
        )
        borrowings = borrow_result.scalars().all()
        total_borrows = len(borrowings)
        completed_borrows = len([b for b in borrowings if b.returned_at])

        # Calculate average borrow duration
        avg_days = None
        if completed_borrows > 0:
            total_days = sum(
                (b.returned_at - b.borrowed_at).days
                for b in borrowings if b.returned_at
            )
            avg_days = total_days / completed_borrows

        # Get last 30 days borrowing
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_borrows = len([
            b for b in borrowings
            if b.borrowed_at >= thirty_days_ago
        ])

        # Get ratings
        review_result = await db.execute(
            select(BookReview).where(BookReview.book_id == book.id)
        )
        reviews = review_result.scalars().all()
        avg_rating = None
        if reviews:
            avg_rating = sum(r.rating for r in reviews) / len(reviews)

        analytics.append(BookAnalytics(
            id=book.id,
            title=book.title,
            author=book.author,
            genre=book.genre,
            total_borrows=total_borrows,
            completed_borrows=completed_borrows,
            avg_borrow_days=avg_days,
            borrows_last_30_days=recent_borrows,
            avg_rating=round(avg_rating, 2) if avg_rating else None,
            review_count=len(reviews)
        ))

    # Sort results
    if sort_by == "rating":
        analytics.sort(key=lambda x: x.avg_rating or 0, reverse=True)
    elif sort_by == "recently_borrowed":
        analytics.sort(key=lambda x: x.borrows_last_30_days, reverse=True)
    else:
        analytics.sort(key=lambda x: x.total_borrows, reverse=True)

    return analytics


@router.get("/members", response_model=list[MemberReadingAnalytics])
async def get_member_analytics(
    top_n: int = 50,
    sort_by: str = "books_borrowed",  # books_borrowed, recently_active
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get reading analytics for members"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can view member analytics")

    result = await db.execute(select(Profile).limit(1000))
    profiles = result.scalars().all()

    analytics = []
    for profile in profiles:
        # Get borrowing stats
        borrow_result = await db.execute(
            select(Borrowing).where(Borrowing.user_id == profile.id)
        )
        borrowings = borrow_result.scalars().all()

        total_borrowed = len(borrowings)
        returned = len([b for b in borrowings if b.returned_at])
        currently_borrowed = len([b for b in borrowings if not b.returned_at])

        # Last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_borrows = len([
            b for b in borrowings if b.borrowed_at >= thirty_days_ago
        ])

        # Get reviews and ratings
        review_result = await db.execute(
            select(BookReview).where(BookReview.user_id == profile.id)
        )
        reviews = review_result.scalars().all()
        avg_rating = None
        if reviews:
            avg_rating = sum(r.rating for r in reviews) / len(reviews)

        analytics.append(MemberReadingAnalytics(
            id=profile.id,
            full_name=profile.full_name,
            total_books_borrowed=total_borrowed,
            books_returned=returned,
            books_currently_borrowed=currently_borrowed,
            books_borrowed_last_30_days=recent_borrows,
            avg_books_rating=round(avg_rating, 2) if avg_rating else None,
            books_reviewed=len(reviews)
        ))

    # Sort
    if sort_by == "recently_active":
        analytics.sort(key=lambda x: x.books_borrowed_last_30_days, reverse=True)
    else:
        analytics.sort(key=lambda x: x.total_books_borrowed, reverse=True)

    return analytics[:top_n]


@router.get("/dashboard")
async def get_dashboard_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get dashboard override with key metrics"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can view analytics")

    # Total books
    books_result = await db.execute(select(func.count(Book.id)))
    total_books = books_result.scalar()

    # Total members
    members_result = await db.execute(select(func.count(Profile.id)))
    total_members = members_result.scalar()

    # Active borrowings
    active_borrow = await db.execute(
        select(func.count(Borrowing.id)).where(Borrowing.returned_at == None)
    )
    active_borrowings = active_borrow.scalar()

    # Borrowed this month
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    monthly_borrow = await db.execute(
        select(func.count(Borrowing.id)).where(Borrowing.borrowed_at >= thirty_days_ago)
    )
    monthly_borrows = monthly_borrow.scalar()

    # Top 5 most borrowed books
    borrow_counts = await db.execute(
        select(Book.title, Book.author, func.count(Borrowing.id).label("count"))
        .join(Borrowing, Book.id == Borrowing.book_id)
        .group_by(Book.id, Book.title, Book.author)
        .order_by(func.count(Borrowing.id).desc())
        .limit(5)
    )
    top_books = [
        {"title": title, "author": author, "count": count}
        for title, author, count in borrow_counts
    ]

    # Genre distribution
    genre_dist = await db.execute(
        select(Book.genre, func.count(Book.id).label("count"))
        .group_by(Book.genre)
        .order_by(func.count(Book.id).desc())
    )
    genres = [
        {"name": genre or "Unknown", "count": count}
        for genre, count in genre_dist
    ]

    # Member reading patterns (top readers)
    top_readers = await db.execute(
        select(Profile.full_name, func.count(Borrowing.id).label("count"))
        .join(Borrowing, Profile.id == Borrowing.user_id)
        .group_by(Profile.id, Profile.full_name)
        .order_by(func.count(Borrowing.id).desc())
        .limit(10)
    )
    readers = [
        {"name": name, "books": count}
        for name, count in top_readers
    ]

    return {
        "total_books": total_books,
        "total_members": total_members,
        "active_borrowings": active_borrowings,
        "borrowed_this_month": monthly_borrows,
        "top_books": top_books,
        "genre_distribution": genres,
        "top_readers": readers,
    }


@router.get("/genre-trends")
async def get_genre_trends(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get genre trends - which genres are most borrowed"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can view analytics")

    result = await db.execute(
        select(Book.genre, func.count(Borrowing.id).label("borrows"))
        .join(Borrowing, Book.id == Borrowing.book_id)
        .group_by(Book.genre)
        .order_by(func.count(Borrowing.id).desc())
    )

    trends = [
        {
            "genre": genre or "Unknown",
            "total_borrows": borrows,
        }
        for genre, borrows in result
    ]

    return trends
