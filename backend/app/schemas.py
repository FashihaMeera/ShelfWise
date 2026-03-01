from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordUpdateRequest(BaseModel):
    password: str = Field(min_length=6)


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    password: str = Field(min_length=6)


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token


# ── User / Profile ───────────────────────────────────
class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "member"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Books ─────────────────────────────────────────────
class BookOut(BaseModel):
    id: UUID
    title: str
    author: str
    isbn: Optional[str] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    publication_year: Optional[int] = None
    total_copies: int
    available_copies: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BookCreate(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    publication_year: Optional[int] = None
    total_copies: int = 1
    available_copies: Optional[int] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    publication_year: Optional[int] = None
    total_copies: Optional[int] = None
    available_copies: Optional[int] = None


# ── Borrowings ────────────────────────────────────────
class BorrowingOut(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    borrowed_at: Optional[datetime] = None
    due_date: datetime
    returned_at: Optional[datetime] = None
    issued_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


class BorrowingCreate(BaseModel):
    book_id: UUID
    user_id: UUID
    due_date: str
    issued_by: UUID


# ── Reservations ──────────────────────────────────────
class ReservationOut(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    reserved_at: Optional[datetime] = None
    status: str
    notified_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    book_title: Optional[str] = None
    book_author: Optional[str] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReservationCreate(BaseModel):
    book_id: UUID
    user_id: UUID


class ReservationUpdate(BaseModel):
    status: str


# ── Notifications ─────────────────────────────────────
class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: Optional[str] = None
    type: str = "info"
    read: bool = False
    link: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Fines ─────────────────────────────────────────────
class FineOut(BaseModel):
    id: UUID
    borrowing_id: UUID
    user_id: UUID
    amount: float
    paid: bool
    waived: bool
    waived_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    book_title: Optional[str] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Reviews ───────────────────────────────────────────
class ReviewOut(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    rating: int
    review_text: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    reviewer_name: Optional[str] = None
    reviewer_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    book_id: UUID
    user_id: UUID
    rating: int = Field(ge=1, le=5)
    review_text: Optional[str] = None


# ── Reading List ──────────────────────────────────────
class ReadingListOut(BaseModel):
    id: UUID
    user_id: UUID
    book_id: UUID
    created_at: Optional[datetime] = None
    books: Optional[BookOut] = None

    class Config:
        from_attributes = True


# ── Library Settings ──────────────────────────────────
class SettingUpdate(BaseModel):
    value: str


# ── Activity Log ──────────────────────────────────────
class ActivityLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[Any] = None
    created_at: Optional[datetime] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Book Tags ─────────────────────────────────────────
class BookTagOut(BaseModel):
    id: UUID
    book_id: UUID
    tag: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BookTagCreate(BaseModel):
    book_id: UUID
    tag: str


# ── Book Requests ─────────────────────────────────────
class BookRequestOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    author: Optional[str] = None
    reason: Optional[str] = None
    type: str
    status: str
    created_at: Optional[datetime] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


class BookRequestCreate(BaseModel):
    user_id: UUID
    title: str
    author: Optional[str] = None
    reason: Optional[str] = None
    type: str


# ── Reading Challenges ────────────────────────────────
class ReadingChallengeOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    target_books: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReadingChallengeCreate(BaseModel):
    user_id: UUID
    title: str
    target_books: int = 5
    start_date: str
    end_date: str


# ── Waitlist ──────────────────────────────────────────
class WaitlistOut(BaseModel):
    id: UUID
    book_id: UUID
    user_id: UUID
    position: int
    notified: bool
    created_at: Optional[datetime] = None
    member_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────
class DashboardStats(BaseModel):
    totalBooks: int
    activeMembers: int
    borrowedToday: int
    overdueItems: int


# ── Members ───────────────────────────────────────────
class MemberOut(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    email: Optional[str] = None
    role: str = "member"
    active_borrowings: int = 0

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    new_role: str


# ── Reports ───────────────────────────────────────────
class BorrowingTrend(BaseModel):
    date: str
    borrowed: int
    returned: int


class PopularBook(BaseModel):
    title: str
    author: str
    count: int


class OverdueItem(BaseModel):
    id: UUID
    book_title: str
    book_author: str
    member_name: str
    due_date: str
    days_overdue: int


class GenreDistItem(BaseModel):
    name: str
    value: int


class LeaderboardEntry(BaseModel):
    rank: int
    userId: UUID
    name: str
    avatar: Optional[str] = None
    booksRead: int
