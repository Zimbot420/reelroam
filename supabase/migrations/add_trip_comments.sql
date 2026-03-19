-- Trip comments
CREATE TABLE IF NOT EXISTS trip_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username    TEXT,
  avatar_emoji TEXT,
  content     TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  is_edited   BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS trip_comments_trip_id_idx ON trip_comments(trip_id);
CREATE INDEX IF NOT EXISTS trip_comments_created_at_idx ON trip_comments(created_at DESC);

-- Comment count on trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- Increment/decrement helpers
CREATE OR REPLACE FUNCTION increment_comment_count(trip_id_arg UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE trips SET comment_count = comment_count + 1 WHERE id = trip_id_arg;
$$;

CREATE OR REPLACE FUNCTION decrement_comment_count(trip_id_arg UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE trips SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = trip_id_arg;
$$;

-- RLS policies
ALTER TABLE trip_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read"   ON trip_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON trip_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "comments_delete" ON trip_comments FOR DELETE USING (true);
