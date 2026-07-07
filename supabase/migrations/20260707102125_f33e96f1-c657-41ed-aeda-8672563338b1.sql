
-- Quiz sets
CREATE TABLE public.live_quiz_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_quiz_sets TO anon, authenticated;
GRANT ALL ON public.live_quiz_sets TO service_role;
ALTER TABLE public.live_quiz_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_sets_read_all" ON public.live_quiz_sets FOR SELECT USING (true);
CREATE POLICY "quiz_sets_admin_write" ON public.live_quiz_sets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Questions in a set
CREATE TABLE public.live_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_set_id UUID NOT NULL REFERENCES public.live_quiz_sets(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  question TEXT NOT NULL,
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  choice_c TEXT NOT NULL,
  choice_d TEXT NOT NULL,
  correct_choice TEXT NOT NULL CHECK (correct_choice IN ('A','B','C','D')),
  prize_amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_questions TO anon, authenticated;
GRANT ALL ON public.live_questions TO service_role;
ALTER TABLE public.live_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read_all" ON public.live_questions FOR SELECT USING (true);
CREATE POLICY "questions_admin_write" ON public.live_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sessions (single always-on room; we use one active row at a time)
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_set_id UUID REFERENCES public.live_quiz_sets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','question','reveal','finished')),
  current_question_index INT NOT NULL DEFAULT 0,
  current_question_started_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_sessions TO anon, authenticated;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_read_all" ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY "sessions_admin_write" ON public.live_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Participants
CREATE TABLE public.live_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest','spectator','admin')),
  current_ladder_amount BIGINT NOT NULL DEFAULT 0,
  reached_index INT NOT NULL DEFAULT 0,
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.live_participants TO anon, authenticated;
GRANT ALL ON public.live_participants TO service_role;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_read_all" ON public.live_participants FOR SELECT USING (true);
CREATE POLICY "participants_insert_self" ON public.live_participants FOR INSERT
  WITH CHECK (true);
CREATE POLICY "participants_update_self_or_admin" ON public.live_participants FOR UPDATE
  USING (true) WITH CHECK (true);

-- Answers
CREATE TABLE public.live_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.live_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  choice TEXT NOT NULL CHECK (choice IN ('A','B','C','D')),
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id, user_id)
);
GRANT SELECT, INSERT ON public.live_answers TO anon, authenticated;
GRANT ALL ON public.live_answers TO service_role;
ALTER TABLE public.live_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_read_all" ON public.live_answers FOR SELECT USING (true);
CREATE POLICY "answers_insert_all" ON public.live_answers FOR INSERT WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER live_quiz_sets_updated_at BEFORE UPDATE ON public.live_quiz_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER live_sessions_updated_at BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_answers;

CREATE INDEX idx_live_questions_set_order ON public.live_questions(quiz_set_id, order_index);
CREATE INDEX idx_live_participants_session ON public.live_participants(session_id);
CREATE INDEX idx_live_answers_session_q ON public.live_answers(session_id, question_id);
