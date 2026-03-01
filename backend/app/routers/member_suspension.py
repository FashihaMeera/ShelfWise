from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime, timezone

from app.database import get_db
from app.models import Profile, Fine
from app.schemas import SuspendMemberRequest, SuspendMemberResponse, UnsuspendMemberRequest
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("/{member_id}/suspension-status")
async def get_suspension_status(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Get suspension status for a member"""
    result = await db.execute(
        select(Profile).where(Profile.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    return {
        "user_id": member.id,
        "is_suspended": member.is_suspended,
        "suspension_reason": member.suspension_reason,
        "suspended_at": member.suspended_at
    }


@router.post("/{member_id}/suspend", response_model=SuspendMemberResponse)
async def suspend_member(
    member_id: UUID,
    body: SuspendMemberRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Suspend a member (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can suspend members")

    result = await db.execute(
        select(Profile).where(Profile.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.is_suspended:
        raise HTTPException(status_code=400, detail="Member already suspended")

    member.is_suspended = True
    member.suspension_reason = body.reason
    member.suspended_at = datetime.now(timezone.utc)

    await db.commit()

    return SuspendMemberResponse(
        user_id=member.id,
        is_suspended=True,
        suspension_reason=body.reason,
        suspended_at=member.suspended_at
    )


@router.post("/{member_id}/unsuspend", response_model=SuspendMemberResponse)
async def unsuspend_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Unsuspend a member (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can unsuspend members")

    result = await db.execute(
        select(Profile).where(Profile.id == member_id)
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if not member.is_suspended:
        raise HTTPException(status_code=400, detail="Member not suspended")

    member.is_suspended = False
    member.suspension_reason = None
    member.suspended_at = None

    await db.commit()

    return SuspendMemberResponse(
        user_id=member.id,
        is_suspended=False,
        suspension_reason=None,
        suspended_at=None
    )


@router.get("/", response_model=list[dict])
async def get_all_members(
    include_suspended: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get all members with suspension status"""
    if current_user["role"] not in ["admin", "librarian"]:
        raise HTTPException(status_code=403, detail="Only staff can view all members")

    query = select(Profile)
    if not include_suspended:
        query = query.where(Profile.is_suspended == False)

    result = await db.execute(query.order_by(Profile.full_name))
    members = result.scalars().all()

    response = []
    for member in members:
        # Get unpaid fines count
        fines_result = await db.execute(
            select(Fine).where(
                Fine.user_id == member.id,
                Fine.paid == False,
                Fine.waived == False
            )
        )
        unpaid_fines = len(fines_result.scalars().all())

        response.append({
            "id": member.id,
            "full_name": member.full_name,
            "avatar_url": member.avatar_url,
            "is_suspended": member.is_suspended,
            "suspension_reason": member.suspension_reason,
            "suspended_at": member.suspended_at,
            "unpaid_fines_count": unpaid_fines,
        })

    return response


@router.get("/{member_id}/unpaid-fines")
async def get_member_unpaid_fines(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get unpaid fines for a member"""
    # Check authorization
    if str(member_id) != current_user["id"] and current_user["role"] == "member":
        raise HTTPException(status_code=403, detail="Not allowed")

    result = await db.execute(
        select(Fine).where(
            Fine.user_id == member_id,
            Fine.paid == False,
            Fine.waived == False
        ).order_by(Fine.created_at.desc())
    )
    fines = result.scalars().all()

    return {
        "user_id": member_id,
        "unpaid_fines": [
            {
                "id": fine.id,
                "borrowing_id": fine.borrowing_id,
                "amount": float(fine.amount),
                "created_at": fine.created_at
            }
            for fine in fines
        ],
        "total_unpaid": sum(float(f.amount) for f in fines),
        "count": len(fines)
    }
