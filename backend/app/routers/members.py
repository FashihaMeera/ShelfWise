from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import List

from app.database import get_db
from app.models import Profile, UserRole, User, Borrowing, ActivityLog, AppRole
from app.schemas import MemberOut, RoleUpdate
from app.auth.dependencies import get_current_user, require_staff, require_admin

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("", response_model=List[MemberOut])
async def list_members(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    # Fetch profiles
    profiles = (await db.execute(
        select(Profile).order_by(Profile.created_at.desc())
    )).scalars().all()

    # Fetch roles
    roles = (await db.execute(select(UserRole))).scalars().all()
    role_map = {str(r.user_id): r.role.value for r in roles}

    # Fetch active borrowings count
    borrow_counts = (await db.execute(
        select(Borrowing.user_id, func.count(Borrowing.id))
        .where(Borrowing.returned_at.is_(None))
        .group_by(Borrowing.user_id)
    )).all()
    borrow_map = {str(uid): cnt for uid, cnt in borrow_counts}

    # Fetch emails
    users = (await db.execute(select(User))).scalars().all()
    email_map = {str(u.id): u.email for u in users}

    return [
        MemberOut(
            id=p.id,
            full_name=p.full_name,
            avatar_url=p.avatar_url,
            created_at=p.created_at,
            email=email_map.get(str(p.id)),
            role=role_map.get(str(p.id), "member"),
            active_borrowings=borrow_map.get(str(p.id), 0),
        )
        for p in profiles
    ]


@router.get("/{member_id}", response_model=MemberOut)
async def get_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    profile = (await db.execute(select(Profile).where(Profile.id == member_id))).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Member not found")

    role_row = (await db.execute(select(UserRole.role).where(UserRole.user_id == member_id))).first()
    role = role_row[0].value if role_row else "member"

    user = (await db.execute(select(User).where(User.id == member_id))).scalar_one_or_none()

    borrow_count = (await db.execute(
        select(func.count(Borrowing.id))
        .where(Borrowing.user_id == member_id, Borrowing.returned_at.is_(None))
    )).scalar() or 0

    return MemberOut(
        id=profile.id,
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
        created_at=profile.created_at,
        email=user.email if user else None,
        role=role,
        active_borrowings=borrow_count,
    )


@router.put("/{member_id}/role")
async def update_member_role(
    member_id: UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin()),
):
    # Prevent self-demotion
    if str(member_id) == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    role_result = await db.execute(select(UserRole).where(UserRole.user_id == member_id))
    user_role = role_result.scalar_one_or_none()

    if not user_role:
        raise HTTPException(status_code=404, detail="User role not found")

    old_role = user_role.role.value
    user_role.role = AppRole(body.new_role)
    await db.flush()

    # Log the activity
    log = ActivityLog(
        user_id=UUID(current_user["id"]),
        action="role_changed",
        entity_type="user_role",
        entity_id=str(member_id),
        details={"old_role": old_role, "new_role": body.new_role},
    )
    db.add(log)

    return {"message": "Role updated", "old_role": old_role, "new_role": body.new_role}
