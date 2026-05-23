
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor');

-- User roles table (per security requirements - roles separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  blood_group TEXT,
  age INTEGER,
  specialization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  extracted_data JSONB,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reminders table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Emergency profiles
CREATE TABLE public.emergency_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  blood_group TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  diseases TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_profiles ENABLE ROW LEVEL SECURITY;

-- Risk records
CREATE TABLE public.risk_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  age INTEGER,
  weight NUMERIC,
  bp TEXT,
  sugar_level NUMERIC,
  risk_score TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_records ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS: user_roles - users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS: profiles
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS: reports
CREATE POLICY "Patients see own reports" ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors see all reports" ON public.reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Patients insert own reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients delete own reports" ON public.reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS: reminders
CREATE POLICY "Patients see own reminders" ON public.reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Patients insert own reminders" ON public.reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients update own reminders" ON public.reminders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Patients delete own reminders" ON public.reminders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS: emergency_profiles
CREATE POLICY "Patients see own emergency" ON public.emergency_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors see all emergencies" ON public.emergency_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Patients insert own emergency" ON public.emergency_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients update own emergency" ON public.emergency_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS: risk_records
CREATE POLICY "Patients see own risks" ON public.risk_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Doctors see all risks" ON public.risk_records
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Patients insert own risks" ON public.risk_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients update own risks" ON public.risk_records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Patients delete own risks" ON public.risk_records
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger: auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, mobile, blood_group, age, specialization)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    COALESCE(NEW.raw_user_meta_data->>'blood_group', ''),
    (NEW.raw_user_meta_data->>'age')::INTEGER,
    COALESCE(NEW.raw_user_meta_data->>'specialization', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::app_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

CREATE POLICY "Patients upload own reports" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Patients view own reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Doctors view all reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Patients delete own reports" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
