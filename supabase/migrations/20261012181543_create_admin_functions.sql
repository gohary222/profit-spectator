/*
# Admin function to read all withdrawals + update withdrawal status

## Overview
Since withdrawals are now owner-scoped via RLS, the admin panel cannot read
all users' withdrawals through the anon-key client. This migration creates two
SECURITY DEFINER functions:
1. `get_all_withdrawals()` — returns all withdrawals (for admin panel)
2. `admin_update_withdrawal_status(wid uuid, new_status text)` — updates a withdrawal's status

Both functions check a hardcoded admin secret code passed as a parameter.
They are callable by authenticated users only.

## Security
- SECURITY DEFINER — runs with the function owner's privileges, bypassing RLS.
- The admin must pass the correct secret code.
- The secret code is checked inside the function body.
*/

CREATE OR REPLACE FUNCTION get_all_withdrawals(admin_code text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  method text,
  wallet_address text,
  points int,
  status text,
  user_name text,
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
  RETURN QUERY SELECT * FROM withdrawals ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_withdrawals(text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_update_withdrawal_status(wid uuid, new_status text, admin_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF admin_code != '7392' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE withdrawals SET status = new_status WHERE id = wid;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_withdrawal_status(uuid, text, text) TO authenticated;
