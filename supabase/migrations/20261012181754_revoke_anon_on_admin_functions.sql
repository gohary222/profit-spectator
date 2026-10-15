/*
# Revoke EXECUTE from anon on admin functions

Tightens security on the two SECURITY DEFINER admin functions so that
only authenticated users can call them, not the anon role.
The functions are still protected by the admin secret code parameter,
but this removes the surface area for unauthenticated callers.
*/

REVOKE EXECUTE ON FUNCTION get_all_withdrawals(text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_update_withdrawal_status(uuid, text, text) FROM anon;
