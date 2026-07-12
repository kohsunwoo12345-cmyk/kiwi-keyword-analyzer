-- BYGENCY D1 스키마
-- Functions가 최초 요청 시 자동 생성(ensureSchema)하지만, 수동으로 적용하려면:
--   wrangler d1 execute <DB_NAME> --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company TEXT,
  plan TEXT DEFAULT 'Starter',
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_active TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
