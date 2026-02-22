
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
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_book_issued();

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
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_book_returned();
