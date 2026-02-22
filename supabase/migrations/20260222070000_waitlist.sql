-- =============================================
-- Waitlist System
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, user_id)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Staff can view all waitlist entries
CREATE POLICY "Staff can view all waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- Users can join waitlist
CREATE POLICY "Users can join waitlist"
  ON public.waitlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can leave waitlist
CREATE POLICY "Users can leave waitlist"
  ON public.waitlist FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Staff can manage waitlist
CREATE POLICY "Staff can manage waitlist"
  ON public.waitlist FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- Function to auto-notify first person on waitlist when book is returned
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _waitlist_entry RECORD;
BEGIN
  -- Only trigger when a book is returned (returned_at set from NULL)
  IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    -- Find the first person on the waitlist for this book
    SELECT * INTO _waitlist_entry
    FROM public.waitlist
    WHERE book_id = NEW.book_id AND notified = false
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    IF _waitlist_entry IS NOT NULL THEN
      -- Create notification
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        _waitlist_entry.user_id,
        'Book Available!',
        'A book you were waiting for is now available. Check it out before someone else does!',
        'success'
      );

      -- Mark as notified
      UPDATE public.waitlist SET notified = true WHERE id = _waitlist_entry.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_waitlist_on_return
  AFTER UPDATE ON public.borrowings
  FOR EACH ROW
  EXECUTE FUNCTION notify_waitlist_on_return();
