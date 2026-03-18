-- Migration: Notification RPC helpers
-- Run in Supabase SQL editor after add_notifications.sql

-- ─── 1. notify_trip_owner ─────────────────────────────────────────────────────
-- Called client-side when a user likes or saves someone else's public trip.
-- Uses SECURITY DEFINER to bypass RLS so we can insert for the trip owner.

CREATE OR REPLACE FUNCTION notify_trip_owner(
  p_trip_id UUID,
  p_type    TEXT,
  p_title   TEXT,
  p_body    TEXT,
  p_data    JSONB DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- Resolve trip owner
  SELECT user_id INTO v_owner_id FROM trips WHERE id = p_trip_id;

  -- Skip if trip has no authenticated owner
  IF v_owner_id IS NULL THEN RETURN; END IF;

  -- Don't self-notify (caller is the owner)
  IF auth.uid() = v_owner_id THEN RETURN; END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (v_owner_id, p_type, p_title, p_body, p_data);
END;
$$;

-- ─── 2. check_trip_milestone ──────────────────────────────────────────────────
-- Called after a trip is saved. Fires a milestone notification if the user
-- has just hit 1 / 5 / 10 / 25 / 50 total trips.

CREATE OR REPLACE FUNCTION check_trip_milestone(
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM trips WHERE user_id = p_user_id;

  IF v_count NOT IN (1, 5, 10, 25, 50) THEN RETURN; END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    p_user_id,
    'milestone',
    CASE v_count
      WHEN 1  THEN 'First trip generated!'
      WHEN 5  THEN 'Explorer: 5 trips generated'
      WHEN 10 THEN 'Globetrotter: 10 trips generated'
      WHEN 25 THEN 'World Traveler: 25 trips!'
      WHEN 50 THEN 'Legend: 50 trips generated'
    END,
    CASE v_count
      WHEN 1  THEN 'You''ve taken your first step. Welcome to ReelRoam!'
      WHEN 5  THEN 'You''re officially an explorer. Keep going!'
      WHEN 10 THEN 'Double digits — you''re a globetrotter now!'
      WHEN 25 THEN 'World traveler status unlocked. Keep exploring!'
      WHEN 50 THEN 'That''s seriously impressive. ReelRoam salutes you.'
    END,
    jsonb_build_object('trip_count', v_count)
  );
END;
$$;

-- ─── 3. Grant execute to authenticated users ──────────────────────────────────

GRANT EXECUTE ON FUNCTION notify_trip_owner(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_trip_milestone(UUID)                        TO authenticated;
