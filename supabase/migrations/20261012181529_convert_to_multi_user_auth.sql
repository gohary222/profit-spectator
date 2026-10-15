/*
# Convert to multi-user with authentication

## Overview
Converts the app from single-tenant (no auth) to multi-user with per-user data isolation.
Each authenticated user gets their own balance, transactions, and withdrawals.

## 1. New Tables
- `balances`: per-user points balance (one row per user).
  - `user_id` (uuid, PK, references auth.users, ON DELETE CASCADE)
  - `points` (int, not null, default 0)
  - `total_earned` (int, not null, default 0)
  - `updated_at` (timestamptz)

## 2. Modified Tables
- `transactions`: added `user_id` column. Old rows from single-tenant era are deleted first since they have no owner.
- `withdrawals`: added `user_id` column. Old rows are deleted first.

## 3. Security
All tables now use `TO authenticated` with `auth.uid() = user_id` ownership checks.
Old anon policies are dropped. The old `user_points` table is kept untouched.

## 4. Notes
- New users start at 0 points.
- `user_id` defaults to `auth.uid()` so inserts that omit it succeed.
*/

-- 1. Create balances table (per-user)
CREATE TABLE IF NOT EXISTS balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0,
  total_earned int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_balance" ON balances;
CREATE POLICY "select_own_balance" ON balances FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_balance" ON balances;
CREATE POLICY "insert_own_balance" ON balances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_balance" ON balances;
CREATE POLICY "update_own_balance" ON balances FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. transactions: delete old orphan rows, add user_id, replace policies
DELETE FROM transactions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. withdrawals: delete old orphan rows, add user_id, replace policies
DELETE FROM withdrawals;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "anon_insert_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "anon_update_withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "anon_delete_withdrawals" ON withdrawals;

DROP POLICY IF EXISTS "select_own_withdrawals" ON withdrawals;
CREATE POLICY "select_own_withdrawals" ON withdrawals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_withdrawals" ON withdrawals;
CREATE POLICY "insert_own_withdrawals" ON withdrawals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_withdrawals" ON withdrawals;
CREATE POLICY "update_own_withdrawals" ON withdrawals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
