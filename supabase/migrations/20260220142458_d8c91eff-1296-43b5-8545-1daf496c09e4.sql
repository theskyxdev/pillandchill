
-- Create blood_banks table
CREATE TABLE public.blood_banks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  contact text,
  type text DEFAULT 'Private',
  availability text DEFAULT 'Office Hours',
  rating numeric(2,1),
  services text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_banks ENABLE ROW LEVEL SECURITY;

-- Everyone can read blood banks (public info)
CREATE POLICY "Anyone can view blood banks"
ON public.blood_banks FOR SELECT
USING (true);

-- Only doctors can insert/update blood banks
CREATE POLICY "Doctors can manage blood banks"
ON public.blood_banks FOR ALL
USING (has_role(auth.uid(), 'doctor'::app_role));

-- Create blood_donation_requests table
CREATE TABLE public.blood_donation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  blood_group text NOT NULL,
  units_needed integer NOT NULL DEFAULT 1,
  reason text,
  urgency text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  doctor_id uuid,
  doctor_note text,
  preferred_bank_id uuid REFERENCES public.blood_banks(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_donation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert own requests"
ON public.blood_donation_requests FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can view own requests"
ON public.blood_donation_requests FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view all requests"
ON public.blood_donation_requests FOR SELECT
USING (has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Doctors can update requests"
ON public.blood_donation_requests FOR UPDATE
USING (has_role(auth.uid(), 'doctor'::app_role));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_blood_donation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_blood_donation_requests_updated_at
BEFORE UPDATE ON public.blood_donation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_blood_donation_updated_at();
