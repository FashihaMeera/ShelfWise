from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "student"


class UserInDB(BaseModel):
    id: Optional[str]
    name: str
    email: EmailStr
    hashed_password: str
    role: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserOut(BaseModel):
    id: Optional[str]
    name: str
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None


class BookCreate(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = None
    category: Optional[str] = None
    quantity: int = 1


class BookOut(BaseModel):
    id: Optional[str]
    title: str
    author: str
    isbn: Optional[str]
    category: Optional[str]
    quantity: int
