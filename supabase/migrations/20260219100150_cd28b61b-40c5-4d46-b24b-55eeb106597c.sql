
-- Medicine logs: track when patients take their medicine
CREATE TABLE public.medicine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  taken_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(reminder_id, taken_date)
);

ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients insert own logs" ON public.medicine_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients see own logs" ON public.medicine_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Patients delete own logs" ON public.medicine_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Doctors see all logs" ON public.medicine_logs
  FOR SELECT USING (has_role(auth.uid(), 'doctor'::app_role));

-- SMS logs: track sent/simulated SMS messages
CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  phone_number text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'simulated',
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients see own sms logs" ON public.sms_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors see all sms logs" ON public.sms_logs
  FOR SELECT USING (has_role(auth.uid(), 'doctor'::app_role));

-- Allow service role to insert sms_logs (edge function uses service role)
CREATE POLICY "Service can insert sms logs" ON public.sms_logs
  FOR INSERT WITH CHECK (true);

-- Enable realtime for medicine_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_logs;
