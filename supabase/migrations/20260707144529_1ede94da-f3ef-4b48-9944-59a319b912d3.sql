-- Lock down live_sessions writes: only the live-admin edge function (service_role) may mutate.
DROP POLICY IF EXISTS sessions_write_all ON public.live_sessions;

CREATE POLICY sessions_service_role_write
  ON public.live_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);