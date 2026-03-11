-- ReelRoam Database Schema

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url          TEXT NOT NULL,
  platform            TEXT,
  title               TEXT,
  locations           JSONB,
  itinerary           JSONB,
  share_slug          TEXT UNIQUE,
  extraction_method   TEXT,
  is_pro              BOOLEAN NOT NULL DEFAULT false,
  device_id           TEXT
);

-- Trip views table
CREATE TABLE IF NOT EXISTS trip_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID REFERENCES trips(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups by share slug
CREATE INDEX IF NOT EXISTS trips_share_slug_idx ON trips(share_slug);

-- Index for faster trip view lookups by trip
CREATE INDEX IF NOT EXISTS trip_views_trip_id_idx ON trip_views(trip_id);

-- Index for device-based trip queries
CREATE INDEX IF NOT EXISTS trips_device_id_idx ON trips(device_id);
