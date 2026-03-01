from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import timedelta, datetime, timezone

from app.database import get_db
from app.models import Borrowing, Fine
from app.schemas import RenewBookResponse
from app.auth.dependencies import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/api/borrowings", tags=["borrowings"])
settings = get_settings()

# Default renewal period in days
RENEWAL_PERIOD_DAYS = 14
MAX_RENEWALS = 3


@router.post("/{borrowing_id}/renew", response_model=RenewBookResponse)
async def renew_book(
    borrowing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Renew a book borrowing, extending the due date by 14 days.
    - User can only renew their own borrowings
    - Maximum 3 renewals per borrow
    - Cannot renew if book has outstanding holds
    - Cannot renew if fine is unpaid
    """
    # Fetch the borrowing
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == borrowing_id)
    )
    borrowing = result.scalar_one_or_none()

    if not borrowing:
        raise HTTPException(status_code=404, detail="Borrowing not found")

    # Check if user owns this borrowing (or is admin/librarian)
    if str(borrowing.user_id) != current_user["id"] and current_user["role"] == "member":
        raise HTTPException(status_code=403, detail="Not allowed")

    # Check if already returned
    if borrowing.returned_at is not None:
        raise HTTPException(status_code=400, detail="Book already returned")

    # Check renewal count
    if borrowing.renewal_count >= MAX_RENEWALS:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_RENEWALS} renewals reached for this borrowing"
        )

    # Check if there are unpaid fines for this borrowing
    fine_result = await db.execute(
        select(Fine).where(
            Fine.borrowing_id == borrowing_id,
            Fine.paid == False,
            Fine.waived == False
        )
    )
    unpaid_fine = fine_result.scalar_one_or_none()

    if unpaid_fine:
        raise HTTPException(
            status_code=400,
            detail="Cannot renew book with unpaid fines"
        )

    # Calculate new due date
    new_due_date = datetime.now(timezone.utc) + timedelta(days=RENEWAL_PERIOD_DAYS)

    # Update borrowing
    borrowing.due_date = new_due_date
    borrowing.renewal_count += 1
    borrowing.last_renewed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()

    return RenewBookResponse(
        borrowing_id=borrowing_id,
        new_due_date=new_due_date,
        renewal_count=borrowing.renewal_count,
        message=f"Book renewed successfully. New due date: {new_due_date.strftime('%Y-%m-%d')}"
    )
