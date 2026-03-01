from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from uuid import UUID
from typing import Optional, List

from app.database import get_db
from app.models import Book
from app.schemas import BookOut, BookCreate, BookUpdate
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=List[BookOut])
async def list_books(
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    query = select(Book).order_by(Book.title)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Book.title.ilike(pattern),
                Book.author.ilike(pattern),
                Book.isbn.ilike(pattern),
            )
        )
    if genre:
        query = query.where(Book.genre == genre)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/genres", response_model=List[str])
async def list_genres(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Book.genre).where(Book.genre.isnot(None)).distinct().order_by(Book.genre)
    )
    return [row[0] for row in result.all()]


@router.get("/{book_id}", response_model=BookOut)
async def get_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("", response_model=BookOut)
async def create_book(
    body: BookCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    book = Book(
        title=body.title,
        author=body.author,
        isbn=body.isbn,
        genre=body.genre,
        description=body.description,
        cover_image_url=body.cover_image_url,
        publication_year=body.publication_year,
        total_copies=body.total_copies,
        available_copies=body.available_copies if body.available_copies is not None else body.total_copies,
    )
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return book


@router.post("/bulk", response_model=dict)
async def bulk_import_books(
    books: List[BookCreate],
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    """Bulk import books (for CSV import)."""
    created = []
    for b in books:
        book = Book(
            title=b.title,
            author=b.author,
            isbn=b.isbn,
            genre=b.genre,
            description=b.description,
            cover_image_url=b.cover_image_url,
            publication_year=b.publication_year,
            total_copies=b.total_copies,
            available_copies=b.available_copies if b.available_copies is not None else b.total_copies,
        )
        db.add(book)
        created.append(book)
    await db.flush()
    return {"count": len(created)}


@router.put("/{book_id}", response_model=BookOut)
async def update_book(
    book_id: UUID,
    body: BookUpdate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(book, key, value)

    await db.flush()
    await db.refresh(book)
    return book


@router.delete("/{book_id}")
async def delete_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_staff()),
):
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    await db.delete(book)
    return {"message": "Book deleted"}
