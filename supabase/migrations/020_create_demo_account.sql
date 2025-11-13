-- Create a single demo account for users to try the application
-- Email: demo@microview.ai
-- Password: demo123

INSERT INTO med_tech (email, password_hash, full_name, role, is_active)
VALUES (
  'demo@microview.ai',
  '$2b$10$HhIdKwx.nIltzcbFL2xGhe/pSZ8ELsXq9FAagK5.rVaYLa.RwM8We', -- Password: demo123
  'Demo User',
  'medtech',
  true
)
ON CONFLICT (email) DO NOTHING;

