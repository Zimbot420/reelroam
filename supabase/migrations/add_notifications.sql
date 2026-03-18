-- Migration: Add notifications system
-- Run in the Supabase SQL editor

-- ─── 1. Add push_token to profiles ──────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- ─── 2. Create notifications table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx  ON notifications (user_id, is_read) WHERE is_read = false;

-- ─── 3. RLS policies ─────────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (for server-side triggers)
-- Client can also insert for self-notifications (badge earned, etc.)
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
