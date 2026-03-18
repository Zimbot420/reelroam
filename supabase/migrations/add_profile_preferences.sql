-- Migration: Add profile preferences + delete account function
-- Run in the Supabase SQL editor

-- ─── 1. Add preference columns to profiles ────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS travel_style         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_trip_length TEXT,
  ADD COLUMN IF NOT EXISTS show_bucketlist       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_been_there       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_badges           BOOLEAN NOT NULL DEFAULT true;

-- ─── 2. Delete user account data ──────────────────────────────────────────────
-- Called from the client when user requests account deletion.
-- Removes all personal data. auth.users row is signed out client-side.

CREATE OR REPLACE FUNCTION delete_user_account(p_device_id text, p_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM trip_saves  WHERE device_id = p_device_id OR (p_user_id IS NOT NULL AND user_id = p_user_id);
  DELETE FROM trip_likes  WHERE device_id = p_device_id OR (p_user_id IS NOT NULL AND user_id = p_user_id);
  DELETE FROM user_badges WHERE device_id = p_device_id OR (p_user_id IS NOT NULL AND user_id = p_user_id);
  DELETE FROM trips       WHERE device_id = p_device_id OR (p_user_id IS NOT NULL AND user_id = p_user_id);
  DELETE FROM profiles    WHERE device_id = p_device_id OR (p_user_id IS NOT NULL AND user_id = p_user_id);
END;
$$;
