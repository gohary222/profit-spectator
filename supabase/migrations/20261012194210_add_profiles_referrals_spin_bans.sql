/*
# Add profiles table, referral codes, spin wheel tracking, user bans, Binance USDT

## Overview
Adds per-user profile data (name, avatar from Google OAuth), referral codes,
daily spin wheel tracking, and ban support for admin.

## 1. New Tables
- `profiles`: per-user profile data (one row per user, auto-created on signup)
  - `user_id` (uuid, PK, references auth.users ON DELETE CASCADE)
  - `display_name` (text, not null, default '')
  - `avatar_url` (text, nullable)
  - `referral_code` (text, unique, not null)
  - `banned` (boolean, not null, default false)
  - `created_at` (timestamptz)

- `spin_history`: tracks daily spin wheel usage
  - `id` (uuid, PK)
  - `user_id` (uuid, not null, default auth.uid(), references auth.users ON DELETE CASCADE)
  - `prize` (int, not null)
  - `spun_at` (date, not null, default CURRENT_DATE)

## 2. Security
- profiles: owner-scoped SELECT/UPDATE; INSERT auto-created via trigger
- spin_history: owner-scoped SELECT/INSERT
- Admin ban function: SECURITY DEFINER, requires admin code

## 3. Notes
- A trigger auto-creates a profile row when a new auth.users row is inserted
- Referral code is generated as "PS-" + first 6 chars of UUID
- Banned users are checked client-side; admin can toggle ban
*/

-- 1. profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  referral_code text UNIQUE NOT NULL,
  banned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. spin_history table
CREATE TABLE IF NOT EXISTS spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prize int NOT NULL DEFAULT 0,
  spun_at date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE spin_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_spins" ON spin_history;
CREATE POLICY "select_own_spins" ON spin_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_spins" ON spin_history;
CREATE POLICY "insert_own_spins" ON spin_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_spin_history_user_date ON spin_history(user_id, spun_at);

-- 3. Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  code := 'PS-' || substring(NEW.id::text, 1, 6);
  INSERT INTO profiles (user_id, display_name, avatar_url, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    code
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Admin ban function
CREATE OR REPLACE FUNCTION admin_toggle_ban(target_user_id uuid, admin_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF admin_code != '7392' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE profiles SET banned = NOT banned WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_toggle_ban(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, text) FROM anon;

-- 5. Admin get all users function
CREATE OR REPLACE FUNCTION admin_get_all_users(admin_code text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  referral_code text,
  banned boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF admin_code != '7392' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_users(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_get_all_users(text) FROM anon;
