// Live broadcast overlay — TV-show style question banner for StreamYard compositing.
// Route: /live/broadcast?bg=green|black|transparent
// Subscribes to the active live session and renders ONLY the question + 4 choices
// in "Who Wants to Be a Millionaire"-style hex banners. No app chrome.
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatJC } from '@/lib/constants';
import { useGame } from '@/contexts/GameContext';
import { toast } from 'sonner';
import { Play, Check, SkipForward, EyeOff, Trophy } from 'lucide-react';

async function callLiveAdmin(adminUserId: string, action: string, extras: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('live-admin', {
    body: { admin_user_id: adminUserId, action, ...extras },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

type SessionStatus = 'lobby' | 'question' | 'reveal' | 'ladder' | 'finished';
type Choice = 'A' | 'B' | 'C' | 'D';

interface LiveSession {
  id: string;
  quiz_set_id: string | null;
  status: SessionStatus;
  current_question_index: number;
  is_active: boolean;
}
interface LiveQuestion {
  id: string;
  order_index: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: Choice;
  prize_amount: number;
}

const CHOICES: Choice[] = ['A', 'B', 'C', 'D'];

export default function LiveBroadcast() {
  const [params, setParams] = useSearchParams();
  const bg = params.get('bg') || 'green';
  const showControls = params.get('controls') !== '0';
  const bgStyle: React.CSSProperties =
    bg === 'transparent'
      ? { background: 'transparent' }
      : bg === 'black'
      ? { background: '#000' }
      : { background: '#00b140' }; // chroma-key green

  const { isAdmin, state } = useGame();
  const adminUserId = state.user?.id;
  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);

  const load = async () => {
    const { data: sess } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(sess as LiveSession | null);
    if (sess?.quiz_set_id) {
      const { data: qs } = await supabase
        .from('live_questions')
        .select('*')
        .eq('quiz_set_id', sess.quiz_set_id)
        .order('order_index', { ascending: true });
      setQuestions((qs as LiveQuestion[]) || []);
    } else {
      setQuestions([]);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('live-broadcast')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_questions' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentQ = session ? questions[session.current_question_index] : undefined;
  const showReveal = session?.status === 'reveal';
  const showQuestion = session && currentQ && (session.status === 'question' || session.status === 'reveal');

  const startQuestion = async () => {
    if (!session) return toast.error('No active session');
    if (!adminUserId) return toast.error('Sign in as admin');
    try { await callLiveAdmin(adminUserId, 'start_question', { session_id: session.id }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const revealAnswer = async () => {
    if (!session || !adminUserId) return;
    try {
      await callLiveAdmin(adminUserId, 'reveal_answer', { session_id: session.id });
      toast.success('Answer revealed');
    } catch (e) { toast.error((e as Error).message); }
  };
  const nextQuestion = async () => {
    if (!session || !adminUserId) return;
    try {
      const res = await callLiveAdmin(adminUserId, 'next_question', { session_id: session.id });
      if (res?.finished) toast.success('Game finished');
    } catch (e) { toast.error((e as Error).message); }
  };
  const hideControls = () => {
    params.set('controls', '0');
    setParams(params, { replace: true });
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen flex flex-col justify-end overflow-hidden"
      style={bgStyle}
    >
      {/* Prize badge — top center */}
      {showQuestion && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="text-yellow-300 text-2xl font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            QUESTION {(currentQ.order_index)}
          </div>
          <div
            className="px-8 py-3 text-4xl font-black text-yellow-300"
            style={{
              background: 'linear-gradient(180deg, #0a1a3a 0%, #050c22 100%)',
              clipPath:
                'polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%)',
              border: '2px solid #f5c518',
              textShadow: '0 2px 4px rgba(0,0,0,0.9)',
            }}
          >
            {formatJC(currentQ.prize_amount)}
          </div>
        </div>
      )}

      {/* Waiting state */}
      {!showQuestion && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="px-16 py-8 text-5xl font-black text-yellow-300 tracking-wider"
            style={{
              background: 'linear-gradient(180deg, #0a1a3a 0%, #050c22 100%)',
              clipPath:
                'polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%)',
              border: '3px solid #f5c518',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {session?.status === 'finished' ? 'GAME OVER' : 'STAND BY…'}
          </div>
        </div>
      )}

      {/* Question banner + answers — bottom of screen */}
      {showQuestion && (
        <div className="pb-10 px-10 flex flex-col items-center gap-5">
          {/* Question banner */}
          <div
            className="w-full max-w-6xl px-16 py-8 text-center"
            style={{
              background:
                'linear-gradient(180deg, #0a1a3a 0%, #030818 55%, #0a1a3a 100%)',
              clipPath:
                'polygon(3% 0, 97% 0, 100% 50%, 97% 100%, 3% 100%, 0 50%)',
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          >
            <div
              className="text-white text-3xl md:text-4xl font-bold leading-snug"
              style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
            >
              {currentQ.question}
            </div>
          </div>

          {/* 4 choices — 2x2 grid */}
          <div className="w-full max-w-6xl grid grid-cols-2 gap-x-8 gap-y-4">
            {CHOICES.map((letter) => {
              const text = currentQ[
                `choice_${letter.toLowerCase()}` as 'choice_a'
              ] as string;
              const isCorrect = showReveal && currentQ.correct_choice === letter;
              return (
                <div
                  key={letter}
                  className="px-10 py-5 flex items-center gap-4 transition-all duration-300"
                  style={{
                    background: isCorrect
                      ? 'linear-gradient(180deg, #1a7a2e 0%, #0a3a15 100%)'
                      : 'linear-gradient(180deg, #0a1a3a 0%, #050c22 100%)',
                    clipPath:
                      'polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%)',
                    border: isCorrect
                      ? '2px solid #4ade80'
                      : '2px solid rgba(255,255,255,0.15)',
                    boxShadow: isCorrect ? '0 0 40px rgba(74,222,128,0.6)' : undefined,
                  }}
                >
                  <span
                    className="text-yellow-300 font-black text-2xl md:text-3xl"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                  >
                    {letter}:
                  </span>
                  <span
                    className="text-white font-bold text-xl md:text-2xl"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                  >
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin control panel — only visible to admins, hidden with ?controls=0 */}
      {isAdmin && showControls && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 p-3 rounded-xl bg-black/80 border border-white/20 backdrop-blur-sm shadow-2xl">
          <div className="text-[10px] uppercase tracking-widest text-yellow-300 font-bold flex items-center justify-between gap-3">
            <span>Admin · {session?.status || 'no session'}</span>
            <button onClick={hideControls} title="Hide controls" className="text-white/60 hover:text-white">
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
          {!session && (
            <div className="text-xs text-white/70 max-w-[220px]">
              No active session. Start one from the /live page.
            </div>
          )}
          {session && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-white/70">
                Q {Math.min(session.current_question_index + 1, questions.length)} / {questions.length}
              </div>
              {(session.status === 'lobby' || session.status === 'reveal') && (
                <button
                  onClick={session.status === 'lobby' ? startQuestion : nextQuestion}
                  className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm flex items-center gap-2"
                >
                  {session.status === 'lobby' ? <Play className="w-4 h-4" /> : <SkipForward className="w-4 h-4" />}
                  {session.status === 'lobby'
                    ? 'Start First Question'
                    : session.current_question_index + 1 >= questions.length
                    ? 'Finish Game'
                    : 'Next Question'}
                </button>
              )}
              {session.status === 'question' && (
                <button
                  onClick={revealAnswer}
                  className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Reveal Answer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
