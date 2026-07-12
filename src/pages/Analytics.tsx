import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, ArrowLeft, BarChart3, Users, TrendingUp, CheckCircle, XCircle, AlertTriangle, Share2, UserCheck, MousePointerClick, Coins, GamepadIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PlayerStats {
  todayPlayers: number;
  totalPlayers: number;
}

interface QuestionAnalytics {
  id: string;
  question: string;
  category: string;
  difficulty: number;
  totalAnswers: number;
  correctCount: number;
  wrongCount: number;
  successRate: number;
}

interface ReferralFailure {
  failure_reason: string;
  count: number;
}

interface ReferralStats {
  inviter: string;
  clicked: number;
  verified: number;
  completed: number;
  total: number;
}

interface UserStats {
  userId: string;
  username: string;
  totalRuns: number;
  totalAnswered: number;
  correctAnswers: number;
  balance: number;
}

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { state, isAdmin } = useGame();
  const { user } = state;
  
  const [playerStats, setPlayerStats] = useState<PlayerStats>({ todayPlayers: 0, totalPlayers: 0 });
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [referralFailures, setReferralFailures] = useState<ReferralFailure[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats[]>([]);
  const [referralTotals, setReferralTotals] = useState({ clicked: 0, verified: 0, completed: 0 });
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (user && isAdmin === false) {
      toast.error('Access denied. Admin only.');
      navigate('/game');
    }
  }, [user, isAdmin, navigate]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isAdmin) return;
      
      setIsLoading(true);
      
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch player stats - count unique users who have runs
        const { data: totalUsersData, error: totalError } = await supabase
          .from('users')
          .select('id', { count: 'exact' });
        
        const { data: todayRunsData, error: todayError } = await supabase
          .from('runs')
          .select('user_id')
          .eq('day_id', today);
        
        if (totalError) console.error('Total users error:', totalError);
        if (todayError) console.error('Today runs error:', todayError);
        
        // Get unique players today
        const uniqueTodayPlayers = new Set(todayRunsData?.map(r => r.user_id) || []).size;
        
        setPlayerStats({
          todayPlayers: uniqueTodayPlayers,
          totalPlayers: totalUsersData?.length || 0,
        });
        
        // Fetch question analytics
        const { data: answers, error: answersError } = await supabase
          .from('answers')
          .select('question_id, is_correct');
        
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id, question, category, difficulty');
        
        if (answersError) console.error('Answers error:', answersError);
        if (questionsError) console.error('Questions error:', questionsError);
        
        if (answers && questions) {
          // Aggregate stats per question
          const statsMap = new Map<string, { correct: number; wrong: number }>();
          
          answers.forEach((a) => {
            const current = statsMap.get(a.question_id) || { correct: 0, wrong: 0 };
            if (a.is_correct) {
              current.correct++;
            } else {
              current.wrong++;
            }
            statsMap.set(a.question_id, current);
          });
          
          // Build analytics array - include all questions
          const analytics: QuestionAnalytics[] = questions.map(q => {
            const s = statsMap.get(q.id) || { correct: 0, wrong: 0 };
            const total = s.correct + s.wrong;
            return {
              id: q.id,
              question: q.question,
              category: q.category,
              difficulty: q.difficulty,
              totalAnswers: total,
              correctCount: s.correct,
              wrongCount: s.wrong,
              successRate: total > 0 ? Math.round((s.correct / total) * 100) : 0,
            };
          }).sort((a, b) => b.totalAnswers - a.totalAnswers);
          
          setQuestionAnalytics(analytics);
        }

        // Fetch referral failure analytics
        const { data: failures, error: failuresError } = await supabase
          .from('referral_failures')
          .select('failure_reason');
        
        if (failuresError) {
          console.error('Referral failures error:', failuresError);
        } else if (failures) {
          // Aggregate by reason
          const reasonCounts = new Map<string, number>();
          failures.forEach(f => {
            const count = reasonCounts.get(f.failure_reason) || 0;
            reasonCounts.set(f.failure_reason, count + 1);
          });
          
          const aggregated: ReferralFailure[] = Array.from(reasonCounts.entries())
            .map(([reason, count]) => ({ failure_reason: reason, count }))
            .sort((a, b) => b.count - a.count);
          
          setReferralFailures(aggregated);
        }

        // Fetch referral stats by inviter
        const { data: referrals, error: referralsError } = await supabase
          .from('referrals')
          .select(`
            status,
            inviter_user_id,
            users!referrals_inviter_user_id_fkey (username)
          `);
        
        if (referralsError) {
          console.error('Referrals error:', referralsError);
        } else if (referrals) {
          // Aggregate by inviter
          const inviterMap = new Map<string, { inviter: string; clicked: number; verified: number; completed: number }>();
          let totalClicked = 0, totalVerified = 0, totalCompleted = 0;
          
          referrals.forEach((r: any) => {
            const inviterName = r.users?.username || 'Unknown';
            const current = inviterMap.get(inviterName) || { inviter: inviterName, clicked: 0, verified: 0, completed: 0 };
            
            if (r.status === 'clicked') {
              current.clicked++;
              totalClicked++;
            } else if (r.status === 'verified') {
              current.verified++;
              totalVerified++;
            } else if (r.status === 'first_run_completed') {
              current.completed++;
              totalCompleted++;
            }
            
            inviterMap.set(inviterName, current);
          });
          
          const stats: ReferralStats[] = Array.from(inviterMap.values())
            .map(s => ({ ...s, total: s.clicked + s.verified + s.completed }))
            .sort((a, b) => b.total - a.total);
          
          setReferralStats(stats);
          setReferralTotals({ clicked: totalClicked, verified: totalVerified, completed: totalCompleted });
        }

        // Fetch per-user stats
        const [usersRes, runsRes, allAnswersRes, balancesRes] = await Promise.all([
          supabase.from('users').select('id, username'),
          supabase.from('runs').select('user_id'),
          supabase.from('answers').select('run_id, is_correct, runs!inner(user_id)'),
          supabase.from('user_balances').select('user_id, total_claimed'),
        ]);

        if (usersRes.data) {
          const runCountMap = new Map<string, number>();
          (runsRes.data || []).forEach((r: any) => {
            runCountMap.set(r.user_id, (runCountMap.get(r.user_id) || 0) + 1);
          });

          const answerMap = new Map<string, { total: number; correct: number }>();
          (allAnswersRes.data || []).forEach((a: any) => {
            const uid = a.runs?.user_id;
            if (!uid) return;
            const cur = answerMap.get(uid) || { total: 0, correct: 0 };
            cur.total++;
            if (a.is_correct) cur.correct++;
            answerMap.set(uid, cur);
          });

          const balanceMap = new Map<string, number>();
          (balancesRes.data || []).forEach((b: any) => {
            balanceMap.set(b.user_id, b.total_claimed);
          });

          const uStats: UserStats[] = usersRes.data.map((u: any) => {
            const ans = answerMap.get(u.id) || { total: 0, correct: 0 };
            return {
              userId: u.id,
              username: u.username || 'Anonymous',
              totalRuns: runCountMap.get(u.id) || 0,
              totalAnswered: ans.total,
              correctAnswers: ans.correct,
              balance: balanceMap.get(u.id) || 0,
            };
          }).sort((a: UserStats, b: UserStats) => b.totalRuns - a.totalRuns);

          setUserStats(uStats);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
        toast.error('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAdmin]);

  // Show loading while checking admin status
  if (isAdmin === undefined) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authorized
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate('/game')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <BarChart3 className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-display font-bold">Analytics</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Player Stats */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-display font-bold text-foreground">
              {isLoading ? '—' : playerStats.todayPlayers}
            </p>
            <p className="text-sm text-muted-foreground">Players Today</p>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-5 text-center">
            <TrendingUp className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-3xl font-display font-bold text-foreground">
              {isLoading ? '—' : playerStats.totalPlayers}
            </p>
            <p className="text-sm text-muted-foreground">Total Players</p>
          </div>
        </section>

        {/* Question Analytics */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Question Performance
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : questionAnalytics.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No questions found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Diff</TableHead>
                    <TableHead className="text-center">
                      <CheckCircle className="w-4 h-4 inline text-success" />
                    </TableHead>
                    <TableHead className="text-center">
                      <XCircle className="w-4 h-4 inline text-destructive" />
                    </TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionAnalytics.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium text-sm max-w-[300px] truncate">
                        {q.question}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
                          {q.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'px-2 py-1 text-xs rounded-full font-medium',
                          q.difficulty === 1 ? 'bg-success/20 text-success' :
                          q.difficulty <= 3 ? 'bg-warning/20 text-warning' :
                          'bg-destructive/20 text-destructive'
                        )}>
                          {q.difficulty === 1 ? 'Funny' : q.difficulty <= 3 ? 'Medium' : 'Hard'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-success font-medium">
                        {q.correctCount}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-medium">
                        {q.wrongCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {q.totalAnswers > 0 ? (
                          <span className={cn(
                            'font-medium',
                            q.successRate >= 70 ? 'text-success' :
                            q.successRate >= 40 ? 'text-warning' :
                            'text-destructive'
                          )}>
                            {q.successRate}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {!isLoading && questionAnalytics.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Showing {questionAnalytics.length} questions • {questionAnalytics.filter(q => q.totalAnswers > 0).length} with answers
            </p>
          )}
        </section>

        {/* Referral Analytics */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Referral Performance
          </h2>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <MousePointerClick className="w-5 h-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold">{referralTotals.clicked}</p>
              <p className="text-xs text-muted-foreground">Clicked</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <UserCheck className="w-5 h-5 text-info mx-auto mb-1" />
              <p className="text-xl font-bold">{referralTotals.verified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-xl font-bold">{referralTotals.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : referralStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No referrals yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inviter</TableHead>
                    <TableHead className="text-center">
                      <MousePointerClick className="w-4 h-4 inline text-warning" />
                    </TableHead>
                    <TableHead className="text-center">
                      <UserCheck className="w-4 h-4 inline text-info" />
                    </TableHead>
                    <TableHead className="text-center">
                      <CheckCircle className="w-4 h-4 inline text-success" />
                    </TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralStats.map((s) => (
                    <TableRow key={s.inviter}>
                      <TableCell className="font-medium">
                        {s.inviter}
                      </TableCell>
                      <TableCell className="text-center text-warning font-medium">
                        {s.clicked || '—'}
                      </TableCell>
                      <TableCell className="text-center text-info font-medium">
                        {s.verified || '—'}
                      </TableCell>
                      <TableCell className="text-center text-success font-medium">
                        {s.completed || '—'}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {s.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {!isLoading && referralStats.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {referralStats.length} inviters • {referralTotals.clicked + referralTotals.verified + referralTotals.completed} total referrals
            </p>
          )}
        </section>

        {/* Referral Failure Analytics */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Referral Failures
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : referralFailures.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No referral failures recorded.
            </p>
          ) : (
            <div className="space-y-2">
              {referralFailures.map((f) => (
                <div key={f.failure_reason} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium capitalize">
                    {f.failure_reason.replace(/_/g, ' ')}
                  </span>
                  <span className={cn(
                    "px-3 py-1 text-sm font-bold rounded-full",
                    f.count > 10 ? "bg-destructive/20 text-destructive" :
                    f.count > 5 ? "bg-warning/20 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {f.count}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Total: {referralFailures.reduce((sum, f) => sum + f.count, 0)} failed attempts
              </p>
            </div>
          )}
        </section>

        {/* Per-User Stats */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <GamepadIcon className="w-5 h-5 text-primary" />
            Player Details
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : userStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No players yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead className="text-center">Answered</TableHead>
                    <TableHead className="text-center">
                      <CheckCircle className="w-4 h-4 inline text-success" />
                    </TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-center">
                      <Coins className="w-4 h-4 inline text-warning" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium text-sm max-w-[150px] truncate">
                        {u.username}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {u.totalRuns}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.totalAnswered}
                      </TableCell>
                      <TableCell className="text-center text-success font-medium">
                        {u.correctAnswers}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.totalAnswered > 0 ? (
                          <span className={cn(
                            'font-medium',
                            Math.round((u.correctAnswers / u.totalAnswered) * 100) >= 70 ? 'text-success' :
                            Math.round((u.correctAnswers / u.totalAnswered) * 100) >= 40 ? 'text-warning' :
                            'text-destructive'
                          )}>
                            {Math.round((u.correctAnswers / u.totalAnswered) * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold text-warning">
                        {u.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && userStats.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {userStats.length} players • {userStats.filter(u => u.totalRuns > 0).length} have played
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Analytics;
