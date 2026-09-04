-- Add clinic working hours and open days to clinic_profile table
ALTER TABLE clinic_profile
ADD COLUMN IF NOT EXISTS working_days text[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
ADD COLUMN IF NOT EXISTS open_time text DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS close_time text DEFAULT '19:00';

-- Add optional birth_date and gender to appointment_requests
ALTER TABLE appointment_requests
ADD COLUMN IF NOT EXISTS birth_date text,
ADD COLUMN IF NOT EXISTS gender text;
