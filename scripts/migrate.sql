CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(12) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'franchise',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by INT REFERENCES users(id)
);

-- Seed the default HQ admin account (username: admin000001, password: Admin123456)
-- password_hash is bcrypt of 'Admin123456'
INSERT INTO users (username, password_hash, role, status)
VALUES (
  'admin000001',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  'approved'
)
ON CONFLICT (username) DO NOTHING;
