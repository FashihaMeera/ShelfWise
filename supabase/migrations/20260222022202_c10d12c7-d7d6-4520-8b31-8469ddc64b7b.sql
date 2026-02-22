
-- =============================================
-- RESERVATIONS TABLE
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

-- Members can view their own reservations, admin/librarian can view all
CREATE POLICY "Users can view own reservations or staff all"
  ON public.reservations FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'librarian')
  );

-- Authenticated users can insert their own reservations
CREATE POLICY "Users can create own reservations"
  ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin/Librarian can update reservations (change status)
CREATE POLICY "Staff can update reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- Users can cancel their own reservations
CREATE POLICY "Users can cancel own reservations"
  ON public.reservations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- Admin/Librarian can delete reservations
CREATE POLICY "Staff can delete reservations"
  ON public.reservations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'librarian'));

-- =============================================
-- NOTIFICATIONS TABLE
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

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- System/staff can insert notifications for any user
CREATE POLICY "Staff can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'librarian')
    OR user_id = auth.uid()
  );

-- Users can update their own (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- LIBRARY SETTINGS TABLE
-- =============================================
CREATE TABLE public.library_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Authenticated can read settings"
  ON public.library_settings FOR SELECT TO authenticated
  USING (true);

-- Only admin can modify settings
CREATE POLICY "Admin can modify settings"
  ON public.library_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.library_settings (key, value) VALUES
  ('default_loan_days', '14'),
  ('max_borrows_per_member', '5'),
  ('library_name', 'ShelfWise Library'),
  ('reservation_expiry_days', '3');
