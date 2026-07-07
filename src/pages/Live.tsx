// Live game page — Kahoot-style real-time game
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_PRIZE_LADDER, formatJC } from '@/lib/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check, X, Trophy, Users, Eye, Play, SkipForward, Radio, Plus, Trash2 } from 'lucide-react';

type SessionStatus = 'lobby' | 'question' | 'reveal' | 'finished';
type Role = 'admin' | 'guest' | 'spectator';

interface LiveSession {
  id: string;
  quiz_set_id: string | null;
  status: SessionStatus;
  current_question_index: number;
  current_question_started_at: string | null;
  is_active: boolean;
}
interface LiveQuestion {
  id: string;
  quiz_set_id: string;
  order_index: number;
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: 'A' | 'B' | 'C' | 'D';
  prize_amount: number;
}
interface LiveQuizSet {
  id: string;
  name: string;
  description: string | null;
}
interface LiveParticipant {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string | null;
  role: Role;
  current_ladder_amount: number;
  reached_index: number;
  is_eliminated: boolean;
}
interface LiveAnswer {
  id: string;
  session_id: string;
  question_id: string;
  user_id: string;
  choice: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean | null;
}

const CHOICES: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
const CHOICE_COLORS = {
  A: 'bg-red-500 hover:bg-red-600 text-white',
  B: 'bg-blue-500 hover:bg-blue-600 text-white',
  C: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  D: 'bg-green-500 hover:bg-green-600 text-white',
};

