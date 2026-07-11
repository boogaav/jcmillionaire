// /live/:slug — a single show's page. Host sees admin controls, everyone else spectates/plays.
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, X, Trophy, Users, Eye, Play, SkipForward, Radio, Copy, Lock, Share2, Coins, Wallet, ExternalLink } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoginButtons } from '@/components/LoginButtons';
import { formatJC } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PoolTopUp } from '@/components/live/PoolTopUp';

type SessionStatus = 'lobby' | 'question' | 'reveal' | 'ladder' | 'finished';
type Role = 'admin' | 'guest' | 'spectator';

interface QuizSet {
  id: string;
  name: string;
  slug: string;
  passcode: string | null;
  created_by: string | null;
  is_sandbox: boolean;
  host_wallet_address: string | null;
}
interface LiveSession {
  id: string;
  quiz_set_id: string | null;
  status: SessionStatus;
  current_question_index: number;
  is_active: boolean;
}
interface LiveQuestion {
  id: string; quiz_set_id: string; order_index: number;
  question: string; choice_a: string; choice_b: string; choice_c: string; choice_d: string;
  correct_choice: 'A' | 'B' | 'C' | 'D'; prize_amount: number;
  image_url?: string | null;
}
interface LiveParticipant {
  id: string; session_id: string; user_id: string; display_name: string | null;
  role: Role; current_ladder_amount: number; reached_index: number; is_eliminated: boolean;
}
interface LiveAnswer {
  id: string; session_id: string; question_id: string; user_id: string;
  choice: 'A' | 'B' | 'C' | 'D'; is_correct: boolean | null;
}

const CHOICES: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
const CHOICE_COLORS = {
  A: 'bg-red-500 hover:bg-red-600 text-white',
  B: 'bg-blue-500 hover:bg-blue-600 text-white',
  C: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  D: 'bg-green-500 hover:bg-green-600 text-white',
};


