import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGame } from '@/contexts/GameContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Trash2, RefreshCw, Shield, ArrowLeft, Check, AlertCircle, BarChart3, RotateCcw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface QuestionInput {
  question: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_choice: 'A' | 'B' | 'C' | 'D';
  difficulty: number;
  category: string;
  hint: string;
  active_dates?: string; // Optional: YYYY-MM-DD format
}

interface ExistingQuestion {
  id: string;
  question: string;
  difficulty: number;
  category: string;
  is_active: boolean;
  active_dates: string;
}

interface QuestionStats {
  question_id: string;
  question_text: string;
  category: string;
  difficulty: number;
  total_answers: number;
  correct_count: number;
  wrong_count: number;
  success_rate: number;
}

const SAMPLE_FORMAT = `[
  {
    "question": "What is the primary purpose of World ID?",
    "choice_a": "Social media login",
    "choice_b": "Proof of personhood",
    "choice_c": "Payment processing",
    "choice_d": "Cloud storage",
    "correct_choice": "B",
    "difficulty": 1,
    "category": "World",
    "hint": "Think about what makes you unique as a human online..."
  }
]

📅 Questions will be automatically split across 7 days starting from today.
   Example: 105 questions = 15 questions per day for 7 days.`;

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { state, isAdmin } = useGame();
  const { user } = state;
  
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState<ExistingQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (user && isAdmin === false) {
      toast.error('Access denied. Admin only.');
      navigate('/game');
    }
  }, [user, isAdmin, navigate]);

  // Fetch existing questions and stats
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoadingQuestions(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, question, difficulty, category, is_active, active_dates')
        .order('difficulty', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
      } else {
        setExistingQuestions(data || []);
      }
      setIsLoadingQuestions(false);
    };

    const fetchStats = async () => {
      setIsLoadingStats(true);
      
      // Fetch all answers with question info
      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('question_id, is_correct');
      
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question, category, difficulty');
      
      if (answersError || questionsError) {
        console.error('Error fetching stats:', answersError || questionsError);
      } else if (answers && questions) {
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
        
        // Build stats array
        const stats: QuestionStats[] = questions
          .filter(q => statsMap.has(q.id))
          .map(q => {
            const s = statsMap.get(q.id)!;
            const total = s.correct + s.wrong;
            return {
              question_id: q.id,
              question_text: q.question,
              category: q.category,
              difficulty: q.difficulty,
              total_answers: total,
              correct_count: s.correct,
              wrong_count: s.wrong,
              success_rate: total > 0 ? Math.round((s.correct / total) * 100) : 0,
            };
          })
          .sort((a, b) => b.total_answers - a.total_answers);
        
        setQuestionStats(stats);
      }
      setIsLoadingStats(false);
    };

    if (isAdmin) {
      fetchQuestions();
      fetchStats();
    }
  }, [isAdmin]);

  const validateQuestions = (questions: unknown[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!Array.isArray(questions)) {
      return { valid: false, errors: ['Input must be a JSON array'] };
    }

    questions.forEach((q, index) => {
      const question = q as Record<string, unknown>;
      if (!question.question || typeof question.question !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'question' field`);
      }
      if (!question.choice_a || typeof question.choice_a !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_a' field`);
      }
      if (!question.choice_b || typeof question.choice_b !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_b' field`);
      }
      if (!question.choice_c || typeof question.choice_c !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_c' field`);
      }
      if (!question.choice_d || typeof question.choice_d !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'choice_d' field`);
      }
      if (!['A', 'B', 'C', 'D'].includes(String(question.correct_choice).toUpperCase())) {
        errors.push(`Question ${index + 1}: 'correct_choice' must be A, B, C, or D`);
      }
      if (typeof question.difficulty !== 'number' || question.difficulty < 1 || question.difficulty > 5) {
        errors.push(`Question ${index + 1}: 'difficulty' must be a number between 1-5`);
      }
      if (!question.category || typeof question.category !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'category' field`);
      }
      if (!question.hint || typeof question.hint !== 'string') {
        errors.push(`Question ${index + 1}: Missing or invalid 'hint' field`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const result = validateQuestions(parsed);
      setValidationResult(result);
      
      if (result.valid) {
        const questionsPerDay = Math.ceil(parsed.length / 7);
        toast.success(`Valid! ${parsed.length} questions → ${questionsPerDay} per day for 7 days.`);
      } else {
        toast.error(`Found ${result.errors.length} validation errors`);
      }
    } catch (err) {
      setValidationResult({ valid: false, errors: ['Invalid JSON format. Check your syntax.'] });
      toast.error('Invalid JSON format');
    }
  };

  const handleUpload = async () => {
    if (!validationResult?.valid) {
      toast.error('Please validate the questions first');
      return;
    }

    setIsLoading(true);
    try {
      const parsed: QuestionInput[] = JSON.parse(jsonInput);
      const totalQuestions = parsed.length;
      const questionsPerDay = Math.ceil(totalQuestions / 7);
      
      // Helper to get date string for day offset
      const getDateForDay = (dayOffset: number): string => {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        return date.toISOString().split('T')[0];
      };
      
      // Generate text_hash for each question and assign to days
      const questionsToInsert = parsed.map((q, index) => {
        const dayIndex = Math.floor(index / questionsPerDay); // 0-6 for 7 days
        return {
          question: q.question,
          choice_a: q.choice_a,
          choice_b: q.choice_b,
          choice_c: q.choice_c,
          choice_d: q.choice_d,
          correct_choice: q.correct_choice.toUpperCase(),
          difficulty: q.difficulty,
          category: q.category,
          hint: q.hint,
          text_hash: btoa(q.question.slice(0, 50)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32),
          is_active: true,
          active_dates: q.active_dates || getDateForDay(dayIndex),
        };
      });

      const { data, error } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select();

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.success(`Successfully uploaded ${data?.length || 0} questions!`);
        setJsonInput('');
        setValidationResult(null);
        
        // Refresh the list
        const { data: refreshed } = await supabase
          .from('questions')
          .select('id, question, difficulty, category, is_active, active_dates')
          .order('difficulty', { ascending: true })
          .order('created_at', { ascending: false });
        setExistingQuestions(refreshed || []);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateAll = async () => {
    if (!confirm('Are you sure you want to deactivate ALL questions?')) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;
      
      toast.success('All questions deactivated');
      setExistingQuestions(prev => prev.map(q => ({ ...q, is_active: false })));
    } catch (err) {
      console.error('Deactivate error:', err);
      toast.error('Failed to deactivate questions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestionActive = async (id: string, currentlyActive: boolean) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: !currentlyActive })
        .eq('id', id);

      if (error) throw error;
      
      setExistingQuestions(prev => 
        prev.map(q => q.id === id ? { ...q, is_active: !currentlyActive } : q)
      );
      toast.success(currentlyActive ? 'Question deactivated' : 'Question activated');
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Failed to update question');
    }
  };

  const handleResetAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL game data including:\n\n• Attempts/Plays\n• Referrals\n• Leaderboard\n• User Balances\n• Runs & Answers\n• Claims\n• User Streaks\n\nThis action cannot be undone. Continue?')) {
      return;
    }
    
    setIsResetting(true);
    try {
      // Delete from each table - using gt to match all UUIDs
      await supabase.from('claims').delete().gt('created_at', '1970-01-01');
      await supabase.from('answers').delete().gt('created_at', '1970-01-01');
      await supabase.from('runs').delete().gt('started_at', '1970-01-01');
      await supabase.from('attempts').delete().gt('day_id', '1970-01-01');
      await supabase.from('referrals').delete().gt('created_at', '1970-01-01');
      await supabase.from('leaderboard_snapshots').delete().gt('created_at', '1970-01-01');
      await supabase.from('user_balances').delete().gt('created_at', '1970-01-01');
      await supabase.from('user_streaks').delete().gt('created_at', '1970-01-01');
      
      toast.success('All game data has been reset!');
      
      // Refresh stats
      setQuestionStats([]);
      
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset data');
    } finally {
      setIsResetting(false);
    }
  };

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
    <div className="min-h-screen gradient-hero pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/game')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold">Admin: Questions</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/analytics')}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Section */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload New Questions
          </h2>
          
          <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <p className="font-medium mb-2">Expected JSON format:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{SAMPLE_FORMAT}</pre>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setValidationResult(null);
            }}
            placeholder="Paste your questions JSON here..."
            className="min-h-[200px] font-mono text-sm"
          />

          {/* Validation Result */}
          {validationResult && (
            <div className={cn(
              'p-3 rounded-lg border',
              validationResult.valid 
                ? 'bg-success/10 border-success/30 text-success' 
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            )}>
              {validationResult.valid ? (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Valid JSON - ready to upload!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Validation Errors:</span>
                  </div>
                  <ul className="text-xs space-y-1 ml-6 list-disc">
                    {validationResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li>...and {validationResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleValidate}
              disabled={!jsonInput.trim()}
            >
              <Check className="w-4 h-4" />
              Validate
            </Button>
            <Button 
              variant="gold" 
              onClick={handleUpload}
              disabled={!validationResult?.valid || isLoading}
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Questions
            </Button>
          </div>
        </section>

        {/* Question Analytics */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Question Analytics
          </h2>

          {isLoadingStats ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : questionStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No answer data yet. Stats will appear once players answer questions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Diff</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center text-success">Correct</TableHead>
                    <TableHead className="text-center text-destructive">Wrong</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questionStats.map((stat) => (
                    <TableRow key={stat.question_id}>
                      <TableCell className="font-medium text-sm max-w-[300px] truncate">
                        {stat.question_text}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {stat.category}
                      </TableCell>
                      <TableCell className="text-center">{stat.difficulty}</TableCell>
                      <TableCell className="text-center font-medium">{stat.total_answers}</TableCell>
                      <TableCell className="text-center text-success font-medium">
                        {stat.correct_count}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-medium">
                        {stat.wrong_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          stat.success_rate >= 70 ? 'bg-success/20 text-success' :
                          stat.success_rate >= 40 ? 'bg-warning/20 text-warning' :
                          'bg-destructive/20 text-destructive'
                        )}>
                          {stat.success_rate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Existing Questions */}
        <section className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold">
              Existing Questions ({existingQuestions.length})
            </h2>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeactivateAll}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              Deactivate All
            </Button>
          </div>

          {isLoadingQuestions ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : existingQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No questions found. Upload some above!
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {existingQuestions.map((q) => (
                <div 
                  key={q.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    q.is_active 
                      ? 'bg-success/5 border-success/20' 
                      : 'bg-secondary/30 border-border opacity-60'
                  )}
                >
                  <button
                    onClick={() => toggleQuestionActive(q.id, q.is_active)}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                      q.is_active 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {q.is_active && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.question}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Difficulty: {q.difficulty === 1 ? 'Funny' : q.difficulty <= 3 ? 'Medium' : 'Hard'}</span>
                      <span>•</span>
                      <span>{q.category}</span>
                      <span>•</span>
                      <span className="text-primary">{q.active_dates}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Reset All Data Section */}
        <section className="bg-destructive/5 rounded-xl border border-destructive/30 p-5 space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2 text-destructive">
            <RotateCcw className="w-5 h-5" />
            Reset All Game Data
          </h2>
          
          <p className="text-sm text-muted-foreground">
            This will permanently delete all game data including attempts, referrals, leaderboard, 
            user balances, runs, answers, claims, and streaks. Questions will NOT be deleted.
          </p>
          
          <Button 
            variant="destructive" 
            onClick={handleResetAllData}
            disabled={isResetting}
          >
            {isResetting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Reset All Data
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Admin;
