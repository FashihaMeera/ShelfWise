-- =============================================
-- ShelfWise - Consolidated Migration (FIXED)
-- Run this in the SQL Editor of your new Supabase project
-- 
-- IMPORTANT: If you ran the previous version and got an error,
-- first reset your database via Supabase Dashboard:
-- Settings → General → Danger Zone → "Reset Database"
-- Then run this script.
-- =============================================

-- =============================================
-- 1. ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'librarian', 'member');

-- =============================================
-- 2. UTILITY FUNCTIONS (no table dependencies)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 3. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. USER_ROLES TABLE
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 5. has_role() FUNCTION (AFTER user_roles table exists)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- 6. AUTO-CREATE PROFILE & ROLE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. BOOKS TABLE
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

CREATE POLICY "Authenticated users can view books"
  ON public.books FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/Librarian can insert books"
  ON public.books FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

CREATE POLICY "Admin/Librarian can update books"
  ON public.books FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

CREATE POLICY "Admin/Librarian can delete books"
  ON public.books FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. BORROWINGS TABLE
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

CREATE POLICY "Members can view own borrowings"
  ON public.borrowings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'librarian')
  );

CREATE POLICY "Admin/Librarian can insert borrowings"
  ON public.borrowings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

CREATE POLICY "Admin/Librarian can update borrowings"
  ON public.borrowings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- Auto-manage available_copies
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

-- Admin/Librarian can view all profiles
CREATE POLICY "Admin/Librarian can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- =============================================
-- 9. RESERVATIONS TABLE
-- =============================================
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'fulfilled', 'cancelled')),
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id, status)
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations or staff all"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'librarian')
  );

CREATE POLICY "Users can create own reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can update reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

CREATE POLICY "Users can cancel own reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Staff can delete reservations"
  ON public.reservations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- =============================================
-- 10. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'librarian')
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- 11. LIBRARY SETTINGS TABLE
-- =============================================
CREATE TABLE public.library_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read settings"
  ON public.library_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can modify settings"
  ON public.library_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 12. NOTIFICATION TRIGGERS
-- =============================================

-- Trigger: auto-create notification when a book is issued
CREATE OR REPLACE FUNCTION public.notify_on_book_issued()
RETURNS TRIGGER AS $$
DECLARE
  _book_title TEXT;
BEGIN
  SELECT title INTO _book_title FROM public.books WHERE id = NEW.book_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'Book Issued',
    'You borrowed "' || COALESCE(_book_title, 'Unknown') || '". Due by ' || to_char(NEW.due_date, 'Mon DD, YYYY') || '.',
    'book_issued',
    '/borrow-return'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_book_issued
  AFTER INSERT ON public.borrowings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_book_issued();

-- Trigger: auto-create notification when a book is returned
CREATE OR REPLACE FUNCTION public.notify_on_book_returned()
RETURNS TRIGGER AS $$
DECLARE
  _book_title TEXT;
BEGIN
  IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    SELECT title INTO _book_title FROM public.books WHERE id = NEW.book_id;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Book Returned',
      'You returned "' || COALESCE(_book_title, 'Unknown') || '". Thank you!',
      'book_returned',
      '/borrow-return'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_book_returned
  AFTER UPDATE ON public.borrowings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_book_returned();

-- =============================================
-- 13. BOOK REVIEWS TABLE
-- =============================================
CREATE TABLE public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view reviews"
  ON public.book_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reviews"
  ON public.book_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON public.book_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reviews"
  ON public.book_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_book_reviews_updated_at
  BEFORE UPDATE ON public.book_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 14. READING LISTS TABLE
-- =============================================
CREATE TABLE public.reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading list"
  ON public.reading_lists FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add to own reading list"
  ON public.reading_lists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove from own reading list"
  ON public.reading_lists FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 15. FINES TABLE
-- =============================================
CREATE TABLE public.fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id uuid NOT NULL REFERENCES public.borrowings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  waived boolean NOT NULL DEFAULT false,
  waived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fines"
  ON public.fines FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all fines"
  ON public.fines FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

CREATE POLICY "Staff can update fines"
  ON public.fines FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- =============================================
-- 16. ACTIVITY LOG TABLE
-- =============================================
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all activity"
  ON public.activity_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- 17. AUTO-CREATE FINE ON OVERDUE RETURN
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_create_fine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _days_overdue integer;
  _rate numeric;
BEGIN
  IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    _days_overdue := GREATEST(0, EXTRACT(DAY FROM (NEW.returned_at::timestamp - NEW.due_date::timestamp))::integer);
    IF _days_overdue > 0 THEN
      SELECT COALESCE(value::numeric, 1.00) INTO _rate
        FROM public.library_settings WHERE key = 'fine_per_day';
      INSERT INTO public.fines (borrowing_id, user_id, amount)
      VALUES (NEW.id, NEW.user_id, _days_overdue * _rate);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_fine
  AFTER UPDATE ON public.borrowings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_fine();

-- =============================================
-- 18. ACTIVITY LOG TRIGGERS
-- =============================================

-- Log activity on book changes
CREATE OR REPLACE FUNCTION public.log_book_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'book_added', 'book', NEW.id, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'book_updated', 'book', NEW.id, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'book_deleted', 'book', OLD.id, jsonb_build_object('title', OLD.title));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_book_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.log_book_activity();

-- Log borrowing activity
CREATE OR REPLACE FUNCTION public.log_borrowing_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _book_title text;
BEGIN
  SELECT title INTO _book_title FROM public.books WHERE id = NEW.book_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (COALESCE(NEW.issued_by, auth.uid()), 'book_issued', 'borrowing', NEW.id,
      jsonb_build_object('book_title', _book_title, 'borrower_id', NEW.user_id));
  ELSIF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'book_returned', 'borrowing', NEW.id,
      jsonb_build_object('book_title', _book_title, 'borrower_id', NEW.user_id));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_borrowing_activity
  AFTER INSERT OR UPDATE ON public.borrowings
  FOR EACH ROW EXECUTE FUNCTION public.log_borrowing_activity();

-- Log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), 'role_changed', 'user_role', NEW.id,
      jsonb_build_object('target_user_id', NEW.user_id, 'old_role', OLD.role::text, 'new_role', NEW.role::text));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_role_change
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- =============================================
-- 19. SEED DATA
-- =============================================

-- Default library settings
INSERT INTO public.library_settings (key, value) VALUES
  ('default_loan_days', '14'),
  ('max_borrows_per_member', '5'),
  ('library_name', 'ShelfWise Library'),
  ('reservation_expiry_days', '3'),
  ('fine_per_day', '1.00');

-- Sample books
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
