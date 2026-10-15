/*
# Server-side atomic points operations with anti-spam protection

## Functions
- add_points_with_cooldown: atomically adds points + enforces cooldown via ad_log
- request_withdrawal: atomically checks balance >= 5000, deducts, creates withdrawal
- add_points_generic: atomic add for spin/referral/daily tasks (no cooldown needed)

## Security
All functions are SECURITY DEFINER, execute only by authenticated, anon revoked.
All balance mutations use SELECT ... FOR UPDATE to prevent race conditions.
*/

-- 1. Ad log table to track ad views server-side for cooldown enforcement
CREATE TABLE IF NOT EXISTS ad_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ad_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ad_log" ON ad_log;
CREATE POLICY "select_own_ad_log" ON ad_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- No INSERT policy — only the SECURITY DEFINER function inserts rows

CREATE INDEX IF NOT EXISTS idx_ad_log_user_time ON ad_log(user_id, viewed_at DESC);

-- 2. add_points_with_cooldown: atomic add + cooldown check
CREATE OR REPLACE FUNCTION add_points_with_cooldown(
  p_amount int,
  p_cooldown_seconds int,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  last_view timestamptz;
  seconds_since int;
  current_points int;
  current_total int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check banned
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid AND banned = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;

  -- Check cooldown from last ad view
  SELECT viewed_at INTO last_view
  FROM ad_log
  WHERE user_id = uid
  ORDER BY viewed_at DESC
  LIMIT 1;

  IF last_view IS NOT NULL THEN
    seconds_since := EXTRACT(epoch FROM (now() - last_view))::int;
    IF seconds_since < p_cooldown_seconds THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'cooldown',
        'remaining', p_cooldown_seconds - seconds_since
      );
    END IF;
  END IF;

  -- Lock the balance row for update (prevents race condition)
  SELECT points, total_earned INTO current_points, current_total
  FROM balances
  WHERE user_id = uid
  FOR UPDATE;

  IF current_points IS NULL THEN
    -- Create balance row with 0 points
    INSERT INTO balances (user_id, points, total_earned) VALUES (uid, 0, 0);
    current_points := 0;
    current_total := 0;
  END IF;

  -- Atomic update
  UPDATE balances
  SET points = points + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = uid;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (uid, 'ad', p_amount, p_description);

  -- Record ad view for cooldown
  INSERT INTO ad_log (user_id) VALUES (uid);

  RETURN jsonb_build_object(
    'success', true,
    'points', current_points + p_amount,
    'total_earned', current_total + p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_points_with_cooldown(int, int, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION add_points_with_cooldown(int, int, text) FROM anon;

-- 3. add_points_generic: atomic add for spin/referral/tasks (no cooldown)
CREATE OR REPLACE FUNCTION add_points_generic(
  p_amount int,
  p_type text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  current_points int;
  current_total int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check banned
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid AND banned = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;

  -- Lock and read
  SELECT points, total_earned INTO current_points, current_total
  FROM balances
  WHERE user_id = uid
  FOR UPDATE;

  IF current_points IS NULL THEN
    INSERT INTO balances (user_id, points, total_earned) VALUES (uid, 0, 0);
    current_points := 0;
    current_total := 0;
  END IF;

  -- Only add positive amounts
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  UPDATE balances
  SET points = points + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = uid;

  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (uid, p_type, p_amount, p_description);

  RETURN jsonb_build_object(
    'success', true,
    'points', current_points + p_amount,
    'total_earned', current_total + p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_points_generic(int, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION add_points_generic(int, text, text) FROM anon;

-- 4. request_withdrawal: atomic balance check + deduct + create withdrawal
CREATE OR REPLACE FUNCTION request_withdrawal(
  p_method text,
  p_wallet_address text,
  p_points int,
  p_user_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  current_points int;
  wid uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check banned
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid AND banned = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;

  -- Validate minimum
  IF p_points < 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_minimum');
  END IF;

  IF LENGTH(TRIM(p_wallet_address)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_wallet');
  END IF;

  -- Lock balance row for update (prevents double-spend race condition)
  SELECT points INTO current_points
  FROM balances
  WHERE user_id = uid
  FOR UPDATE;

  IF current_points IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_balance', 'points', 0);
  END IF;

  -- Server-side balance check
  IF current_points < p_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'points', current_points);
  END IF;

  -- Atomic deduction
  UPDATE balances
  SET points = points - p_points,
      updated_at = now()
  WHERE user_id = uid;

  -- Create withdrawal record
  INSERT INTO withdrawals (user_id, method, wallet_address, points, status, user_name)
  VALUES (uid, p_method, TRIM(p_wallet_address), p_points, 'pending', p_user_name)
  RETURNING id INTO wid;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (uid, 'withdrawal', -p_points, 'طلب سحب نقاط');

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', wid,
    'points', current_points - p_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION request_withdrawal(text, text, int, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION request_withdrawal(text, text, int, text) FROM anon;
