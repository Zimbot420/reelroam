-- Add visited_countries column to profiles table
-- Each entry is an ISO 3166-1 alpha-2 country code (e.g. 'FR', 'JP')
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS visited_countries text[] NOT NULL DEFAULT '{}';

-- Index for fast membership queries
CREATE INDEX IF NOT EXISTS profiles_visited_countries_idx
  ON profiles USING GIN (visited_countries);
