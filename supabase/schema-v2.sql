-- ─── Schema v2: Public trip discovery feed ────────────────────────────────────

-- 1. Add social columns to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS save_count integer DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS username text DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS user_avatar_emoji text DEFAULT NULL;

-- 2. Trip likes table
CREATE TABLE IF NOT EXISTS trip_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, device_id)
);

-- 3. Trip saves table
CREATE TABLE IF NOT EXISTS trip_saves (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  device_id  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, device_id)
);

-- 4. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id     text UNIQUE NOT NULL,
  username      text UNIQUE,
  avatar_emoji  text NOT NULL DEFAULT '🌍',
  bio           text,
  trips_count   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 5. Feed function — trending public trips
CREATE OR REPLACE FUNCTION get_feed_trips(
  page_offset integer DEFAULT 0,
  page_limit  integer DEFAULT 10
)
RETURNS SETOF trips AS $$
  SELECT * FROM trips
  WHERE is_public = true
    AND itinerary IS NOT NULL
  ORDER BY
    (like_count * 2 + save_count + view_count) DESC,
    created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$ LANGUAGE sql;

-- 6. Counter functions for likes and saves
CREATE OR REPLACE FUNCTION increment_like_count(trip_id_arg uuid)
RETURNS void AS $$
  UPDATE trips SET like_count = like_count + 1 WHERE id = trip_id_arg;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION decrement_like_count(trip_id_arg uuid)
RETURNS void AS $$
  UPDATE trips SET like_count = GREATEST(like_count - 1, 0) WHERE id = trip_id_arg;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION increment_save_count(trip_id_arg uuid)
RETURNS void AS $$
  UPDATE trips SET save_count = save_count + 1 WHERE id = trip_id_arg;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION decrement_save_count(trip_id_arg uuid)
RETURNS void AS $$
  UPDATE trips SET save_count = GREATEST(save_count - 1, 0) WHERE id = trip_id_arg;
$$ LANGUAGE sql;

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_public_feed
  ON trips (is_public, like_count DESC, created_at DESC)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_trip_likes_trip_id   ON trip_likes (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_likes_device_id ON trip_likes (device_id);
CREATE INDEX IF NOT EXISTS idx_trip_saves_trip_id   ON trip_saves (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_saves_device_id ON trip_saves (device_id);
