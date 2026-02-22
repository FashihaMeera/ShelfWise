-- Create trigger for book issued notifications
CREATE TRIGGER trg_notify_on_book_issued
AFTER INSERT ON public.borrowings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_book_issued();

-- Create trigger for book returned notifications
CREATE TRIGGER trg_notify_on_book_returned
AFTER UPDATE ON public.borrowings
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_book_returned();