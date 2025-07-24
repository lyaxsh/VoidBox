-- Files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  mimetype TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  uploader_ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  telegram_file_id TEXT, -- now nullable
  telegram_message_id TEXT, -- now nullable
  download_count INTEGER NOT NULL DEFAULT 0,
  expiry_at TIMESTAMPTZ,
  is_chunked BOOLEAN NOT NULL DEFAULT FALSE,
  total_chunks INTEGER,
  upload_state TEXT NOT NULL DEFAULT 'pending',
  last_accessed_at TIMESTAMPTZ,
  public_slug TEXT UNIQUE -- nullable, for public links
);

-- Users table (optional, for login)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abuse flags table
CREATE TABLE IF NOT EXISTS abuse_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT NOT NULL
);

-- User files table for persistent My Drops
CREATE TABLE IF NOT EXISTS user_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  mimetype TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); 

-- File chunks table for chunked uploads
CREATE TABLE IF NOT EXISTS file_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  telegram_file_id TEXT NOT NULL,
  telegram_message_id TEXT NOT NULL,
  size BIGINT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(file_id, chunk_index)
); 