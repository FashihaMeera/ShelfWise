"""
Email notification service for ShelfWise Library
Supports multiple email backends (Resend, SendGrid, SMTP)
Handles: due date reminders, overdue alerts, reservations, fine payments, account suspension
"""
import os
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert

from app.models import EmailLog
from app.config import get_settings

settings = get_settings()

# Try to import Resend
try:
    import resend
    RESEND_AVAILABLE = bool(os.getenv("RESEND_API_KEY"))
    if RESEND_AVAILABLE:
        resend.api_key = os.getenv("RESEND_API_KEY")
except ImportError:
    RESEND_AVAILABLE = False


class EmailService:
    """Email notification service"""

    @staticmethod
    async def log_email(
        db: AsyncSession,
        recipient_email: str,
        subject: str,
        email_type: str,
        recipient_name: Optional[str] = None,
        user_id: Optional[UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
        status: str = "sent"
    ):
        """Log email to database for tracking"""
        try:
            stmt = insert(EmailLog).values(
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                subject=subject,
                email_type=email_type,
                user_id=user_id,
                email_metadata=json.dumps(metadata or {}),
                status=status,
                created_at=datetime.now(timezone.utc)
            )
            await db.execute(stmt)
            await db.commit()
        except Exception as e:
            print(f"Failed to log email: {e}")

    @staticmethod
    async def send_overdue_reminder(
        db: AsyncSession,
        recipient_email: str,
        recipient_name: str,
        book_title: str,
        due_date: str,
        days_overdue: int,
        fine_amount: float
    ):
        """Send overdue book reminder"""
        subject = f"Reminder: '{book_title}' is overdue"
        email_type = "overdue"

        html_body = f"""
        <h2>Library Book Overdue Reminder</h2>
        <p>Hello {recipient_name},</p>
        <p>The following book is overdue:</p>
        <ul>
            <li><strong>Title:</strong> {book_title}</li>
            <li><strong>Due Date:</strong> {due_date}</li>
            <li><strong>Days Overdue:</strong> {days_overdue}</li>
            <li><strong>Fine Amount:</strong> ${fine_amount:.2f}</li>
        </ul>
        <p>Please return the book as soon as possible or renew it if available.</p>
        <p>If you've already returned this book, please ignore this message.</p>
        """

        await EmailService._send_email(
            recipient_email=recipient_email,
            subject=subject,
            html_body=html_body,
            db=db,
            recipient_name=recipient_name,
            email_type=email_type,
            metadata={
                "book_title": book_title,
                "days_overdue": days_overdue,
                "fine_amount": str(fine_amount)
            }
        )

    @staticmethod
    async def send_due_date_reminder(
        db: AsyncSession,
        recipient_email: str,
        recipient_name: str,
        book_title: str,
        due_date: str
    ):
        """Send upcoming due date reminder"""
        subject = f"Reminder: '{book_title}' is due soon"
        email_type = "due_date"

        html_body = f"""
        <h2>Library Book Due Date Reminder</h2>
        <p>Hello {recipient_name},</p>
        <p>This is a friendly reminder that the following book is due soon:</p>
        <ul>
            <li><strong>Title:</strong> {book_title}</li>
            <li><strong>Due Date:</strong> {due_date}</li>
        </ul>
        <p>Please return or renew the book to avoid fines.</p>
        """

        await EmailService._send_email(
            recipient_email=recipient_email,
            subject=subject,
            html_body=html_body,
            db=db,
            recipient_name=recipient_name,
            email_type=email_type,
            metadata={"book_title": book_title}
        )

    @staticmethod
    async def send_reservation_ready(
        db: AsyncSession,
        recipient_email: str,
        recipient_name: str,
        book_title: str,
        pickup_deadline: str
    ):
        """Send notification that reserved book is ready for pickup"""
        subject = f"Your reservation for '{book_title}' is ready"
        email_type = "reservation"

        html_body = f"""
        <h2>Reservation Ready for Pickup</h2>
        <p>Hello {recipient_name},</p>
        <p>Great news! Your reservation is now ready for pickup:</p>
        <ul>
            <li><strong>Title:</strong> {book_title}</li>
            <li><strong>Pickup Deadline:</strong> {pickup_deadline}</li>
        </ul>
        <p>Please pick up your book before the deadline to avoid cancellation.</p>
        """

        await EmailService._send_email(
            recipient_email=recipient_email,
            subject=subject,
            html_body=html_body,
            db=db,
            recipient_name=recipient_name,
            email_type=email_type,
            metadata={"book_title": book_title}
        )

    @staticmethod
    async def send_fine_payment_reminder(
        db: AsyncSession,
        recipient_email: str,
        recipient_name: str,
        fine_amount: float,
        book_title: str
    ):
        """Send payment reminder for unpaid fine"""
        subject = f"Unpaid fine reminder - ${fine_amount:.2f}"
        email_type = "fine_payment"

        html_body = f"""
        <h2>Unpaid Fine Reminder</h2>
        <p>Hello {recipient_name},</p>
        <p>You have an unpaid fine for the following book:</p>
        <ul>
            <li><strong>Title:</strong> {book_title}</li>
            <li><strong>Fine Amount:</strong> ${fine_amount:.2f}</li>
        </ul>
        <p>Please pay the fine to restore your borrowing privileges.</p>
        <p>You can pay online through your library account.</p>
        """

        await EmailService._send_email(
            recipient_email=recipient_email,
            subject=subject,
            html_body=html_body,
            db=db,
            recipient_name=recipient_name,
            email_type=email_type,
            metadata={"fine_amount": str(fine_amount)}
        )

    @staticmethod
    async def send_account_suspended(
        db: AsyncSession,
        recipient_email: str,
        recipient_name: str,
        reason: str
    ):
        """Send notification of account suspension"""
        subject = "Your account has been suspended"
        email_type = "suspension"

        html_body = f"""
        <h2>Account Suspension Notice</h2>
        <p>Hello {recipient_name},</p>
        <p>Your library account has been suspended for the following reason:</p>
        <p><strong>{reason}</strong></p>
        <p>Please contact the library staff to resolve this matter.</p>
        """

        await EmailService._send_email(
            recipient_email=recipient_email,
            subject=subject,
            html_body=html_body,
            db=db,
            recipient_name=recipient_name,
            email_type=email_type,
            metadata={"reason": reason}
        )

    @staticmethod
    async def _send_email(
        recipient_email: str,
        subject: str,
        html_body: str,
        db: AsyncSession,
        recipient_name: Optional[str] = None,
        email_type: str = "general",
        metadata: Optional[Dict] = None
    ):
        """Internal method to send email via Resend API"""
        try:
            # Add footer to all emails
            footer = f"""
            <hr/>
            <p style="font-size: 12px; color: #666;">
                This is an automated message from ShelfWise Library.
                Please do not reply to this email.
            </p>
            """
            full_html = html_body + footer

            if RESEND_AVAILABLE:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                        json={
                            "from": "ShelfWise <noreply@shelfwise.local>",
                            "to": [recipient_email],
                            "subject": subject,
                            "html": full_html,
                        },
                    )
                    status = "sent" if resp.status_code == 200 else "failed"
            else:
                print(f"Email backend not configured. Email not sent to {recipient_email}")
                status = "failed"
        except Exception as e:
            print(f"Failed to send email to {recipient_email}: {e}")
            status = "failed"

        # Log the email
        await EmailService.log_email(
            db=db,
            recipient_email=recipient_email,
            subject=subject,
            email_type=email_type,
            recipient_name=recipient_name,
            metadata=metadata,
            status=status
        )
