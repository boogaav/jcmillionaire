
DROP POLICY IF EXISTS "quiz_sets_admin_write" ON public.live_quiz_sets;
CREATE POLICY "quiz_sets_write_all" ON public.live_quiz_sets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "questions_admin_write" ON public.live_questions;
CREATE POLICY "questions_write_all" ON public.live_questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sessions_admin_write" ON public.live_sessions;
CREATE POLICY "sessions_write_all" ON public.live_sessions FOR ALL USING (true) WITH CHECK (true);
