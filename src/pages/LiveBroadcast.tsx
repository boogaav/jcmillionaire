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

interface LiveParticipant {
  id: string;
  user_id: string;
  display_name: string | null;
  role: string;
  current_ladder_amount: number;
  is_eliminated: boolean;
}

export default function LiveBroadcast() {
  const [params, setParams] = useSearchParams();
  const bg = params.get('bg') || 'green';
  const showControls = params.get('controls') !== '0';
  const showLadderPanel = params.get('panel_ladder') !== '0';
  const showLeaderboardPanel = params.get('panel_lb') !== '0';
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
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [correctByUser, setCorrectByUser] = useState<Record<string, number>>({});


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
    if (sess?.id) {
      const { data: parts } = await supabase
        .from('live_participants')
        .select('id, user_id, display_name, role, current_ladder_amount, is_eliminated')
        .eq('session_id', sess.id);
      setParticipants((parts as LiveParticipant[]) || []);

      const { data: ans } = await supabase
        .from('live_answers')
        .select('user_id, is_correct')
        .eq('session_id', sess.id);
      const counts: Record<string, number> = {};
      (ans || []).forEach((a: any) => {
        if (a.is_correct) counts[a.user_id] = (counts[a.user_id] || 0) + 1;
      });
      setCorrectByUser(counts);
    } else {
      setParticipants([]);
      setCorrectByUser({});
    }

  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('live-broadcast')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_questions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_participants' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_answers' }, () => load())

      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const togglePanel = (key: 'panel_ladder' | 'panel_lb') => {
    const cur = params.get(key) !== '0';
    if (cur) params.set(key, '0'); else params.delete(key);
    setParams(params, { replace: true });
  };


  const currentQ = session ? questions[session.current_question_index] : undefined;
  const showReveal = session?.status === 'reveal';
  const showLadder = session?.status === 'ladder';
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
  const showLadderScreen = async () => {
    if (!session || !adminUserId) return;
    try { await callLiveAdmin(adminUserId, 'show_ladder', { session_id: session.id }); }
    catch (e) { toast.error((e as Error).message); }
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
      {!showQuestion && !showLadder && (
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

      {/* Prize ladder — shown between reveal and next question */}
      {showLadder && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div
            className="w-full max-w-2xl p-8 rounded-2xl"
            style={{
              background:
                'linear-gradient(180deg, #0a1a3a 0%, #030818 55%, #0a1a3a 100%)',
              border: '3px solid #f5c518',
              boxShadow: '0 0 60px rgba(245,197,24,0.35)',
            }}
          >
            <div className="flex items-center justify-center gap-3 mb-5 text-yellow-300">
              <Trophy className="w-7 h-7" />
              <h2 className="text-3xl font-black tracking-widest" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
                PRIZE LADDER
              </h2>
            </div>
            <div className="flex flex-col-reverse gap-1.5">
              {questions.map((q, idx) => {
                const reached = session ? idx <= session.current_question_index : false;
                const current = session ? idx === session.current_question_index : false;
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between px-5 py-2.5 rounded-lg transition-all"
                    style={{
                      background: current
                        ? 'linear-gradient(90deg, #f5c518 0%, #ffdb4a 100%)'
                        : reached
                        ? 'linear-gradient(90deg, #1a7a2e 0%, #0a3a15 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: current
                        ? '2px solid #fff'
                        : reached
                        ? '1px solid rgba(74,222,128,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: current ? '0 0 30px rgba(245,197,24,0.7)' : undefined,
                    }}
                  >
                    <span
                      className={`font-bold text-lg ${current ? 'text-black' : reached ? 'text-white' : 'text-white/50'}`}
                      style={{ textShadow: current ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      Q{q.order_index}
                    </span>
                    <span
                      className={`font-black text-xl ${current ? 'text-black' : reached ? 'text-yellow-300' : 'text-white/40'}`}
                      style={{ textShadow: current ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {formatJC(q.prize_amount)} $JC
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Side ladder panel — left of question */}
      {session && showLadderPanel && questions.length > 0 && !showLadder && (
        <div
          className="fixed left-4 top-1/2 -translate-y-1/2 w-64 max-h-[90vh] overflow-y-auto p-3 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #0a1a3a 0%, #030818 100%)',
            border: '2px solid #f5c518',
            boxShadow: '0 0 30px rgba(245,197,24,0.25)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2 text-yellow-300">
            <Trophy className="w-4 h-4" />
            <h3 className="text-xs font-black tracking-widest" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
              LADDER
            </h3>
          </div>
          <div className="flex flex-col-reverse gap-1">
            {questions.map((q, idx) => {
              const reached = session ? idx < session.current_question_index : false;
              const current = session ? idx === session.current_question_index : false;
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between px-2.5 py-1 rounded"
                  style={{
                    background: current
                      ? 'linear-gradient(90deg, #f5c518 0%, #ffdb4a 100%)'
                      : reached
                      ? 'linear-gradient(90deg, #1a7a2e 0%, #0a3a15 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: current ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: current ? '0 0 15px rgba(245,197,24,0.6)' : undefined,
                  }}
                >
                  <span
                    className={`font-bold text-xs ${current ? 'text-black' : reached ? 'text-white' : 'text-white/50'}`}
                    style={{ textShadow: current ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    Q{q.order_index}
                  </span>
                  <span
                    className={`font-black text-xs ${current ? 'text-black' : reached ? 'text-yellow-300' : 'text-white/40'}`}
                    style={{ textShadow: current ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {formatJC(q.prize_amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side leaderboard panel — right of question */}
      {session && showLeaderboardPanel && (
        <div
          className="fixed right-4 top-1/2 -translate-y-1/2 w-64 max-h-[90vh] overflow-y-auto p-3 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #0a1a3a 0%, #030818 100%)',
            border: '2px solid #f5c518',
            boxShadow: '0 0 30px rgba(245,197,24,0.25)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2 text-yellow-300">
            <Trophy className="w-4 h-4" />
            <h3 className="text-xs font-black tracking-widest" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
              LEADERBOARD
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {[...participants]
              .filter((p) => p.role === 'guest')
              .sort((a, b) => b.current_ladder_amount - a.current_ladder_amount)
              .slice(0, 10)
              .map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2.5 py-1 rounded"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(90deg, #f5c518 0%, #ffdb4a 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    opacity: p.is_eliminated ? 0.4 : 1,
                  }}
                >
                  <span
                    className={`font-bold text-xs truncate max-w-[140px] ${i === 0 ? 'text-black' : 'text-white'}`}
                    style={{ textShadow: i === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    #{i + 1} {p.display_name || p.user_id.slice(0, 6)}
                  </span>
                  <span
                    className={`font-black text-xs ${i === 0 ? 'text-black' : 'text-yellow-300'}`}
                    style={{ textShadow: i === 0 ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}
                  >
                    {formatJC(p.current_ladder_amount)}
                  </span>
                </div>
              ))}
            {participants.filter((p) => p.role === 'guest').length === 0 && (
              <p className="text-white/60 text-xs text-center py-2">No players yet</p>
            )}
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
              {session.status === 'lobby' && (
                <button
                  onClick={startQuestion}
                  className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Start First Question
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
              {session.status === 'reveal' && (
                <button
                  onClick={showLadderScreen}
                  className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Show Ladder
                </button>
              )}
              {session.status === 'ladder' && (
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  {session.current_question_index + 1 >= questions.length ? 'Finish Game' : 'Next Question'}
                </button>
              )}
              <div className="pt-2 mt-1 border-t border-white/10 flex flex-col gap-1.5">
                <div className="text-[10px] uppercase tracking-widest text-white/50">Panels</div>
                <label className="flex items-center justify-between gap-2 text-xs text-white cursor-pointer">
                  <span>Ladder (left)</span>
                  <input
                    type="checkbox"
                    checked={showLadderPanel}
                    onChange={() => togglePanel('panel_ladder')}
                    className="accent-yellow-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs text-white cursor-pointer">
                  <span>Leaderboard (right)</span>
                  <input
                    type="checkbox"
                    checked={showLeaderboardPanel}
                    onChange={() => togglePanel('panel_lb')}
                    className="accent-yellow-400"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