export default function Live() {
  const { state, isAdmin } = useGame();
  const user = state.user;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [answers, setAnswers] = useState<LiveAnswer[]>([]);
  const [quizSets, setQuizSets] = useState<LiveQuizSet[]>([]);
  const [chosenRole, setChosenRole] = useState<'guest' | 'spectator' | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine effective role
  const role: Role = isAdmin ? 'admin' : chosenRole === 'spectator' ? 'spectator' : 'guest';

  // Load active session + related data
  const loadAll = async () => {
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

    const { data: sets } = await supabase.from('live_quiz_sets').select('*').order('created_at', { ascending: false });
    setQuizSets((sets as LiveQuizSet[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('live-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_sessions' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_participants' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_answers' }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-join session as participant
  useEffect(() => {
    const join = async () => {
      if (!session || !user) return;
      if (role === 'admin') return;
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
  }, [session?.id, user?.id, role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-24">
        <div className="text-muted-foreground">Loading live room…</div>
      </div>
    );
  }

  // No signed-in user → force spectator
  if (!user && chosenRole !== 'spectator') {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-3xl font-display font-bold">LIVE</h1>
        </div>
        <p className="text-center text-muted-foreground">
          Sign in on the home page to play as a Guest, or watch as a Spectator.
        </p>
        <Button onClick={() => setChosenRole('spectator')} variant="secondary" className="gap-2">
          <Eye className="w-4 h-4" /> Watch as Spectator
        </Button>
      </div>
    );
  }

  // Role picker for signed-in non-admins
  if (user && !isAdmin && chosenRole === null) {
    return (
      <div className="min-h-screen pt-6 pb-32 px-4 max-w-md mx-auto flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Radio className="w-6 h-6 animate-pulse" />
          <h1 className="text-3xl font-display font-bold">LIVE</h1>
        </div>
        <p className="text-center text-muted-foreground">Choose how you want to join.</p>
        <div className="grid grid-cols-1 gap-3 w-full">
          <Button size="lg" className="gap-2" onClick={() => setChosenRole('guest')}>
            <Play className="w-4 h-4" /> Play as Guest
          </Button>
          <Button size="lg" variant="secondary" className="gap-2" onClick={() => setChosenRole('spectator')}>
            <Eye className="w-4 h-4" /> Watch as Spectator
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-4 pb-32 px-4 max-w-2xl mx-auto">
      <Header role={role} session={session} participantCount={participants.filter(p => p.role !== 'admin').length} />
      {role === 'admin' ? (
        <AdminView
          session={session}
          questions={questions}
          participants={participants}
          answers={answers}
          quizSets={quizSets}
          reload={loadAll}
          adminUserId={user?.id || ''}
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
    </div>
  );
}

function Header({ role, session, participantCount }: { role: Role; session: LiveSession | null; participantCount: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-red-500 font-bold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm">LIVE</span>
        </div>
        <Badge variant="outline" className="capitalize">{role}</Badge>
        {session && <Badge variant="secondary" className="capitalize">{session.status}</Badge>}
      </div>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        {participantCount}
      </div>
    </div>
  );
}

/* ---------------- Player (Guest / Spectator) view ---------------- */

function PlayerView({
  role,
  session,
  questions,
  participants,
  answers,
  userId,
}: {
  role: Role;
  session: LiveSession | null;
  questions: LiveQuestion[];
  participants: LiveParticipant[];
  answers: LiveAnswer[];
  userId: string;
}) {
  if (!session) {
    return (
      <Card className="p-6 text-center">
        <p className="text-lg font-semibold mb-2">No live session right now</p>
        <p className="text-sm text-muted-foreground">Come back when an admin starts the show.</p>
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
      session_id: session.id,
      question_id: currentQ.id,
      user_id: userId,
      choice,
      is_correct: isCorrect,
    });
    if (error) {
      toast.error('Failed to submit answer');
      return;
    }
    toast.success('Answer locked in!');
  };

  if (session.status === 'lobby') {
    return (
      <Card className="p-6 text-center space-y-3">
        <div className="text-4xl">🎬</div>
        <p className="text-lg font-semibold">Waiting for the host to start…</p>
        <p className="text-sm text-muted-foreground">{participants.filter(p => p.role !== 'admin').length} players in the room</p>
        <ParticipantsList participants={participants} />
      </Card>
    );
  }

  if (session.status === 'finished') {
    return <Leaderboard participants={participants} highlightUserId={userId} finished />;
  }

  if (!currentQ) {
    return <Card className="p-6 text-center">Waiting for next question…</Card>;
  }

  const showReveal = session.status === 'reveal';
  const questionAnswers = answers.filter((a) => a.question_id === currentQ.id);
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  questionAnswers.forEach((a) => { counts[a.choice]++; });
  const totalCount = questionAnswers.length || 1;

  return (
    <div className="space-y-4">
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
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/25 flex items-center justify-center font-bold">
                  {c}
                </span>
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

      {role === 'spectator' && (
        <p className="text-xs text-center text-muted-foreground">Spectators can watch but can't submit answers.</p>
      )}

      {me && (
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your stack</p>
            <p className="text-xl font-bold text-primary">{formatJC(me.current_ladder_amount)} $JC</p>
          </div>
          {me.is_eliminated && <Badge variant="destructive">Eliminated</Badge>}
        </Card>
      )}
    </div>
  );
}

function ParticipantsList({ participants }: { participants: LiveParticipant[] }) {
  const players = participants.filter((p) => p.role !== 'admin');
  if (!players.length) return null;
  return (
    <div className="flex flex-wrap gap-2 justify-center pt-2">
      {players.map((p) => (
        <Badge key={p.id} variant={p.role === 'spectator' ? 'outline' : 'secondary'}>
          {p.role === 'spectator' && <Eye className="w-3 h-3 mr-1" />}
          {p.display_name || p.user_id.slice(0, 6)}
        </Badge>
      ))}
    </div>
  );
}

function Leaderboard({ participants, highlightUserId, finished }: { participants: LiveParticipant[]; highlightUserId?: string; finished?: boolean }) {
  const players = [...participants].filter((p) => p.role === 'guest').sort((a, b) => b.current_ladder_amount - a.current_ladder_amount);
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">{finished ? 'Final Standings' : 'Leaderboard'}</h2>
      </div>
      {players.length === 0 && <p className="text-sm text-muted-foreground">No players yet.</p>}
      {players.map((p, i) => (
        <div
          key={p.id}
          className={cn(
            'flex items-center justify-between p-2 rounded-lg',
            p.user_id === highlightUserId && 'bg-primary/10 border border-primary/30',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="w-6 text-center font-bold text-muted-foreground">#{i + 1}</span>
            <span className="font-semibold">{p.display_name || p.user_id.slice(0, 6)}</span>
            {p.is_eliminated && <Badge variant="destructive" className="text-xs">Out</Badge>}
          </div>
          <span className="font-bold text-primary">{formatJC(p.current_ladder_amount)} $JC</span>
        </div>
      ))}
    </Card>
  );
}

/* ---------------- Admin view ---------------- */

function AdminView({
  session, questions, participants, answers, quizSets, reload, adminUserId,
}: {
  session: LiveSession | null;
  questions: LiveQuestion[];
  participants: LiveParticipant[];
  answers: LiveAnswer[];
  quizSets: LiveQuizSet[];
  reload: () => Promise<void>;
  adminUserId: string;
}) {
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [showBuilder, setShowBuilder] = useState(false);

  const invoke = async (action: string, extras: Record<string, unknown> = {}) => {
    if (!adminUserId) { toast.error('Admin user missing'); return null; }
    const { data, error } = await supabase.functions.invoke('live-admin', {
      body: { admin_user_id: adminUserId, action, ...extras },
    });
    if (error) { toast.error(error.message); return null; }
    if (data?.error) { toast.error(data.error); return null; }
    return data;
  };

  const startSession = async () => {
    if (!selectedSetId) { toast.error('Pick a quiz set first'); return; }
    const res = await invoke('start_session', { quiz_set_id: selectedSetId });
    if (res) toast.success('Live session created — players can join!');
    await reload();
  };

  const startQuestion = async () => {
    if (!session) return;
    await invoke('start_question', { session_id: session.id });
  };

  const revealAnswer = async () => {
    if (!session) return;
    await invoke('reveal_answer', { session_id: session.id });
  };

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
      <div className="space-y-4">
        <Card className="p-5 space-y-3">
          <h2 className="text-lg font-bold">Start a live session</h2>
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a quiz set…</option>
            {quizSets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button onClick={startSession} className="flex-1 gap-2">
              <Play className="w-4 h-4" /> Start Session
            </Button>
            <Button variant="outline" onClick={() => setShowBuilder((v) => !v)} className="gap-2">
              <Plus className="w-4 h-4" /> Quiz Sets
            </Button>
          </div>
        </Card>

        {showBuilder && <QuizSetBuilder quizSets={quizSets} reload={reload} />}
      </div>
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
            <Button onClick={startQuestion} className="col-span-2 gap-2">
              <Play className="w-4 h-4" /> Start First Question
            </Button>
          )}
          {session.status === 'question' && (
            <Button onClick={revealAnswer} className="col-span-2 gap-2" variant="default">
              <Check className="w-4 h-4" /> Reveal Answer
            </Button>
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

      <Leaderboard participants={participants} />
      <ParticipantsList participants={participants} />
    </div>
  );
}

/* ---------------- Quiz Set Builder ---------------- */

function QuizSetBuilder({ quizSets, reload }: { quizSets: LiveQuizSet[]; reload: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [editSetId, setEditSetId] = useState<string | null>(null);
  const [setQuestions, setSetQuestions] = useState<LiveQuestion[]>([]);

  const createSet = async () => {
    if (!name.trim()) return;
    const { data, error } = await supabase.from('live_quiz_sets').insert({ name }).select().single();
    if (error) { toast.error(error.message); return; }
    setName('');
    setEditSetId(data.id);
    await reload();
  };

  const loadQuestions = async (setId: string) => {
    const { data } = await supabase.from('live_questions').select('*').eq('quiz_set_id', setId).order('order_index');
    setSetQuestions((data as LiveQuestion[]) || []);
  };

  useEffect(() => {
    if (editSetId) loadQuestions(editSetId);
  }, [editSetId]);

  const addQuestion = async () => {
    if (!editSetId) return;
    const nextIdx = setQuestions.length;
    const defaultPrize = DEFAULT_PRIZE_LADDER[nextIdx]?.prizeAmount || 100;
    await supabase.from('live_questions').insert({
      quiz_set_id: editSetId,
      order_index: nextIdx,
      question: 'New question',
      choice_a: 'Option A',
      choice_b: 'Option B',
      choice_c: 'Option C',
      choice_d: 'Option D',
      correct_choice: 'A',
      prize_amount: defaultPrize,
    });
    loadQuestions(editSetId);
  };

  const updateQuestion = async (id: string, patch: Partial<LiveQuestion>) => {
    await supabase.from('live_questions').update(patch).eq('id', id);
    if (editSetId) loadQuestions(editSetId);
  };
  const deleteQuestion = async (id: string) => {
    await supabase.from('live_questions').delete().eq('id', id);
    if (editSetId) loadQuestions(editSetId);
  };
  const deleteSet = async (id: string) => {
    if (!confirm('Delete this quiz set?')) return;
    await supabase.from('live_quiz_sets').delete().eq('id', id);
    if (editSetId === id) setEditSetId(null);
    await reload();
  };

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-bold">Quiz Sets</h3>

      <div className="flex gap-2">
        <Input placeholder="New quiz set name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={createSet} className="gap-1"><Plus className="w-4 h-4" />Create</Button>
      </div>

      <div className="space-y-2">
        {quizSets.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-2 border rounded-lg">
            <button className="text-left flex-1 font-semibold" onClick={() => setEditSetId(editSetId === s.id ? null : s.id)}>
              {s.name}
            </button>
            <Button size="icon" variant="ghost" onClick={() => deleteSet(s.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {editSetId && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Questions</h4>
            <Button size="sm" onClick={addQuestion} className="gap-1"><Plus className="w-3 h-3" />Add</Button>
          </div>
          {setQuestions.map((q) => (
            <div key={q.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">#{q.order_index + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <Textarea
                value={q.question}
                onChange={(e) => setSetQuestions((prev) => prev.map(x => x.id === q.id ? { ...x, question: e.target.value } : x))}
                onBlur={(e) => updateQuestion(q.id, { question: e.target.value })}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                {CHOICES.map((c) => (
                  <Input
                    key={c}
                    value={q[`choice_${c.toLowerCase()}` as 'choice_a']}
                    onChange={(e) => setSetQuestions((prev) => prev.map(x => x.id === q.id ? { ...x, [`choice_${c.toLowerCase()}`]: e.target.value } : x))}
                    onBlur={(e) => updateQuestion(q.id, { [`choice_${c.toLowerCase()}`]: e.target.value } as any)}
                    placeholder={`Choice ${c}`}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-xs">Correct:</label>
                <select
                  value={q.correct_choice}
                  onChange={(e) => updateQuestion(q.id, { correct_choice: e.target.value as any })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label className="text-xs ml-2">Prize $JC:</label>
                <Input
                  type="number"
                  value={q.prize_amount}
                  onChange={(e) => setSetQuestions((prev) => prev.map(x => x.id === q.id ? { ...x, prize_amount: parseInt(e.target.value) || 0 } : x))}
                  onBlur={(e) => updateQuestion(q.id, { prize_amount: parseInt(e.target.value) || 0 })}
                  className="h-8 w-24"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
