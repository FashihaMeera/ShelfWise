
-- =============================================
-- 1. book_reviews table
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
-- 2. reading_lists table
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
-- 3. fines table
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
-- 4. activity_log table
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

-- Allow inserts from triggers (security definer functions)
CREATE POLICY "System can insert activity"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- 5. Seed fine_per_day setting
-- =============================================
INSERT INTO public.library_settings (key, value)
VALUES ('fine_per_day', '1.00')
ON CONFLICT DO NOTHING;

-- =============================================
-- 6. Trigger: Auto-create fines on overdue return
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
-- 7. Trigger: Log activity on books changes
-- =============================================
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

-- =============================================
-- 8. Trigger: Log borrowing activity
-- =============================================
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

-- =============================================
-- 9. Trigger: Log role changes
-- =============================================
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
