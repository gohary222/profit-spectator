/*
# Fix add_points_generic to allow negative amounts for deductions
The previous version rejected p_amount <= 0, which broke deductPoints.
Now only rejects p_amount = 0.
*/
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
  new_points int;
  new_total int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check banned
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = uid AND banned = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'banned');
  END IF;

  -- Reject zero amounts
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
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

  -- For deductions, check sufficient balance
  IF p_amount < 0 AND current_points < ABS(p_amount) THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'points', current_points);
  END IF;

  new_points := current_points + p_amount;
  -- Only increase total_earned for positive amounts
  new_total := current_total + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END;

  UPDATE balances
  SET points = new_points,
      total_earned = new_total,
      updated_at = now()
  WHERE user_id = uid;

  INSERT INTO transactions (user_id, type, amount, description)
  VALUES (uid, p_type, p_amount, p_description);

  RETURN jsonb_build_object(
    'success', true,
    'points', new_points,
    'total_earned', new_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION add_points_generic(int, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION add_points_generic(int, text, text) FROM anon;
