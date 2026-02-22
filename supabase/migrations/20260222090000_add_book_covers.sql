-- =============================================
-- FIX: Update all seed books with correct cover images
-- Open Library requires ISBNs WITHOUT hyphens
-- Run this in Supabase SQL Editor
-- =============================================

-- To Kill a Mockingbird
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg'
WHERE title = 'To Kill a Mockingbird';

-- 1984
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg'
WHERE title = '1984';

-- The Great Gatsby
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg'
WHERE title = 'The Great Gatsby';

-- Pride and Prejudice
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg'
WHERE title = 'Pride and Prejudice';

-- The Catcher in the Rye
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg'
WHERE title = 'The Catcher in the Rye';

-- A Brief History of Time
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'
WHERE title = 'A Brief History of Time';

-- The Selfish Gene
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780198788607-L.jpg'
WHERE title = 'The Selfish Gene';

-- Cosmos
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780345539434-L.jpg'
WHERE title = 'Cosmos';

-- Sapiens
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'
WHERE title = 'Sapiens';

-- Guns, Germs, and Steel
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780393354324-L.jpg'
WHERE title = 'Guns, Germs, and Steel';

-- The Art of War
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9781599869773-L.jpg'
WHERE title = 'The Art of War';

-- Clean Code
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg'
WHERE title = 'Clean Code';

-- The Pragmatic Programmer
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg'
WHERE title = 'The Pragmatic Programmer';

-- Design Patterns
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg'
WHERE title = 'Design Patterns';

-- Dune
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg'
WHERE title = 'Dune';

-- Neuromancer
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780441569595-L.jpg'
WHERE title = 'Neuromancer';

-- The Hobbit
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg'
WHERE title = 'The Hobbit';

-- Harry Potter and the Sorcerer's Stone
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg'
WHERE title LIKE 'Harry Potter%';

-- Thinking, Fast and Slow
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg'
WHERE title = 'Thinking, Fast and Slow';

-- The Lean Startup
UPDATE public.books SET cover_image_url = 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg'
WHERE title = 'The Lean Startup';
