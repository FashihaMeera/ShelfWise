from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models import User, UserRole, Profile
from app.auth.utils import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Extract and validate the current user from the JWT token."""
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Get role
    role_result = await db.execute(select(UserRole.role).where(UserRole.user_id == user.id))
    role_row = role_result.first()
    role = role_row[0].value if role_row else "member"

    # Get profile
    profile_result = await db.execute(select(Profile).where(Profile.id == user.id))
    profile = profile_result.scalar_one_or_none()

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": profile.full_name if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "role": role,
    }


def require_role(*roles: str):
    """Dependency factory: require the user to have one of the specified roles."""
    async def checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return checker


def require_staff():
    """Shortcut: require admin or librarian."""
    return require_role("admin", "librarian")


def require_admin():
    """Shortcut: require admin."""
    return require_role("admin")
