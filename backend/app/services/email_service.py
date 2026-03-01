"""
Email service using Resend API for due-date reminders and overdue alerts.
"""
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.database import async_session
from app.models import Borrowing, Book, User
from app.config import get_settings


async def send_email(to: str, subject: str, html: str):
    """Send an email via Resend API."""
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        print(f"[Email] Skipping (no API key): {subject} -> {to}")
        return

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "ShelfWise <noreply@yourdomain.com>",
                "to": [to],
                "subject": subject,
                "html": html,
            },
        )
        if resp.status_code == 200:
            print(f"[Email] Sent: {subject} -> {to}")
        else:
            print(f"[Email] Failed ({resp.status_code}): {resp.text}")


async def send_due_date_reminders():
    """Send email reminders for books due within 2 days."""
    async with async_session() as db:
        try:
            now = datetime.now(timezone.utc)
            two_days = now + timedelta(days=2)

            result = await db.execute(
                select(Borrowing, Book, User)
                .join(Book, Borrowing.book_id == Book.id)
                .join(User, Borrowing.user_id == User.id)
                .where(
                    Borrowing.returned_at.is_(None),
                    Borrowing.due_date >= now,
                    Borrowing.due_date <= two_days,
                )
            )

            for borrowing, book, user in result.all():
                due_str = borrowing.due_date.strftime("%B %d, %Y")
                await send_email(
                    to=user.email,
                    subject=f"Due Date Reminder: {book.title}",
                    html=f"""
                    <h2>Due Date Reminder</h2>
                    <p>Hi {user.email},</p>
                    <p>Your borrowed book <strong>{book.title}</strong> by {book.author}
                    is due on <strong>{due_str}</strong>.</p>
                    <p>Please return it on time to avoid fines.</p>
                    <p>— ShelfWise Library</p>
                    """,
                )

            print(f"[Email] Due date reminders sent")
        except Exception as e:
            print(f"[Email] Error sending due reminders: {e}")


async def send_overdue_alerts():
    """Send email alerts for overdue books."""
    async with async_session() as db:
        try:
            now = datetime.now(timezone.utc)

            result = await db.execute(
                select(Borrowing, Book, User)
                .join(Book, Borrowing.book_id == Book.id)
                .join(User, Borrowing.user_id == User.id)
                .where(
                    Borrowing.returned_at.is_(None),
                    Borrowing.due_date < now,
                )
            )

            for borrowing, book, user in result.all():
                days_overdue = (now - borrowing.due_date).days
                await send_email(
                    to=user.email,
                    subject=f"Overdue Alert: {book.title}",
                    html=f"""
                    <h2>Overdue Book Alert</h2>
                    <p>Hi {user.email},</p>
                    <p>Your borrowed book <strong>{book.title}</strong> by {book.author}
                    is <strong>{days_overdue} day(s) overdue</strong>.</p>
                    <p>Please return it immediately to avoid additional fines.</p>
                    <p>— ShelfWise Library</p>
                    """,
                )

            print(f"[Email] Overdue alerts sent")
        except Exception as e:
            print(f"[Email] Error sending overdue alerts: {e}")
