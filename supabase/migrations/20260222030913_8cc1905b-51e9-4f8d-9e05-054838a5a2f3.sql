
-- Fix: Remove overly permissive INSERT policy on activity_log
-- Triggers use SECURITY DEFINER so they bypass RLS anyway
DROP POLICY "System can insert activity" ON public.activity_log;
