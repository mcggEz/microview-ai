-- Create med_tech table to store MedTech user accounts (traditional auth)

CREATE TABLE IF NOT EXISTS med_tech (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'medtech', -- future-proofing: 'admin' | 'medtech'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_med_tech_email ON med_tech(email);
CREATE INDEX IF NOT EXISTS idx_med_tech_is_active ON med_tech(is_active);

-- Comments for documentation
COMMENT ON TABLE med_tech IS 'Stores MedTech user accounts for traditional email/password authentication';
COMMENT ON COLUMN med_tech.password_hash IS 'BCrypt or Argon2 hash of the user''s password';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_med_tech_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_med_tech_updated_at ON med_tech;
CREATE TRIGGER trigger_update_med_tech_updated_at
  BEFORE UPDATE ON med_tech
  FOR EACH ROW
  EXECUTE FUNCTION update_med_tech_updated_at();


