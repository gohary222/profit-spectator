/*
# Revoke EXECUTE from anon on all admin functions and handle_new_user

Ensures none of the SECURITY DEFINER functions are callable by the anon role.
handle_new_user is a trigger function and should not be callable via RPC at all.
*/

REVOKE EXECUTE ON FUNCTION admin_get_all_users(text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_toggle_ban(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
