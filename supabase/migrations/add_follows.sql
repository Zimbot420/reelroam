-- Follows table — social graph
CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  follower_device_id  TEXT NOT NULL,
  follower_user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_username  TEXT NOT NULL,
  UNIQUE (follower_device_id, following_username)
);

CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_device_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_username);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_read"   ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "follows_delete" ON follows FOR DELETE USING (true);
