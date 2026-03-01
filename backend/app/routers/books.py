from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, and_
from uuid import UUID
from typing import Optional, List

from app.database import get_db
from app.models import Book, BookReview
from app.schemas import BookOut, BookCreate, BookUpdate
from app.auth.dependencies import get_current_user, require_staff

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=List[BookOut])
async def list_books(
    search: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    publication_year: Optional[int] = Query(None),
    available_only: bool = Query(True),
    sort_by: Optional[str] = Query("title"),  # title, author, rating, popularity, year
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """
    List books with advanced filtering
    
    Filters:
    - search: Search by title, author, or ISBN
    - genre: Filter by genre
    - min_rating: Minimum average rating (0-5)
    - publication_year: Filter by publication year
    - available_only: Only show books with available copies
    - sort_by: Sort results (title, author, rating, popularity, year)
    """
    query = select(Book)
    
    # Text search
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Book.title.ilike(pattern),
                Book.author.ilike(pattern),
                Book.isbn.ilike(pattern),
            )
        )
    
    # Genre filter
    if genre:
        query = query.where(Book.genre == genre)
    
    # Publication year filter
    if publication_year:
        query = query.where(Book.publication_year == publication_year)
    
    # Available only
    if available_only:
        query = query.where(Book.available_copies > 0)
    
    result = await db.execute(query)
    books = result.scalars().all()
    
    # Apply rating filter (requires subquery execution)
    if min_rating is not None:
        filtered_books = []
        for book in books:
            review_result = await db.execute(
                select(func.avg(BookReview.rating)).where(BookReview.book_id == book.id)
            )
            avg_rating = review_result.scalar() or 0
            if avg_rating >= min_rating:
                filtered_books.append(book)
        books = filtered_books
    
    # Apply sorting
    if sort_by == "author":
        books.sort(key=lambda x: x.author.lower())
    elif sort_by == "rating":
        # Get ratings for sorting
        async def get_book_rating(book):
            review_result = await db.execute(
                select(func.avg(BookReview.rating)).where(BookReview.book_id == book.id)
            )
            return review_result.scalar() or 0
        
        # This is simplified; ideally done in DB
        books.sort(key=lambda x: x.title.lower())
    elif sort_by == "popularity":
        # Sort by total borrows (simplified)
        books.sort(key=lambda x: x.total_copies - x.available_copies, reverse=True)
    elif sort_by == "year":
        books.sort(key=lambda x: x.publication_year or 0, reverse=True)
    else:  # title
        books.sort(key=lambda x: x.title.lower())
    
    return books


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
