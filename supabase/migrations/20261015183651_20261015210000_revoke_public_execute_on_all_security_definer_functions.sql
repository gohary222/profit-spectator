/*
# Revoke EXECUTE from PUBLIC on all SECURITY DEFINER functions

## Problem
PostgreSQL grants EXECUTE to PUBLIC by default when functions are created.
Previous migrations only revoked from `anon` specifically, but both `anon`
and `authenticated` inherit the PUBLIC grant, so all SECURITY DEFINER
functions remained callable by unauthenticated users via /rest/v1/rpc/.

## Fix
1. REVOKE EXECUTE FROM PUBLIC on every SECURITY DEFINER function.
2. GRANT EXECUTE TO authenticated for user-facing functions.
3. handle_new_user is a trigger function — revoke from everyone.
   It only needs to be called by the trigger, never via RPC.
*/

-- Revoke PUBLIC (covers both anon + authenticated inheritance)
REVOKE EXECUTE ON FUNCTION add_points_generic(int, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION add_points_with_cooldown(int, int, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION request_withdrawal(text, text, int, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_all_users(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_update_withdrawal_status(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_all_withdrawals(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;

-- Explicitly revoke anon on all functions
REVOKE EXECUTE ON FUNCTION add_points_generic(int, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION add_points_with_cooldown(int, int, text) FROM anon;
REVOKE EXECUTE ON FUNCTION request_withdrawal(text, text, int, text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_get_all_users(text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_update_withdrawal_status(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION get_all_withdrawals(text) FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;

-- Grant EXECUTE only to authenticated for user-facing + admin functions
GRANT EXECUTE ON FUNCTION add_points_generic(int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_points_with_cooldown(int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION request_withdrawal(text, text, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_ban(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_withdrawal_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_withdrawals(text) TO authenticated;

-- handle_new_user: also revoke from authenticated — it is a trigger function only
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;