export default function LiveShow() {
  const { slug } = useParams<{ slug: string }>();
  const { state } = useGame();
  const user = state.user;

  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [answers, setAnswers] = useState<LiveAnswer[]>([]);
  const [chosenRole, setChosenRole] = useState<'guest' | 'spectator' | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeUnlocked, setPasscodeUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const isHost = !!user && !!quizSet && quizSet.created_by === user.id;
  // Effective role in the room
  const role: Role = isHost
    ? 'admin'
    : chosenRole === 'spectator'
      ? 'spectator'
      : (quizSet?.passcode && !passcodeUnlocked)
        ? 'spectator'
        : 'guest';

  const loadAll = async () => {
    if (!slug) return;
    const { data: qset } = await supabase
      .from('live_quiz_sets')
      .select('id, name, slug, passcode, created_by, is_sandbox, host_wallet_address')
      .eq('slug', slug)
      .maybeSingle();
    if (!qset) { setNotFound(true); setLoading(false); return; }
    setQuizSet(qset as QuizSet);


    const [{ data: qs }, { data: sess }] = await Promise.all([
      supabase.from('live_questions').select('*').eq('quiz_set_id', qset.id).order('order_index'),
      supabase.from('live_sessions').select('*').eq('quiz_set_id', qset.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setQuestions((qs as LiveQuestion[]) || []);
    setSession(sess as LiveSession | null);

    if (sess?.id) {
      const [{ data: parts }, { data: ans }] = await Promise.all([
        supabase.from('live_participants').select('*').eq('session_id', sess.id),
        supabase.from('live_answers').select('*').eq('session_id', sess.id),
      ]);
      setParticipants((parts as LiveParticipant[]) || []);
      setAnswers((ans as LiveAnswer[]) || []);
    } else {
      setParticipants([]);
      setAnswers([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [slug]);

  // Realtime scoped to this quiz set
  useEffect(() => {
    if (!quizSet?.id) return;
    const channel = supabase
      .channel(`live-show-${quizSet.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions', filter: `quiz_set_id=eq.${quizSet.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_participants' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_answers' }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [quizSet?.id]);

  // Auto-join as participant
  useEffect(() => {
    const join = async () => {
      if (!session || !user || role === 'admin') return;
      const existing = participants.find((p) => p.user_id === user.id);
      if (existing) {
        if (existing.role !== role) {
          await supabase.from('live_participants').update({ role }).eq('id', existing.id);
        }
        return;
      }
      await supabase.from('live_participants').insert({
        session_id: session.id,
        user_id: user.id,
        display_name: user.username || user.id.slice(0, 8),
        role,
      });
    };
    join();
    // eslint-disable-next-line
  }, [session?.id, user?.id, role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center pb-24"><div className="text-muted-foreground">Loading show…</div></div>;
  if (notFound || !quizSet) {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold">Show not found</h1>
        <p className="text-muted-foreground">The link may be wrong or the show was deleted.</p>
        <Link to="/live/new"><Button>Create your own show</Button></Link>
      </div>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/live/${quizSet.slug}`);
      toast.success('Link copied!');
    } catch { toast.error('Copy failed'); }
  };

  // Login prompt for anon users without spectator choice
  if (!user && chosenRole !== 'spectator') {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-2xl font-display font-bold">{quizSet.name}</h1>
        </div>
        <p className="text-center text-muted-foreground">Sign in to play as a Guest, or watch as a Spectator.</p>
        <LoginButtons />
        <Button onClick={() => setChosenRole('spectator')} variant="secondary" className="gap-2">
          <Eye className="w-4 h-4" /> Watch as Spectator
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-32 px-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-red-500 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm">LIVE</span>
          </div>
          <h1 className="text-lg font-display font-bold truncate max-w-[40vw]">{quizSet.name}</h1>
          <Badge variant="outline" className="capitalize">{role}</Badge>
          {session && <Badge variant="secondary" className="capitalize">{session.status}</Badge>}
          {quizSet.is_sandbox && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-500" title="Play-money only — does not touch the real $JC prize pool">
              Sandbox
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {participants.filter(p => p.role !== 'admin').length}
          </div>
          <Button variant="ghost" size="icon" onClick={copyLink} aria-label="Copy link"><Share2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Passcode gate for logged-in guests */}
      {user && !isHost && quizSet.passcode && !passcodeUnlocked && chosenRole !== 'spectator' && (
        <Card className="p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold"><Lock className="w-4 h-4" /> Guest passcode required</div>
          <p className="text-xs text-muted-foreground">The host set a passcode to submit answers. You can still watch as a spectator.</p>
          <div className="flex gap-2">
            <Input value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} placeholder="Passcode" />
            <Button onClick={() => {
              if (passcodeInput === quizSet.passcode) { setPasscodeUnlocked(true); toast.success('You\'re in!'); }
              else toast.error('Wrong passcode');
            }}>Join</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setChosenRole('spectator')} className="gap-1">
            <Eye className="w-3 h-3" /> Watch as spectator instead
          </Button>
        </Card>
      )}

      {isHost ? (
        <AdminView
          quizSet={quizSet}
          session={session}
          questions={questions}
          participants={participants}
          answers={answers}
          adminUserId={user!.id}
          reload={loadAll}
        />
      ) : (
        <PlayerView
          role={role}
          session={session}
          questions={questions}
          participants={participants}
          answers={answers}
          userId={user?.id || ''}
        />
      )}

      <div className="mt-4">
        <PoolTopUp
          quizSetId={quizSet.id}
          hostAddress={quizSet.host_wallet_address}
          isHost={isHost}
          userId={user?.id || null}
        />
      </div>
    </div>
  );
}


/* ---------------- Player view ---------------- */
function PlayerView({ role, session, questions, participants, answers, userId }: {
  role: Role; session: LiveSession | null; questions: LiveQuestion[];
  participants: LiveParticipant[]; answers: LiveAnswer[]; userId: string;
}) {
  if (!session) {
    return (
      <Card className="p-6 text-center">
        <p className="text-lg font-semibold mb-2">The host hasn't started the show yet</p>
        <p className="text-sm text-muted-foreground">Come back when the LIVE goes on.</p>
      </Card>
    );
  }

  const currentQ = questions[session.current_question_index];
  const me = participants.find((p) => p.user_id === userId);
  const myAnswer = currentQ ? answers.find((a) => a.user_id === userId && a.question_id === currentQ.id) : undefined;

  const submitAnswer = async (choice: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQ || !userId) return;
    const isCorrect = choice === currentQ.correct_choice;
    const { error } = await supabase.from('live_answers').insert({
      session_id: session.id, question_id: currentQ.id, user_id: userId, choice, is_correct: isCorrect,
    });
    if (error) { toast.error('Failed to submit answer'); return; }
    toast.success('Answer locked in!');
  };

  if (session.status === 'lobby') {
    return (
      <Card className="p-6 text-center space-y-3">
        <div className="text-4xl">🎬</div>
        <p className="text-lg font-semibold">Waiting for the host to start…</p>
        <p className="text-sm text-muted-foreground">{participants.filter(p => p.role !== 'admin').length} players in the room</p>
      </Card>
    );
  }

  if (session.status === 'finished') {
    return <FinalResults questions={questions} participants={participants} answers={answers} highlightUserId={userId} />;
  }

  if (!currentQ) return <Card className="p-6 text-center">Waiting for next question…</Card>;

  const showReveal = session.status === 'reveal';
  const questionAnswers = answers.filter((a) => a.question_id === currentQ.id);
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  questionAnswers.forEach((a) => { counts[a.choice]++; });
  const totalCount = questionAnswers.length || 1;

  return (
    <div className="space-y-4">
      {role === 'spectator' && (
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👋</span>
            <span className="font-semibold text-sm">Login to join the show</span>
          </div>
          <LoginButtons compact />
        </Card>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">Q{session.current_question_index + 1} / {questions.length}</span>
        <span className="text-primary font-bold">{formatJC(currentQ.prize_amount)} $JC</span>
      </div>

      <Card className="p-5 text-center">
        <p className="text-xl font-semibold leading-relaxed">{currentQ.question}</p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CHOICES.map((c) => {
          const choiceText = currentQ[`choice_${c.toLowerCase()}` as 'choice_a'];
          const selected = myAnswer?.choice === c;
          const isCorrect = showReveal && c === currentQ.correct_choice;
          const isWrong = showReveal && selected && c !== currentQ.correct_choice;
          const pct = Math.round((counts[c] / totalCount) * 100);
          const disabled = role === 'spectator' || showReveal || !!myAnswer;
          return (
            <button
              key={c}
              onClick={() => !disabled && submitAnswer(c)}
              disabled={disabled}
              className={cn(
                'relative overflow-hidden rounded-2xl p-4 text-left font-semibold shadow-lg transition-all',
                CHOICE_COLORS[c],
                selected && !showReveal && 'ring-4 ring-white/60',
                isCorrect && 'ring-4 ring-white scale-105',
                isWrong && 'opacity-50',
                disabled && !showReveal && 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/25 flex items-center justify-center font-bold">{c}</span>
                <span className="flex-1">{choiceText}</span>
                {isCorrect && <Check className="w-6 h-6" />}
                {isWrong && <X className="w-6 h-6" />}
              </div>
              {showReveal && (
                <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/80" style={{ width: `${pct}%` }} />
                </div>
              )}
              {showReveal && <div className="text-xs mt-1 opacity-90">{counts[c]} ({pct}%)</div>}
            </button>
          );
        })}
      </div>

      {me && (
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your score</p>
            <p className="text-xl font-bold text-primary">
              {answers.filter((a) => a.user_id === me.user_id && a.is_correct).length} / {questions.length} pts
            </p>
          </div>
          {me.is_eliminated && <Badge variant="destructive">Eliminated</Badge>}
        </Card>
      )}

      <Leaderboard participants={participants} answers={answers} highlightUserId={userId} />
    </div>
  );
}

function Leaderboard({ participants, answers = [], highlightUserId, finished }: {
  participants: LiveParticipant[]; answers?: LiveAnswer[]; highlightUserId?: string; finished?: boolean;
}) {
  const scoreFor = (userId: string) => answers.filter((a) => a.user_id === userId && a.is_correct).length;
  const players = [...participants].filter((p) => p.role === 'guest').sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id));
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">{finished ? 'Final Standings' : 'Leaderboard'}</h2>
      </div>
      {players.length === 0 && <p className="text-sm text-muted-foreground">No players yet.</p>}
      {players.map((p, i) => (
        <div key={p.id} className={cn('flex items-center justify-between p-2 rounded-lg', p.user_id === highlightUserId && 'bg-primary/10 border border-primary/30')}>
          <div className="flex items-center gap-2">
            <span className="w-6 text-center font-bold text-muted-foreground">#{i + 1}</span>
            <span className="font-semibold">{p.display_name || p.user_id.slice(0, 6)}</span>
            {p.is_eliminated && <Badge variant="destructive" className="text-xs">Out</Badge>}
          </div>
          <span className="font-bold text-primary">{scoreFor(p.user_id)} pts</span>
        </div>
      ))}
    </Card>
  );
}

/* ---------------- Final results (end-of-show) ---------------- */
function FinalResults({ questions, participants, answers, highlightUserId }: {
  questions: LiveQuestion[]; participants: LiveParticipant[]; answers: LiveAnswer[]; highlightUserId?: string;
}) {
  const guests = participants.filter((p) => p.role === 'guest');
  const scoreFor = (userId: string) => answers.filter((a) => a.user_id === userId && a.is_correct).length;
  const ranked = [...guests].sort((a, b) => scoreFor(b.user_id) - scoreFor(a.user_id));
  const winner = ranked[0];
  const winnerScore = winner ? scoreFor(winner.user_id) : 0;

  return (
    <div className="space-y-4">
      {winner && (
        <Card className="p-6 text-center bg-gradient-to-b from-primary/20 to-transparent border-primary/40">
          <div className="text-5xl mb-2">🏆</div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Winner</p>
          <p className="text-2xl font-bold text-primary">{winner.display_name || winner.user_id.slice(0, 6)}</p>
          <p className="text-sm text-muted-foreground mt-1">{winnerScore} / {questions.length} correct</p>
        </Card>
      )}

      <Leaderboard participants={participants} answers={answers} highlightUserId={highlightUserId} finished />

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Per-question stats</h2>
        {questions.map((q, i) => {
          const qAns = answers.filter((a) => a.question_id === q.id);
          const correct = qAns.filter((a) => a.is_correct).length;
          const total = qAns.length;
          const pct = total ? Math.round((correct / total) * 100) : 0;
          return (
            <div key={q.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold truncate pr-2">Q{i + 1}. {q.question}</span>
                <span className="text-muted-foreground shrink-0">{correct}/{total} ({pct}%)</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Correct: <span className="text-green-500 font-semibold">{q.correct_choice}</span> — {q[`choice_${q.correct_choice.toLowerCase()}` as 'choice_a']}</p>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ---------------- Admin (creator) view ---------------- */
function AdminView({ quizSet, session, questions, participants, answers, adminUserId, reload }: {
  quizSet: QuizSet; session: LiveSession | null; questions: LiveQuestion[];
  participants: LiveParticipant[]; answers: LiveAnswer[]; adminUserId: string; reload: () => Promise<void>;
}) {
  const invoke = async (action: string, extras: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke('live-admin', {
      body: { admin_user_id: adminUserId, action, ...extras },
    });
    if (error) { toast.error(error.message); return null; }
    if (data?.error) { toast.error(data.error); return null; }
    return data;
  };

  const startSession = async () => {
    const res = await invoke('start_session', { quiz_set_id: quizSet.id });
    if (res) toast.success('Live session created — players can join!');
    await reload();
  };
  const startQuestion = async () => { if (session) await invoke('start_question', { session_id: session.id }); };
  const revealAnswer = async () => { if (session) await invoke('reveal_answer', { session_id: session.id }); };
  const nextQuestion = async () => {
    if (!session) return;
    const res = await invoke('next_question', { session_id: session.id });
    if (res?.finished) toast.success('Game finished!');
  };
  const endSession = async () => {
    if (!session) return;
    if (!confirm('End the live session?')) return;
    await invoke('end_session', { session_id: session.id });
    await reload();
  };

  if (!session) {
    return (
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold">You're the host of this show</h2>
        <p className="text-sm text-muted-foreground">
          {questions.length} questions loaded. Start when you're ready — spectators will see the game update live.
        </p>
        <Button onClick={startSession} className="w-full gap-2" size="lg">
          <Play className="w-4 h-4" /> Start live session
        </Button>
      </Card>
    );
  }

  const currentQ = questions[session.current_question_index];
  const currentAnswers = currentQ ? answers.filter((a) => a.question_id === currentQ.id) : [];
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  currentAnswers.forEach((a) => { counts[a.choice]++; });

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Question</p>
            <p className="font-bold">{session.current_question_index + 1} / {questions.length}</p>
          </div>
          <Badge>{session.status}</Badge>
        </div>

        {currentQ ? (
          <>
            <p className="font-semibold">{currentQ.question}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {CHOICES.map((c) => {
                const isCorrect = c === currentQ.correct_choice;
                return (
                  <div key={c} className={cn('p-2 rounded-lg border', isCorrect && 'border-green-500 bg-green-500/10')}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{c}. {isCorrect && '✓'}</span>
                      <span className="text-xs text-muted-foreground">{counts[c]}</span>
                    </div>
                    <div className="text-xs">{currentQ[`choice_${c.toLowerCase()}` as 'choice_a']}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentAnswers.length} / {participants.filter((p) => p.role === 'guest' && !p.is_eliminated).length} answered
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No question loaded.</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {session.status === 'lobby' && (
            <Button onClick={startQuestion} className="col-span-2 gap-2"><Play className="w-4 h-4" /> Start First Question</Button>
          )}
          {session.status === 'question' && (
            <Button onClick={revealAnswer} className="col-span-2 gap-2"><Check className="w-4 h-4" /> Reveal Answer</Button>
          )}
          {session.status === 'reveal' && (
            <Button onClick={nextQuestion} className="col-span-2 gap-2">
              <SkipForward className="w-4 h-4" />
              {session.current_question_index + 1 >= questions.length ? 'Finish Game' : 'Next Question'}
            </Button>
          )}
          <Button onClick={endSession} variant="destructive" className="col-span-2">End Session</Button>
        </div>
      </Card>

      <Leaderboard participants={participants} answers={answers} />
    </div>
  );
}
