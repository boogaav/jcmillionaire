ALTER TABLE public.live_sessions DROP CONSTRAINT IF EXISTS live_sessions_status_check;
ALTER TABLE public.live_sessions ADD CONSTRAINT live_sessions_status_check
  CHECK (status = ANY (ARRAY['lobby'::text, 'question'::text, 'reveal'::text, 'ladder'::text, 'finished'::text]));