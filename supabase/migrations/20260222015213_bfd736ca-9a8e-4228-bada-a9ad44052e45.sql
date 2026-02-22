
-- =============================================
-- BOOKS TABLE
-- =============================================
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  isbn text UNIQUE,
  genre text,
  description text,
  cover_image_url text,
  publication_year integer,
  total_copies integer NOT NULL DEFAULT 1,
  available_copies integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "Authenticated users can view books"
  ON public.books FOR SELECT TO authenticated
  USING (true);

-- Admin/Librarian can insert
CREATE POLICY "Admin/Librarian can insert books"
  ON public.books FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- Admin/Librarian can update
CREATE POLICY "Admin/Librarian can update books"
  ON public.books FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- Admin/Librarian can delete
CREATE POLICY "Admin/Librarian can delete books"
  ON public.books FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- updated_at trigger
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BORROWINGS TABLE
-- =============================================
CREATE TABLE public.borrowings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  borrowed_at timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz NOT NULL,
  returned_at timestamptz,
  issued_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;

-- Members can view their own borrowings
CREATE POLICY "Members can view own borrowings"
  ON public.borrowings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'librarian')
  );

-- Admin/Librarian can insert borrowings
CREATE POLICY "Admin/Librarian can insert borrowings"
  ON public.borrowings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- Admin/Librarian can update borrowings (for returns)
CREATE POLICY "Admin/Librarian can update borrowings"
  ON public.borrowings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- =============================================
-- TRIGGER: auto-manage available_copies
-- =============================================
CREATE OR REPLACE FUNCTION public.manage_available_copies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    UPDATE public.books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.returned_at IS NULL THEN
    UPDATE public.books SET available_copies = available_copies + 1 WHERE id = OLD.book_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER manage_book_availability
  AFTER INSERT OR UPDATE OR DELETE ON public.borrowings
  FOR EACH ROW EXECUTE FUNCTION public.manage_available_copies();

-- =============================================
-- RLS: Admin/Librarian can view all profiles
-- =============================================
CREATE POLICY "Admin/Librarian can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- =============================================
-- SEED DATA: ~20 sample books
-- =============================================
INSERT INTO public.books (title, author, isbn, genre, description, publication_year, total_copies, available_copies) VALUES
  ('To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 'Fiction', 'A classic of modern American literature about racial injustice in the Deep South.', 1960, 3, 3),
  ('1984', 'George Orwell', '978-0451524935', 'Fiction', 'A dystopian novel set in a totalitarian society ruled by Big Brother.', 1949, 4, 4),
  ('The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 'Fiction', 'A tale of wealth, love, and the American Dream in the Jazz Age.', 1925, 2, 2),
  ('Pride and Prejudice', 'Jane Austen', '978-0141439518', 'Fiction', 'A romantic novel following Elizabeth Bennet and Mr. Darcy.', 1813, 3, 3),
  ('The Catcher in the Rye', 'J.D. Salinger', '978-0316769488', 'Fiction', 'A story of teenage alienation and loss of innocence.', 1951, 2, 2),
  ('A Brief History of Time', 'Stephen Hawking', '978-0553380163', 'Science', 'An exploration of cosmology for the general reader.', 1988, 2, 2),
  ('The Selfish Gene', 'Richard Dawkins', '978-0198788607', 'Science', 'A gene-centered view of evolution.', 1976, 1, 1),
  ('Cosmos', 'Carl Sagan', '978-0345539434', 'Science', 'A journey through the universe and scientific discovery.', 1980, 2, 2),
  ('Sapiens', 'Yuval Noah Harari', '978-0062316097', 'History', 'A brief history of humankind from the Stone Age to the present.', 2011, 3, 3),
  ('Guns, Germs, and Steel', 'Jared Diamond', '978-0393354324', 'History', 'Why some civilizations conquered others.', 1997, 2, 2),
  ('The Art of War', 'Sun Tzu', '978-1599869773', 'History', 'Ancient Chinese military treatise on strategy and tactics.', -500, 1, 1),
  ('Clean Code', 'Robert C. Martin', '978-0132350884', 'Technology', 'A handbook of agile software craftsmanship.', 2008, 3, 3),
  ('The Pragmatic Programmer', 'David Thomas & Andrew Hunt', '978-0135957059', 'Technology', 'Tips and techniques for modern software development.', 2019, 2, 2),
  ('Design Patterns', 'Gang of Four', '978-0201633610', 'Technology', 'Elements of reusable object-oriented software.', 1994, 2, 2),
  ('Dune', 'Frank Herbert', '978-0441013593', 'Science Fiction', 'An epic science fiction novel set on the desert planet Arrakis.', 1965, 3, 3),
  ('Neuromancer', 'William Gibson', '978-0441569595', 'Science Fiction', 'The foundational cyberpunk novel.', 1984, 1, 1),
  ('The Hobbit', 'J.R.R. Tolkien', '978-0547928227', 'Fantasy', 'A fantasy adventure of Bilbo Baggins.', 1937, 4, 4),
  ('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '978-0590353427', 'Fantasy', 'A young wizard discovers his magical heritage.', 1997, 5, 5),
  ('Thinking, Fast and Slow', 'Daniel Kahneman', '978-0374533557', 'Psychology', 'Two systems that drive the way we think.', 2011, 2, 2),
  ('The Lean Startup', 'Eric Ries', '978-0307887894', 'Business', 'How to build a successful startup using lean methodology.', 2011, 2, 2);
