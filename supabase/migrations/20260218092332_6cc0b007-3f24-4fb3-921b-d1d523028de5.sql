
-- Allow doctors to read all reminders (for tablet tracking)
CREATE POLICY "Doctors see all reminders"
ON public.reminders
FOR SELECT
USING (has_role(auth.uid(), 'doctor'::app_role));

-- Make reports bucket public so uploaded images/files can be viewed by doctors
UPDATE storage.buckets SET public = true WHERE id = 'reports';
