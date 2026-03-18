-- Migration: Create missing tables + Add Supabase Auth support
-- Run this in the Supabase SQL editor

-- ─── 1. Add missing columns to trips ─────────────────────────────────────────

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS is_public          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS username           TEXT,
  ADD COLUMN IF NOT EXISTS user_avatar_emoji  TEXT,
  ADD COLUMN IF NOT EXISTS like_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS trips_user_id_idx   ON trips(user_id);
CREATE INDEX IF NOT EXISTS trips_is_public_idx ON trips(is_public);

-- ─── 2. Create profiles table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id     TEXT UNIQUE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT,
  username      TEXT,
  avatar_emoji  TEXT NOT NULL DEFAULT '🌍'
);

CREATE INDEX IF NOT EXISTS profiles_device_id_idx ON profiles(device_id);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx   ON profiles(user_id);

-- ─── 3. Create trip_likes table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  device_id   TEXT,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (trip_id, device_id)
);

CREATE INDEX IF NOT EXISTS trip_likes_trip_id_idx ON trip_likes(trip_id);

-- ─── 4. Create trip_saves table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_saves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  device_id   TEXT,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (trip_id, device_id)
);

CREATE INDEX IF NOT EXISTS trip_saves_trip_id_idx ON trip_saves(trip_id);

-- ─── 5. RPC helpers (like/save counts) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_like_count(trip_id_arg uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE trips SET like_count = like_count + 1 WHERE id = trip_id_arg;
$$;

CREATE OR REPLACE FUNCTION decrement_like_count(trip_id_arg uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE trips SET like_count = GREATEST(0, like_count - 1) WHERE id = trip_id_arg;
$$;

CREATE OR REPLACE FUNCTION increment_save_count(trip_id_arg uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE trips SET save_count = save_count + 1 WHERE id = trip_id_arg;
$$;

CREATE OR REPLACE FUNCTION decrement_save_count(trip_id_arg uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE trips SET save_count = GREATEST(0, save_count - 1) WHERE id = trip_id_arg;
$$;

-- ─── 6. Feed RPC ──────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_feed_trips(integer, integer);

CREATE OR REPLACE FUNCTION get_feed_trips(page_offset int, page_limit int)
RETURNS SETOF trips LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM trips
  WHERE is_public = true
  ORDER BY created_at DESC
  LIMIT page_limit OFFSET page_offset;
$$;

-- ─── 7. Enable RLS ────────────────────────────────────────────────────────────

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips     ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_saves ENABLE ROW LEVEL SECURITY;

-- ─── 8. RLS policies: profiles ───────────────────────────────────────────────

CREATE POLICY "profiles_public_read"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ─── 9. RLS policies: trips ───────────────────────────────────────────────────

CREATE POLICY "trips_read"
  ON trips FOR SELECT
  USING (is_public = true OR auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "trips_insert"
  ON trips FOR INSERT WITH CHECK (true);

CREATE POLICY "trips_update_own"
  ON trips FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ─── 10. RLS policies: likes & saves ─────────────────────────────────────────

CREATE POLICY "likes_read"   ON trip_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON trip_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "likes_delete" ON trip_likes FOR DELETE USING (true);

CREATE POLICY "saves_read"   ON trip_saves FOR SELECT USING (true);
CREATE POLICY "saves_insert" ON trip_saves FOR INSERT WITH CHECK (true);
CREATE POLICY "saves_delete" ON trip_saves FOR DELETE USING (true);

-- ─── 11. Device → user migration function ────────────────────────────────────
-- Called automatically after sign-up to link anonymous data to the new account.
-- Usage: SELECT migrate_device_to_user('device-id-here', 'user-uuid-here');

CREATE OR REPLACE FUNCTION migrate_device_to_user(p_device_id text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE trips      SET user_id = p_user_id WHERE device_id = p_device_id AND user_id IS NULL;
  UPDATE profiles   SET user_id = p_user_id WHERE device_id = p_device_id AND user_id IS NULL;
  UPDATE trip_likes SET user_id = p_user_id WHERE device_id = p_device_id AND user_id IS NULL;
  UPDATE trip_saves SET user_id = p_user_id WHERE device_id = p_device_id AND user_id IS NULL;
END;
$$;
