from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import httpx

from app.database import get_db
from app.models import User, Profile, UserRole, AppRole
from app.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut,
    RefreshRequest, PasswordUpdateRequest, ProfileUpdate,
    PasswordResetRequest, PasswordResetConfirm, GoogleAuthRequest,
)
from app.auth.utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    create_password_reset_token, decode_token,
)
from app.auth.dependencies import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


def _build_user_out(user: User, profile: Profile | None, role: str) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=profile.full_name if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        role=role,
        created_at=user.created_at,
    )


def _build_tokens(user: User, profile: Profile | None, role: str) -> TokenResponse:
    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=_build_user_out(user, profile, role),
    )


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    await db.flush()

    # Create profile
    profile = Profile(id=user.id, full_name=body.full_name)
    db.add(profile)

    # Assign member role
    role = UserRole(user_id=user.id, role=AppRole.member)
    db.add(role)
    await db.flush()

    return _build_tokens(user, profile, "member")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Get profile and role
    profile = (await db.execute(select(Profile).where(Profile.id == user.id))).scalar_one_or_none()
    role_row = (await db.execute(select(UserRole.role).where(UserRole.user_id == user.id))).first()
    role = role_row[0].value if role_row else "member"

    return _build_tokens(user, profile, role)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    profile = (await db.execute(select(Profile).where(Profile.id == user.id))).scalar_one_or_none()
    role_row = (await db.execute(select(UserRole.role).where(UserRole.user_id == user.id))).first()
    role = role_row[0].value if role_row else "member"

    return _build_tokens(user, profile, role)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(**{k: current_user[k] for k in ["id", "email", "full_name", "avatar_url", "role"]})


@router.put("/profile", response_model=UserOut)
async def update_profile(
    body: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.id == UUID(current_user["id"])))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if body.full_name is not None:
        profile.full_name = body.full_name
    if body.avatar_url is not None:
        profile.avatar_url = body.avatar_url

    await db.flush()
    return UserOut(
        id=UUID(current_user["id"]),
        email=current_user["email"],
        full_name=profile.full_name,
        avatar_url=profile.avatar_url,
        role=current_user["role"],
    )


@router.put("/password")
async def update_password(
    body: PasswordUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == UUID(current_user["id"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(body.password)
    await db.flush()
    return {"message": "Password updated successfully"}


@router.post("/reset-password")
async def request_password_reset(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """Send a password reset link (in production, send email with the token)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    # Always return success to avoid email enumeration
    if user:
        token = create_password_reset_token(str(user.id))
        # TODO: Send email with reset link containing this token
        # For now, return the token (in production, send via email only)
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password/confirm")
async def confirm_password_reset(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(body.password)
    await db.flush()
    return {"message": "Password reset successfully"}


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with Google. Expects a Google ID token (credential) from the frontend."""
    # Verify the Google ID token
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={body.credential}")
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        google_data = resp.json()

    email = google_data.get("email")
    name = google_data.get("name", "")
    picture = google_data.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="No email in Google token")

    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        # Existing user - get profile and role
        profile = (await db.execute(select(Profile).where(Profile.id == user.id))).scalar_one_or_none()
        role_row = (await db.execute(select(UserRole.role).where(UserRole.user_id == user.id))).first()
        role = role_row[0].value if role_row else "member"
    else:
        # New user - create account
        user = User(email=email, hashed_password=hash_password("google-oauth-no-password"), is_email_verified=True)
        db.add(user)
        await db.flush()

        profile = Profile(id=user.id, full_name=name, avatar_url=picture)
        db.add(profile)

        user_role = UserRole(user_id=user.id, role=AppRole.member)
        db.add(user_role)
        await db.flush()
        role = "member"

    return _build_tokens(user, profile, role)
