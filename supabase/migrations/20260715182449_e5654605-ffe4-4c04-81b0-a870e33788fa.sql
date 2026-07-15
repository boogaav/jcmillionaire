
-- 1) user_roles: remove USING(true) SELECT policy; has_role() is SECURITY DEFINER and still works
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Roles readable via security definer only"
  ON public.user_roles FOR SELECT
  USING (false);

-- 2) storage.objects: remove public write policies on question-images
DROP POLICY IF EXISTS "Service role can update question images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload question images" ON storage.objects;

-- 3) storage.objects: remove broad SELECT (listing) policies. Files in public buckets remain accessible via public URL without a SELECT policy.
DROP POLICY IF EXISTS "Question images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on books" ON storage.objects;

-- 4) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated/PUBLIC.
-- Keep has_role and is_admin executable (used by RLS policies and edge functions).
REVOKE EXECUTE ON FUNCTION public.grant_referral_attempt() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_run_day_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_users_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_day_state(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_create_run(uuid) FROM PUBLIC, anon, authenticated;
