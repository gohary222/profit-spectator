/*
# Add user_name column to withdrawals table

1. Modified Tables
- `withdrawals`: added `user_name` (text, not null, default 'مستخدم') column so the admin panel can display the user's name alongside each withdrawal request.
2. Security
- No changes to RLS; existing anon+authenticated policies already cover the new column.
3. Notes
- Uses DO $$ ... IF NOT EXISTS ... END $$ to safely add the column only if it's missing, making the migration idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'withdrawals' AND column_name = 'user_name'
  ) THEN
    ALTER TABLE withdrawals ADD COLUMN user_name text NOT NULL DEFAULT 'مستخدم';
  END IF;
END $$;
