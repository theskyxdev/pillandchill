
-- Fix overly permissive INSERT policy on sms_logs
-- Drop the permissive policy and restrict to service role only via a function
DROP POLICY "Service can insert sms logs" ON public.sms_logs;

-- Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely,
-- so no INSERT policy is needed for the edge function.
-- Only allow users to see their own logs (already covered by existing policies).
