// Admin-only control for the live game overlay.
// Verifies the caller is an admin (or the creator of the quiz set),
// then performs the requested session state transition using the service role.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Action =
  | 'start_session'
  | 'start_question'
  | 'reveal_answer'
  | 'show_ladder'
  | 'next_question'
  | 'end_session'
  | 'set_host_choice';

interface Body {
  admin_user_id?: string;
  action?: Action;
  session_id?: string;
  quiz_set_id?: string;
  choice?: 'A' | 'B' | 'C' | 'D' | null;
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: Body = {};
    try { body = await req.json(); } catch { /* empty */ }

    const { admin_user_id, action, session_id, quiz_set_id } = body;
    if (!admin_user_id) return json(401, { error: 'admin_user_id required' });
    if (!action) return json(400, { error: 'action required' });

    const { data: isAdmin, error: adminErr } = await supabase.rpc('is_admin', { _user_id: admin_user_id });
    if (adminErr) return json(500, { error: adminErr.message });

    const authorizeForQuizSet = async (quizSetId: string | null | undefined) => {
      if (isAdmin) return true;
      if (!quizSetId) return false;
      const { data: qset } = await supabase
        .from('live_quiz_sets')
        .select('created_by')
        .eq('id', quizSetId)
        .maybeSingle();
      return !!qset && qset.created_by === admin_user_id;
    };

    // ---- start_session ---------------------------------------------------
    if (action === 'start_session') {
      if (!quiz_set_id) return json(400, { error: 'quiz_set_id required' });
      const allowed = await authorizeForQuizSet(quiz_set_id);
      if (!allowed) return json(403, { error: 'Unauthorized: must be admin or the creator of this quiz set' });

      // Deactivate any previous active session for THIS quiz set only
      await supabase
        .from('live_sessions')
        .update({ is_active: false })
        .eq('is_active', true)
        .eq('quiz_set_id', quiz_set_id);

      // Lock the quiz set so it can no longer be edited
      await supabase
        .from('live_quiz_sets')
        .update({ is_locked: true })
        .eq('id', quiz_set_id);

      const { data, error } = await supabase
        .from('live_sessions')
        .insert({ quiz_set_id, status: 'lobby', current_question_index: 0, is_active: true, created_by: admin_user_id })
        .select()
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, { session: data });
    }

    if (!session_id) return json(400, { error: 'session_id required' });

    const { data: session, error: sErr } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', session_id)
      .single();
    if (sErr || !session) return json(404, { error: 'session not found' });

    const canControl = await authorizeForQuizSet(session.quiz_set_id);
    if (!canControl) return json(403, { error: 'Unauthorized: must be admin or the creator of this quiz set' });

    if (action === 'start_question') {
      const { error } = await supabase
        .from('live_sessions')
        .update({ status: 'question', current_question_started_at: new Date().toISOString() })
        .eq('id', session_id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === 'reveal_answer') {
      const { data: questions } = await supabase
        .from('live_questions')
        .select('*')
        .eq('quiz_set_id', session.quiz_set_id)
        .order('order_index', { ascending: true });
      const currentQ = (questions || [])[session.current_question_index];
      if (currentQ) {
        const { data: ans } = await supabase
          .from('live_answers')
          .select('*')
          .eq('session_id', session_id)
          .eq('question_id', currentQ.id);
        const { data: parts } = await supabase
          .from('live_participants')
          .select('*')
          .eq('session_id', session_id);
        for (const p of (parts || []).filter((x: any) => x.role === 'guest' && !x.is_eliminated)) {
          const a = (ans || []).find((x: any) => x.user_id === p.user_id);
          if (a && a.choice === currentQ.correct_choice) {
            await supabase
              .from('live_participants')
              .update({
                current_ladder_amount: currentQ.prize_amount,
                reached_index: session.current_question_index + 1,
              })
              .eq('id', p.id);
          } else {
            await supabase.from('live_participants').update({ is_eliminated: true }).eq('id', p.id);
          }
        }
      }
      const { error } = await supabase
        .from('live_sessions')
        .update({ status: 'reveal' })
        .eq('id', session_id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === 'show_ladder') {
      const { error } = await supabase
        .from('live_sessions')
        .update({ status: 'ladder' })
        .eq('id', session_id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === 'next_question') {
      const { data: questions } = await supabase
        .from('live_questions')
        .select('id')
        .eq('quiz_set_id', session.quiz_set_id);
      const total = (questions || []).length;
      const nextIdx = session.current_question_index + 1;
      if (nextIdx >= total) {
        const { error } = await supabase
          .from('live_sessions')
          .update({ status: 'finished' })
          .eq('id', session_id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true, finished: true });
      }
      const { error } = await supabase
        .from('live_sessions')
        .update({
          current_question_index: nextIdx,
          status: 'question',
          current_question_started_at: new Date().toISOString(),
        })
        .eq('id', session_id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    if (action === 'end_session') {
      const { error } = await supabase
        .from('live_sessions')
        .update({ is_active: false, status: 'finished' })
        .eq('id', session_id);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    return json(400, { error: 'unknown action' });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
