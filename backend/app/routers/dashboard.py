from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.database import get_db
from app.models import Book, Profile, Borrowing
from app.schemas import DashboardStats
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    total_books = (await db.execute(select(func.count(Book.id)))).scalar() or 0
    active_members = (await db.execute(select(func.count(Profile.id)))).scalar() or 0

    # Get all borrowings for today count and overdue count
    borrowings = (await db.execute(
        select(Borrowing.id, Borrowing.borrowed_at, Borrowing.due_date, Borrowing.returned_at)
    )).all()

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    borrowed_today = sum(
        1 for b in borrowings
        if b.borrowed_at and b.borrowed_at.strftime("%Y-%m-%d") == today_str
    )
    overdue_items = sum(
        1 for b in borrowings
        if not b.returned_at and b.due_date and b.due_date < now
    )

    return DashboardStats(
        totalBooks=total_books,
        activeMembers=active_members,
        borrowedToday=borrowed_today,
        overdueItems=overdue_items,
    )
