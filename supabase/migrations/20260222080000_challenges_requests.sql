-- =============================================
-- Reading Challenges & Book Requests
-- Run this in Supabase SQL Editor
-- =============================================

-- Reading Challenges
CREATE TABLE public.reading_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_books integer NOT NULL DEFAULT 5,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges"
  ON public.reading_challenges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own challenges"
  ON public.reading_challenges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own challenges"
  ON public.reading_challenges FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own challenges"
  ON public.reading_challenges FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Book Requests / Donations
CREATE TABLE public.book_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  reason text,
  type text NOT NULL CHECK (type IN ('donation', 'request')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- Users can view all requests/donations
CREATE POLICY "Anyone can view requests"
  ON public.book_requests FOR SELECT TO authenticated
  USING (true);

-- Users can create own requests
CREATE POLICY "Users can create requests"
  ON public.book_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own pending requests
CREATE POLICY "Users can update own pending requests"
  ON public.book_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- Staff can manage all requests
CREATE POLICY "Staff can manage requests"
  ON public.book_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'librarian'::app_role));
