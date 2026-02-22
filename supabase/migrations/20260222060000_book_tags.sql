-- =============================================
-- Book Tags System
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE public.book_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(book_id, tag)
);

ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view tags
CREATE POLICY "Anyone can view tags"
  ON public.book_tags FOR SELECT TO authenticated
  USING (true);

-- Staff can insert tags
CREATE POLICY "Staff can insert tags"
  ON public.book_tags FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));

-- Staff can delete tags
CREATE POLICY "Staff can delete tags"
  ON public.book_tags FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));
