-- Migration: Add past trips support
-- Run in the Supabase SQL editor

-- ─── 1. Add past trip columns to trips ────────────────────────────────────────

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS is_past_trip      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visited_start     TEXT,   -- 'YYYY-MM' or 'YYYY-MM-DD'
  ADD COLUMN IF NOT EXISTS visited_end       TEXT,
  ADD COLUMN IF NOT EXISTS approximate_dates BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating            INTEGER CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS mood_tags         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trip_highlights   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trip_note         TEXT,
  ADD COLUMN IF NOT EXISTS cover_url         TEXT;

CREATE INDEX IF NOT EXISTS trips_is_past_trip_idx ON trips(is_past_trip);

-- ─── 2. Create user_badges table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT,
  badge_key   TEXT NOT NULL,
  badge_emoji TEXT NOT NULL,
  badge_name  TEXT NOT NULL,
  badge_tier  TEXT NOT NULL DEFAULT 'common'
);

CREATE UNIQUE INDEX IF NOT EXISTS user_badges_unique_device
  ON user_badges (badge_key, device_id)
  WHERE device_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_badges_unique_user
  ON user_badges (badge_key, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_badges_device_id_idx ON user_badges(device_id);
CREATE INDEX IF NOT EXISTS user_badges_user_id_idx   ON user_badges(user_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_public_read" ON user_badges FOR SELECT USING (true);
CREATE POLICY "badges_insert"      ON user_badges FOR INSERT WITH CHECK (true);
CREATE POLICY "badges_delete"      ON user_badges FOR DELETE USING (true);

-- ─── 3. RPC: get past trips for a device/user ──────────────────────────────────

CREATE OR REPLACE FUNCTION get_past_trips(p_device_id text, p_user_id uuid DEFAULT NULL)
RETURNS SETOF trips LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM trips
  WHERE is_past_trip = true
    AND (device_id = p_device_id OR (p_user_id IS NOT NULL AND user_id = p_user_id))
  ORDER BY created_at DESC;
$$;
