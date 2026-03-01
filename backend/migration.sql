-- ============================================================
-- ShelfWise: Supabase -> Self-Hosted PostgreSQL Migration
-- ============================================================
-- This script transforms the Supabase schema into a standalone
-- PostgreSQL schema with a custom `users` table replacing
-- Supabase's `auth.users`.
--
-- Run this on a FRESH PostgreSQL database.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enum ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'librarian', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Users table (replaces Supabase auth.users) ───────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  is_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── User Roles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE(user_id, role)
);

-- ── Books ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE,
  genre TEXT,
  description TEXT,
  cover_image_url TEXT,
  publication_year INTEGER,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Borrowings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  borrowed_at TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  issued_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Reservations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reserved_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','ready','fulfilled','cancelled')),
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(book_id, user_id, status)
);

-- ── Notifications ────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Library Settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Book Reviews ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- ── Reading Lists ────────────────────────────────────
CREATE TABLE IF NOT EXISTS reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- ── Fines ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_id UUID NOT NULL REFERENCES borrowings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  waived BOOLEAN DEFAULT FALSE,
  waived_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Activity Log ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Book Tags ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(book_id, tag)
);

-- ── Waitlist ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 1,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(book_id, user_id)
);

-- ── Reading Challenges ───────────────────────────────
CREATE TABLE IF NOT EXISTS reading_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_books INTEGER DEFAULT 5,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Book Requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  reason TEXT,
  type TEXT NOT NULL CHECK (type IN ('donation','request')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','fulfilled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════
-- TRIGGER FUNCTIONS (preserved from Supabase schema)
-- ══════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Manage available copies on borrow/return
CREATE OR REPLACE FUNCTION manage_available_copies()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE books SET available_copies = available_copies - 1 WHERE id = NEW.book_id AND available_copies > 0;
  ELSIF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    UPDATE books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
  ELSIF TG_OP = 'DELETE' AND OLD.returned_at IS NULL THEN
    UPDATE books SET available_copies = available_copies + 1 WHERE id = OLD.book_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_manage_available_copies
  AFTER INSERT OR UPDATE OR DELETE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION manage_available_copies();

-- Notify on book issued
CREATE OR REPLACE FUNCTION notify_on_book_issued()
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
BEGIN
  SELECT title INTO book_title FROM books WHERE id = NEW.book_id;
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, 'Book Issued: ' || book_title, 'You have borrowed "' || book_title || '". Due: ' || to_char(NEW.due_date, 'Mon DD, YYYY'), 'borrow', '/books/' || NEW.book_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_book_issued
  AFTER INSERT ON borrowings
  FOR EACH ROW EXECUTE FUNCTION notify_on_book_issued();

-- Notify on book returned
CREATE OR REPLACE FUNCTION notify_on_book_returned()
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
BEGIN
  IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    SELECT title INTO book_title FROM books WHERE id = NEW.book_id;
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id, 'Book Returned: ' || book_title, 'You have returned "' || book_title || '".', 'return', '/books/' || NEW.book_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_on_book_returned
  AFTER UPDATE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION notify_on_book_returned();

-- Auto-create fine on overdue return
CREATE OR REPLACE FUNCTION auto_create_fine()
RETURNS TRIGGER AS $$
DECLARE
  fine_rate NUMERIC(10,2);
  days_overdue INTEGER;
  fine_amount NUMERIC(10,2);
BEGIN
  IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    IF NEW.returned_at > NEW.due_date THEN
      SELECT COALESCE(value::NUMERIC, 1.00) INTO fine_rate
      FROM library_settings WHERE key = 'fine_per_day';

      days_overdue := EXTRACT(DAY FROM (NEW.returned_at - NEW.due_date));
      IF days_overdue < 1 THEN days_overdue := 1; END IF;

      fine_amount := days_overdue * fine_rate;

      INSERT INTO fines (borrowing_id, user_id, amount)
      VALUES (NEW.id, NEW.user_id, fine_amount);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_fine
  AFTER UPDATE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION auto_create_fine();

-- Log book CRUD activity
CREATE OR REPLACE FUNCTION log_book_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (NULL, 'book_created', 'book', NEW.id::TEXT, jsonb_build_object('title', NEW.title, 'author', NEW.author));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (NULL, 'book_updated', 'book', NEW.id::TEXT, jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (NULL, 'book_deleted', 'book', OLD.id::TEXT, jsonb_build_object('title', OLD.title));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_book_activity
  AFTER INSERT OR UPDATE OR DELETE ON books
  FOR EACH ROW EXECUTE FUNCTION log_book_activity();

-- Log borrowing activity
CREATE OR REPLACE FUNCTION log_borrowing_activity()
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
BEGIN
  SELECT title INTO book_title FROM books WHERE id = NEW.book_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.issued_by, 'book_borrowed', 'borrowing', NEW.id::TEXT, jsonb_build_object('book', book_title, 'member_id', NEW.user_id));
  ELSIF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.user_id, 'book_returned', 'borrowing', NEW.id::TEXT, jsonb_build_object('book', book_title));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_borrowing_activity
  AFTER INSERT OR UPDATE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION log_borrowing_activity();

-- Log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.user_id, 'role_changed', 'user_role', NEW.user_id::TEXT, jsonb_build_object('old_role', OLD.role::TEXT, 'new_role', NEW.role::TEXT));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_role_change
  AFTER UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_role_change();

-- Notify waitlist on book return
CREATE OR REPLACE FUNCTION notify_waitlist_on_return()
RETURNS TRIGGER AS $$
DECLARE
  book_title TEXT;
  next_user RECORD;
