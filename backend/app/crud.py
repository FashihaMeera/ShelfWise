from motor.motor_asyncio import AsyncIOMotorDatabase
from .models import UserCreate, UserInDB
from passlib.context import CryptContext
from bson import ObjectId

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str):
    return await db.users.find_one({"email": email})


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str):
    doc = await db.users.find_one({"_id": ObjectId(user_id)})
    return doc


async def create_user(db: AsyncIOMotorDatabase, user: UserCreate):
    hashed = get_password_hash(user.password)
    doc = {
        "name": user.name,
        "email": user.email,
        "hashed_password": hashed,
        "role": user.role or "student",
        "is_active": True,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["id"] = str(result.inserted_id)
    return doc


async def list_users(db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 50):
    cursor = db.users.find({}).skip(skip).limit(limit)
    out = []
    async for u in cursor:
        out.append({
            "id": str(u.get("_id")),
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role"),
        })
    return out


async def create_book(db: AsyncIOMotorDatabase, book: dict):
    doc = {
        "title": book.get("title"),
        "author": book.get("author"),
        "isbn": book.get("isbn"),
        "category": book.get("category"),
        "quantity": int(book.get("quantity", 1)),
    }
    result = await db.books.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


async def list_books(db: AsyncIOMotorDatabase, skip: int = 0, limit: int = 50):
    cursor = db.books.find({}).skip(skip).limit(limit)
    out = []
    async for b in cursor:
        out.append({
            "id": str(b.get("_id")),
            "title": b.get("title"),
            "author": b.get("author"),
            "isbn": b.get("isbn"),
            "category": b.get("category"),
            "quantity": b.get("quantity", 0),
        })
    return out
