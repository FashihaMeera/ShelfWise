from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from typing import List

from app.database import get_db
from app.models import Borrowing, Book, Profile
from app.schemas import BorrowingTrend, PopularBook, OverdueItem, GenreDistItem, LeaderboardEntry
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/borrowing-trends", response_model=List[BorrowingTrend])
async def borrowing_trends(
    days: int = Query(30),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Borrowing.borrowed_at, Borrowing.returned_at)
        .where(Borrowing.borrowed_at >= start_date)
    )
    borrowings = result.all()

    # Build daily data
    trends = {}
    for i in range(days + 1):
        day = start_date + timedelta(days=i)
        date_str = day.strftime("%Y-%m-%d")
        label = day.strftime("%b %d" if days <= 31 else "%b %d")
        trends[date_str] = {"date": label, "borrowed": 0, "returned": 0}

    for borrowed_at, returned_at in borrowings:
        if borrowed_at:
            key = borrowed_at.strftime("%Y-%m-%d")
            if key in trends:
                trends[key]["borrowed"] += 1
        if returned_at:
            key = returned_at.strftime("%Y-%m-%d")
            if key in trends:
                trends[key]["returned"] += 1

    return list(trends.values())


@router.get("/popular-books", response_model=List[PopularBook])
async def popular_books(
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Borrowing.book_id, Book.title, Book.author, func.count(Borrowing.id).label("cnt"))
        .join(Book, Borrowing.book_id == Book.id)
        .group_by(Borrowing.book_id, Book.title, Book.author)
        .order_by(func.count(Borrowing.id).desc())
        .limit(limit)
    )
    return [
        PopularBook(title=title, author=author, count=cnt)
        for _, title, author, cnt in result.all()
    ]


@router.get("/overdue", response_model=List[OverdueItem])
async def overdue_report(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Borrowing, Book, Profile)
        .join(Book, Borrowing.book_id == Book.id, isouter=True)
        .join(Profile, Borrowing.user_id == Profile.id, isouter=True)
        .where(Borrowing.returned_at.is_(None), Borrowing.due_date < now)
        .order_by(Borrowing.due_date.asc())
    )
    return [
        OverdueItem(
            id=b.id,
            book_title=book.title if book else "Unknown",
            book_author=book.author if book else "",
            member_name=profile.full_name if profile else "Unknown",
            due_date=b.due_date.strftime("%Y-%m-%d") if b.due_date else "",
            days_overdue=(now - b.due_date).days if b.due_date else 0,
        )
        for b, book, profile in result.all()
    ]


@router.get("/genre-distribution", response_model=List[GenreDistItem])
async def genre_distribution(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Book.genre, Book.total_copies))
    genre_map = {}
    for genre, total_copies in result.all():
        g = genre or "Uncategorized"
        genre_map[g] = genre_map.get(g, 0) + (total_copies or 0)

    return sorted(
        [GenreDistItem(name=k, value=v) for k, v in genre_map.items()],
        key=lambda x: x.value,
        reverse=True,
    )


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def leaderboard(
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    # Count returned books per user
    result = await db.execute(
        select(Borrowing.user_id, func.count(Borrowing.id).label("cnt"))
        .where(Borrowing.returned_at.isnot(None))
        .group_by(Borrowing.user_id)
        .order_by(func.count(Borrowing.id).desc())
        .limit(limit)
    )
    rows = result.all()

    if not rows:
        return []

    user_ids = [r[0] for r in rows]
    profiles = (await db.execute(
        select(Profile).where(Profile.id.in_(user_ids))
    )).scalars().all()
    profile_map = {str(p.id): p for p in profiles}

    return [
        LeaderboardEntry(
            rank=idx + 1,
            userId=uid,
            name=profile_map.get(str(uid), None) and profile_map[str(uid)].full_name or "Unknown",
            avatar=profile_map.get(str(uid), None) and profile_map[str(uid)].avatar_url,
            booksRead=cnt,
        )
        for idx, (uid, cnt) in enumerate(rows)
    ]
