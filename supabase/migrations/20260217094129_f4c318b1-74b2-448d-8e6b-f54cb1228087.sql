
-- Allow doctors to read all user_roles (needed to identify patients)
CREATE POLICY "Doctors can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));
