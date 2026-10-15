/*
# Create Profit Spectator tables (single-tenant, no auth)

1. New Tables
- `user_points`: single row tracking the user's current points balance.
  - `id` (int, primary key, fixed = 1)
  - `points` (int, not null, default 0) — current points
  - `total_earned` (int, not null, default 0) — lifetime points earned
  - `updated_at` (timestamptz)
- `transactions`: log of every points change.
  - `id` (uuid, primary key)
  - `type` (text) — 'ad', 'daily_task', 'referral', 'withdrawal'
  - `amount` (int) — positive for earning, negative for spending
  - `description` (text)
  - `created_at` (timestamptz)
- `withdrawals`: withdrawal requests.
  - `id` (uuid, primary key)
  - `method` (text) — 'vodafone_cash' or 'paypal'
  - `wallet_address` (text)
  - `points` (int) — points requested for withdrawal
  - `status` (text, default 'pending') — 'pending', 'completed', 'rejected'
  - `created_at` (timestamptz)
2. Security
- RLS enabled on all tables.
- Anon + authenticated CRUD (single-tenant, no auth screen).
3. Notes
- Insert a seed row into user_points with id=1, points=0.
*/

CREATE TABLE IF NOT EXISTS user_points (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  points int NOT NULL DEFAULT 0,
  total_earned int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_points" ON user_points;
CREATE POLICY "anon_select_user_points" ON user_points FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_points" ON user_points;
CREATE POLICY "anon_insert_user_points" ON user_points FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_user_points" ON user_points;
CREATE POLICY "anon_update_user_points" ON user_points FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  amount int NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method text NOT NULL,
  wallet_address text NOT NULL,
  points int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_withdrawals" ON withdrawals;
CREATE POLICY "anon_select_withdrawals" ON withdrawals FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_withdrawals" ON withdrawals;
CREATE POLICY "anon_insert_withdrawals" ON withdrawals FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_withdrawals" ON withdrawals;
CREATE POLICY "anon_update_withdrawals" ON withdrawals FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_withdrawals" ON withdrawals;
CREATE POLICY "anon_delete_withdrawals" ON withdrawals FOR DELETE
TO anon, authenticated USING (true);

-- Seed the single user_points row
INSERT INTO user_points (id, points, total_earned)
VALUES (1, 0, 0)
ON CONFLICT (id) DO NOTHING;
