import os
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import timedelta

from . import config, crud, auth as auth_utils, models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


app = FastAPI(title="Shelfwise - Smart Library API")

# Add CORS middleware for frontend dev (must be before startup event)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.on_event("startup")
async def startup_db_client():
    mongo_uri = os.getenv("MONGO_URI", config.MONGO_URI)
    app.mongodb_client = AsyncIOMotorClient(mongo_uri)
    app.db = app.mongodb_client[config.DATABASE_NAME]


@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()


@app.post("/api/auth/register", response_model=models.UserOut)
async def register(user: models.UserCreate):
    existing = await crud.get_user_by_email(app.db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = await crud.create_user(app.db, user)
    return {
        "id": str(doc.get("_id") or doc.get("id")),
        "name": doc["name"],
        "email": doc["email"],
        "role": doc["role"],
    }


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await crud.get_user_by_email(app.db, form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not crud.verify_password(form_data.password, user.get("hashed_password")):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = auth_utils.create_access_token(
        data={"sub": user.get("email"), "role": user.get("role")}, expires_delta=access_token_expires
    )
    return {"access_token": token, "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)):
    token_data = auth_utils.decode_access_token(token)
    if not token_data or not token_data.email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user = await crud.get_user_by_email(app.db, token_data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    # Return a simple user dict
    return {
        "id": str(user.get("_id") or user.get("id")),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
    }


@app.get("/api/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user


def role_required(*roles: str):
    async def dependency(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")
        return current_user

    return dependency


@app.get("/api/admin/users")
async def admin_list_users(skip: int = 0, limit: int = 50, _=Depends(role_required("admin"))):
    users = await crud.list_users(app.db, skip=skip, limit=limit)
    return {"count": len(users), "users": users}


@app.post("/api/books", response_model=models.BookOut)
async def create_book(book: models.BookCreate, _=Depends(role_required("admin", "librarian"))):
    doc = await crud.create_book(app.db, book.dict())
    return {
        "id": doc.get("id"),
        "title": doc.get("title"),
        "author": doc.get("author"),
        "isbn": doc.get("isbn"),
        "category": doc.get("category"),
        "quantity": doc.get("quantity"),
    }


@app.get("/api/books")
async def get_books(skip: int = 0, limit: int = 50, current_user: dict = Depends(get_current_user)):
    # any authenticated user can view books
    books = await crud.list_books(app.db, skip=skip, limit=limit)
    return {"count": len(books), "books": books}
