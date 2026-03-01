"""
Background service: Check for overdue books and create notifications.
Called periodically by APScheduler.
"""
from sqlalchemy import select, and_
from datetime import datetime, timezone, timedelta
from app.database import async_session
from app.models import Borrowing, Book, Notification, Profile


async def check_overdue_books():
    """Find overdue borrowings and create notifications (with dedup)."""
    async with async_session() as db:
        try:
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            # Find overdue borrowings
            result = await db.execute(
                select(Borrowing, Book)
                .join(Book, Borrowing.book_id == Book.id)
                .where(
                    Borrowing.returned_at.is_(None),
                    Borrowing.due_date < now,
                )
            )
            overdue = result.all()

            for borrowing, book in overdue:
                # Check if we already notified today
                existing = await db.execute(
                    select(Notification).where(
                        and_(
                            Notification.user_id == borrowing.user_id,
                            Notification.type == "overdue_reminder",
                            Notification.created_at >= today_start,
                            Notification.title.ilike(f"%{book.title}%"),
                        )
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                days_overdue = (now - borrowing.due_date).days
                notification = Notification(
                    user_id=borrowing.user_id,
                    title=f"Overdue: {book.title}",
                    message=f"This book is {days_overdue} day(s) overdue. Please return it as soon as possible.",
                    type="overdue_reminder",
                    link=f"/books/{book.id}",
                )
                db.add(notification)

            await db.commit()
            print(f"[Overdue Check] Processed {len(overdue)} overdue borrowings")
        except Exception as e:
            await db.rollback()
            print(f"[Overdue Check] Error: {e}")