BEGIN
  IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    SELECT title INTO book_title FROM books WHERE id = NEW.book_id;
    SELECT * INTO next_user FROM waitlist
      WHERE book_id = NEW.book_id AND notified = FALSE
      ORDER BY position ASC LIMIT 1;

    IF next_user IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (next_user.user_id, 'Book Available: ' || book_title,
              '"' || book_title || '" is now available! You are next on the waitlist.',
              'waitlist', '/books/' || NEW.book_id);
      UPDATE waitlist SET notified = TRUE WHERE id = next_user.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_waitlist_on_return
  AFTER UPDATE ON borrowings
  FOR EACH ROW EXECUTE FUNCTION notify_waitlist_on_return();

-- ══════════════════════════════════════════════════════
-- SEED DATA
-- ══════════════════════════════════════════════════════

-- Library settings
INSERT INTO library_settings (key, value) VALUES
  ('default_loan_days', '14'),
  ('max_borrows_per_member', '5'),
  ('library_name', 'ShelfWise Library'),
  ('reservation_expiry_days', '3'),
  ('fine_per_day', '1.00')
ON CONFLICT (key) DO NOTHING;

-- Sample books
INSERT INTO books (title, author, isbn, genre, total_copies, available_copies, description, publication_year, cover_image_url) VALUES
  ('To Kill a Mockingbird', 'Harper Lee', '9780061120084', 'Fiction', 3, 3, 'A novel about racial injustice in the American South.', 1960, 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg'),
  ('1984', 'George Orwell', '9780451524935', 'Science Fiction', 2, 2, 'A dystopian novel set in a totalitarian society.', 1949, 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg'),
  ('Pride and Prejudice', 'Jane Austen', '9780141439518', 'Romance', 4, 4, 'A classic romance novel.', 1813, 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg'),
  ('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Fiction', 3, 3, 'A story of decadence and idealism.', 1925, 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg'),
  ('The Catcher in the Rye', 'J.D. Salinger', '9780316769488', 'Fiction', 2, 2, 'A novel about teenage alienation.', 1951, 'https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg'),
  ('The Hobbit', 'J.R.R. Tolkien', '9780547928227', 'Fantasy', 5, 5, 'A fantasy adventure novel.', 1937, 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg'),
  ('Fahrenheit 451', 'Ray Bradbury', '9781451673319', 'Science Fiction', 2, 2, 'A novel about a future society where books are banned.', 1953, 'https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg'),
  ('Brave New World', 'Aldous Huxley', '9780060850524', 'Science Fiction', 3, 3, 'A dystopian novel set in a technologically advanced future.', 1932, 'https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg'),
  ('The Lord of the Rings', 'J.R.R. Tolkien', '9780618640157', 'Fantasy', 4, 4, 'An epic high-fantasy novel.', 1954, 'https://covers.openlibrary.org/b/isbn/9780618640157-L.jpg'),
  ('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '9780590353427', 'Fantasy', 6, 6, 'The first book in the Harry Potter series.', 1997, 'https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg'),
  ('Animal Farm', 'George Orwell', '9780451526342', 'Fiction', 2, 2, 'A satirical allegory about Soviet totalitarianism.', 1945, 'https://covers.openlibrary.org/b/isbn/9780451526342-L.jpg'),
  ('The Alchemist', 'Paulo Coelho', '9780062315007', 'Fiction', 3, 3, 'A philosophical novel about following your dreams.', 1988, 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg'),
  ('Moby Dick', 'Herman Melville', '9780142437247', 'Fiction', 2, 2, 'A story of Captain Ahab''s obsessive quest.', 1851, 'https://covers.openlibrary.org/b/isbn/9780142437247-L.jpg'),
  ('War and Peace', 'Leo Tolstoy', '9781400079988', 'Fiction', 2, 2, 'A sweeping narrative of Russian society.', 1869, 'https://covers.openlibrary.org/b/isbn/9781400079988-L.jpg'),
  ('The Odyssey', 'Homer', '9780140268867', 'Fiction', 3, 3, 'An ancient Greek epic poem.', -800, 'https://covers.openlibrary.org/b/isbn/9780140268867-L.jpg'),
  ('Don Quixote', 'Miguel de Cervantes', '9780060934347', 'Fiction', 2, 2, 'A novel about a man who becomes a knight-errant.', 1605, 'https://covers.openlibrary.org/b/isbn/9780060934347-L.jpg'),
  ('Jane Eyre', 'Charlotte Bronte', '9780141441146', 'Romance', 3, 3, 'A novel about a young woman''s moral and spiritual development.', 1847, 'https://covers.openlibrary.org/b/isbn/9780141441146-L.jpg'),
  ('Wuthering Heights', 'Emily Bronte', '9780141439556', 'Romance', 2, 2, 'A tale of passionate love on the Yorkshire moors.', 1847, 'https://covers.openlibrary.org/b/isbn/9780141439556-L.jpg'),
  ('The Picture of Dorian Gray', 'Oscar Wilde', '9780141439570', 'Fiction', 2, 2, 'A philosophical novel about beauty and corruption.', 1890, 'https://covers.openlibrary.org/b/isbn/9780141439570-L.jpg'),
  ('Crime and Punishment', 'Fyodor Dostoevsky', '9780140449136', 'Fiction', 2, 2, 'A psychological novel about guilt and redemption.', 1866, 'https://covers.openlibrary.org/b/isbn/9780140449136-L.jpg')
ON CONFLICT (isbn) DO NOTHING;

-- Create a default admin user (password: admin123)
-- bcrypt hash for "admin123"
INSERT INTO users (id, email, hashed_password, is_email_verified) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@shelfwise.com', '$2b$12$kRmZ60g1pum6eF.DU8KjDeXYtJOKLCLMnu63YDvKkpxwpQkCxWnAi', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin User')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- ══════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_returned_at ON borrowings(returned_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_fines_user_id ON fines(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
