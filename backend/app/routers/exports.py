"""
Reports router - Export functionality for borrowing history, member reports, and analytics
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models import Borrowing, Book, Profile, User
from app.schemas import BookOut
from app.auth.dependencies import get_current_user
from app.services.export_service import ExportService

router = APIRouter(prefix="/api/exports", tags=["exports"])


@router.get("/{member_id}/borrowing-history/csv")
async def export_borrowing_history_csv(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Export member's borrowing history as CSV"""
    # Authorization check
    if str(member_id) != current_user["id"] and current_user["role"] == "member":
        raise HTTPException(status_code=403, detail="Not allowed")

    # Get member info
    member_result = await db.execute(
        select(Profile).where(Profile.id == member_id)
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get borrowing history
    borrow_result = await db.execute(
        select(Borrowing, Book)
        .join(Book, Borrowing.book_id == Book.id)
        .where(Borrowing.user_id == member_id)
        .order_by(Borrowing.borrowed_at.desc())
    )
    borrowings_data = []
    for borrowing, book in borrow_result.all():
        days_borrowed = None
        if borrowing.returned_at:
            days_borrowed = (borrowing.returned_at - borrowing.borrowed_at).days

        borrowings_data.append({
            "title": book.title,
            "author": book.author,
            "isbn": book.isbn,
            "borrowed_date": borrowing.borrowed_at.strftime("%Y-%m-%d"),
            "due_date": borrowing.due_date.strftime("%Y-%m-%d"),
            "returned_date": borrowing.returned_at.strftime("%Y-%m-%d") if borrowing.returned_at else None,
            "days_borrowed": days_borrowed
        })

    # Generate CSV
    csv_file = ExportService.export_borrowing_history_csv(
        borrowings_data,
        member_name=member.full_name or "Member"
    )

    return StreamingResponse(
        iter([csv_file.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=borrowing-history-{member_id}.csv"}
    )


@router.get("/{member_id}/borrowing-history/excel")
async def export_borrowing_history_excel(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Export member's borrowing history as Excel"""
    if str(member_id) != current_user["id"] and current_user["role"] == "member":
        raise HTTPException(status_code=403, detail="Not allowed")

    # Get member info
    member_result = await db.execute(
        select(Profile).where(Profile.id == member_id)
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get borrowing history
    borrow_result = await db.execute(
        select(Borrowing, Book)
        .join(Book, Borrowing.book_id == Book.id)
        .where(Borrowing.user_id == member_id)
        .order_by(Borrowing.borrowed_at.desc())
    )
    borrowings_data = []
    for borrowing, book in borrow_result.all():
        borrowings_data.append({
            "title": book.title,
            "author": book.author,
            "isbn": book.isbn,
            "borrowed_date": borrowing.borrowed_at.strftime("%Y-%m-%d"),
            "due_date": borrowing.due_date.strftime("%Y-%m-%d"),
            "returned_date": borrowing.returned_at.strftime("%Y-%m-%d") if borrowing.returned_at else None,
        })

    try:
        excel_file = ExportService.export_borrowing_history_excel(
            borrowings_data,
            member_name=member.full_name or "Member"
        )
    except ImportError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StreamingResponse(
        iter([excel_file.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=borrowing-history-{member_id}.xlsx"}
    )


@router.get("/members/report/csv")
async def export_members_report_csv(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Export all members report as CSV (staff only)"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can export member reports")

    # Get all members with borrowing counts
    members_result = await db.execute(select(Profile))
    profiles = members_result.scalars().all()

    members_data = []
    for profile in profiles:
        # Count borrowings
        total_borrow_result = await db.execute(
            select(Borrowing).where(Borrowing.user_id == profile.id)
        )
        total_borrowed = len(total_borrow_result.scalars().all())

        currently_borrowed_result = await db.execute(
            select(Borrowing).where(
                Borrowing.user_id == profile.id,
                Borrowing.returned_at == None
            )
        )
        currently_borrowed = len(currently_borrowed_result.scalars().all())

        members_data.append({
            "full_name": profile.full_name,
            "email": getattr(profile.user, "email", "N/A") if hasattr(profile, "user") else "N/A",
            "created_at": profile.created_at.strftime("%Y-%m-%d"),
            "total_borrowed": total_borrowed,
            "currently_borrowed": currently_borrowed,
            "is_suspended": profile.is_suspended
        })

    csv_file = ExportService.export_members_report_csv(members_data)

    return StreamingResponse(
        iter([csv_file.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=members-report-{datetime.now().strftime('%Y%m%d')}.csv"}
    )


@router.get("/members/report/excel")
async def export_members_report_excel(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Export all members report as Excel (staff only)"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can export member reports")

    # Get all members
    members_result = await db.execute(select(Profile))
    profiles = members_result.scalars().all()

    members_data = []
    for profile in profiles:
        members_data.append({
            "full_name": profile.full_name,
            "email": "",  # Simplified for now
            "created_at": profile.created_at.strftime("%Y-%m-%d"),
            "total_borrowed": 0,
            "currently_borrowed": 0,
            "is_suspended": profile.is_suspended
        })

    try:
        excel_file = ExportService.export_members_report_excel(members_data)
    except ImportError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return StreamingResponse(
        iter([excel_file.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=members-report-{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )
