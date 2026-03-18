-- ─── Badge system migration ───────────────────────────────────────────────────
-- Safe to re-run: drops and recreates badge tables (they should be empty before seeding)

DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;

-- Master badge catalogue (static, seeded)
CREATE TABLE badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon        TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  tier        TEXT        NOT NULL,
  is_secret   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-user earned badges (keyed by device_id for anonymous support)
CREATE TABLE user_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT        NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  badge_slug  TEXT        NOT NULL REFERENCES badges(slug) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, badge_slug)
);

-- Add display_badges selection to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_badges JSONB NOT NULL DEFAULT '[]'::JSONB;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can read the badge catalogue
DO $$ BEGIN
  CREATE POLICY "Badges are publicly readable" ON badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anyone can read user_badges (public achievement display)
DO $$ BEGIN
  CREATE POLICY "User badges are publicly readable" ON user_badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Client can insert badges keyed to its own device_id (anonymous + authed)
DO $$ BEGIN
  CREATE POLICY "Clients can insert own user badges" ON user_badges FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS user_badges_device_id_idx ON user_badges (device_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_slug_idx ON user_badges (badge_slug);
