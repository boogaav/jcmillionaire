import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/game/QuestionCard';
import { Lifelines } from '@/components/game/Lifelines';
import { Timer } from '@/components/game/Timer';
import { PrizeLadder } from '@/components/game/PrizeLadder';
import { AnswerBanner } from '@/components/game/AnswerBanner';
import { useGame } from '@/contexts/GameContext';
import { LIFELINES, LifelineType, QUESTION_TIME_LIMIT_SECONDS, formatJC } from '@/lib/constants';
import { QuestionWithHiddenChoices, AnswerStats, Run } from '@/lib/types';
import { X, AlertTriangle, Trophy, Rocket, HandCoins, Loader2 } from 'lucide-react';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  createRun,
  recordAnswer,
  updateLifelinesUsed,
  completeRun,
  getTodayDayId,
  incrementAttemptsUsed,
  fetchUserQuestions,
  fetchAnswerStats,
} from '@/lib/gameService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Safe haven checkpoints (guaranteed amounts if you lose later)
const SAFE_HAVEN_QUESTIONS = [5, 10, 15];

// Fallback questions if database is empty (should not happen in production)
const fallbackQuestions: QuestionWithHiddenChoices[] = [
  { id: 'fallback-1', question: 'Loading question...', choices: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' }, difficulty: 1, category: 'General', hint: 'Please wait...' },
];

// Helper to get today's date key
const getTodayKey = () => new Date().toISOString().split('T')[0];

// Calculate time until midnight (next game)
const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

const formatCountdown = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
};

const Game: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { state, fetchAttempts } = useGame();
  const { prizeLadder, isVerified, user, attempts } = state;

  // Questions loaded from database
  const [questions, setQuestions] = useState<QuestionWithHiddenChoices[]>(fallbackQuestions);
  const [correctAnswersMap, setCorrectAnswersMap] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null);

  // Database run tracking
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitializedRef = useRef(false);
  const questionStartTimeRef = useRef<number>(Date.now());

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithHiddenChoices | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | 'C' | 'D' | undefined>();
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT_SECONDS);
  const [usedLifelines, setUsedLifelines] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [isCompletingRun, setIsCompletingRun] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [claimedEarly, setClaimedEarly] = useState(false);
  const [hasPlayedToday, setHasPlayedToday] = useState(false);
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());
  const [showAnswerBanner, setShowAnswerBanner] = useState(false);
  const [bannerCorrect, setBannerCorrect] = useState(false);
  const [currentQuestionStats, setCurrentQuestionStats] = useState<AnswerStats | null>(null);

  // Load questions for this user's session (excluding already-answered ones)
  useEffect(() => {
    if (!user) return;

    const loadQuestions = async () => {
      const walletType = user.walletType || localStorage.getItem('jc_wallet_type') || 'world_id';
      const currentLang = (walletType === 'solana' || walletType === 'telegram') ? 'en' : ((localStorage.getItem('jc_language') as 'en' | 'es' | 'th' | 'hi' | 'id') || 'en');
      const { questions: loadedQuestions, correctAnswers, error } = await fetchUserQuestions(user.id, currentLang, walletType);
      
      if (error || loadedQuestions.length === 0) {
        console.error('Failed to load questions:', error);
        setQuestionLoadError(error === 'all_questions_answered' 
          ? 'You have answered all available questions! Check back later for new ones.' 
          : error || 'No questions available');
        setQuestionsLoaded(true);
        return;
      }

      setQuestions(loadedQuestions);
      setCorrectAnswersMap(correctAnswers);
      setCurrentQuestion(loadedQuestions[0]);
      setQuestionsLoaded(true);
      import.meta.env.DEV && console.log(`Loaded ${loadedQuestions.length} unseen questions for session`);
    };

    loadQuestions();
  }, [user]);

  // Initialize game run in database - check attempts first
  useEffect(() => {
    const initRun = async () => {
      // Prevent multiple initializations
      if (hasInitializedRef.current) {
        return;
      }

      if (!user) {
        setIsInitializing(false);
        return;
      }

      // Wait for attempts to load
      if (attempts === null) {
        return; // Will re-run when attempts loads
      }

      // Check if user has remaining attempts
      if (attempts.remaining <= 0) {
        import.meta.env.DEV && console.log('No attempts remaining, blocking game');
        setHasPlayedToday(true);
        setIsInitializing(false);
        hasInitializedRef.current = true;
        return;
      }

      // Mark as initialized to prevent duplicate runs
      hasInitializedRef.current = true;

      try {
        // First increment the used count to consume an attempt
        const { error: attemptError } = await incrementAttemptsUsed(user.id);
        if (attemptError) {
          console.error('Failed to consume attempt:', attemptError);
          navigate('/game');
          return;
        }

        // Refresh attempts state
        await fetchAttempts();

        // Then create the run
        const { run, error } = await createRun({
          userId: user.id,
          dayId: getTodayDayId(),
        });

        if (error) {
          console.error('Failed to create run:', error);
        } else if (run) {
          import.meta.env.DEV && console.log('Created run:', run.id);
          setCurrentRun(run);
        }
      } catch (err) {
        console.error('Error initializing run:', err);
      } finally {
        setIsInitializing(false);
        questionStartTimeRef.current = Date.now();
      }
    };

    initRun();
  }, [user, attempts, fetchAttempts, navigate]);

  // Countdown timer for "come back tomorrow" screen
  useEffect(() => {
    if (!hasPlayedToday) return;
    
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasPlayedToday]);

  // Mark game as played when it ends (backup for UI state)
  useEffect(() => {
    if (isGameOver) {
      localStorage.setItem('jc_last_play_date', getTodayKey());
    }
  }, [isGameOver]);

  // Redirect if not verified
  useEffect(() => {
    if (!isVerified) {
      navigate('/verify');
    }
  }, [isVerified, navigate]);

  // Timer
  useEffect(() => {
    if (showResult || isGameOver || isPaused || showCheckpointDialog || showProgressDialog) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showResult, isGameOver, isPaused, showCheckpointDialog, currentQuestionIndex]);

  const handleTimeUp = useCallback(async () => {
    setShowResult(true);
    setIsCorrect(false);
    
    const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber < currentQuestionIndex + 1);
    const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
    setEarnedAmount(safeHavenAmount);
    setIsCompletingRun(true);

    // Complete run in database BEFORE showing game over
    if (currentRun) {
      await completeRun({
        runId: currentRun.id,
        reachedQ: currentQuestionIndex + 1,
        earnedTier: safeHavens.length,
        earnedAmount: safeHavenAmount,
        status: 'completed',
      });
    }
    
    setIsCompletingRun(false);
    setIsGameOver(true);
  }, [currentQuestionIndex, prizeLadder, currentRun]);

  const handleAnswer = async (choice: 'A' | 'B' | 'C' | 'D') => {
    if (showResult || selectedChoice) return;
    
    const timeTaken = Date.now() - questionStartTimeRef.current;
    setSelectedChoice(choice);
    
    const correct = currentQuestion ? correctAnswersMap[currentQuestion.id] === choice : false;
    
    // Record answer in database
    if (currentRun) {
      await recordAnswer({
        runId: currentRun.id,
        questionId: currentQuestion.id,
        questionNumber: currentQuestionIndex + 1,
        selected: choice,
        isCorrect: correct,
        timeTakenMs: timeTaken,
      });
    }
    
    // Show answer banner immediately
    setBannerCorrect(correct);
    setShowAnswerBanner(true);

    setTimeout(async () => {
      setIsCorrect(correct);
      setShowResult(true);
      
      if (!correct) {
        const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber < currentQuestionIndex + 1);
        const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
        setEarnedAmount(safeHavenAmount);
        
        setTimeout(async () => {
          setIsCompletingRun(true);
          if (currentRun) {
            await completeRun({
              runId: currentRun.id,
              reachedQ: currentQuestionIndex + 1,
              earnedTier: safeHavens.length,
              earnedAmount: safeHavenAmount,
              status: 'completed',
            });
          }
          setIsCompletingRun(false);
          setIsGameOver(true);
        }, 2000);
      } else {
        // Show claim dialog after EVERY correct answer
        // If question index exceeds prize ladder, use the max prize (last tier)
        const maxPrize = prizeLadder.length > 0 ? prizeLadder[prizeLadder.length - 1].prizeAmount : 0;
        const currentPrize = prizeLadder[currentQuestionIndex]?.prizeAmount ?? maxPrize;
        setEarnedAmount(currentPrize);
        
        // Check if won all questions (last question)
        if (currentQuestionIndex >= questions.length - 1) {
          const finalAmount = prizeLadder[currentQuestionIndex]?.prizeAmount ?? maxPrize;
          setEarnedAmount(finalAmount);
          setIsCompletingRun(true);

          // Complete run in database BEFORE showing game over
          if (currentRun) {
            await completeRun({
              runId: currentRun.id,
              reachedQ: currentQuestionIndex + 1,
              earnedTier: currentQuestionIndex + 1,
              earnedAmount: finalAmount,
              status: 'completed',
            });
          }
          
          setIsCompletingRun(false);
          setIsGameOver(true);
        } else {
          // Show claim or continue dialog after 3 second delay
          setTimeout(() => {
            setShowCheckpointDialog(true);
          }, 1500); // Additional 1.5s delay (total ~3s with the outer timeout)
        }
      }
    }, 1500);
  };

  const handleClaimNow = async () => {
    // User chooses to claim current prize and end game
    setShowCheckpointDialog(false);
    setIsCompletingRun(true);

    // Complete run in database BEFORE navigating
    if (currentRun) {
      await completeRun({
        runId: currentRun.id,
        reachedQ: currentQuestionIndex + 1,
        earnedTier: currentQuestionIndex + 1,
        earnedAmount: earnedAmount,
        status: 'completed',
      });
    }

    setIsCompletingRun(false);
    
    // Navigate directly to Result page with auto-claim flag
    navigate('/result', { 
      state: { 
        earnedAmount, 
        reachedQuestion: currentQuestionIndex + 1,
        isWinner: true,
        runId: currentRun?.id,
        autoClaim: true, // Skip the claim button, start claiming immediately
      } 
    });
  };

  const handleKeepGoing = () => {
    // User chooses to continue - show progress dialog first
    setShowCheckpointDialog(false);
    setShowProgressDialog(true);
  };

  const handleContinueFromProgress = () => {
    // Close progress dialog and move to next question
    setShowProgressDialog(false);
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setSelectedChoice(undefined);
      setShowResult(false);
      setTimeRemaining(QUESTION_TIME_LIMIT_SECONDS);
      setShowHint(false);
      setShowStats(false);
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setSelectedChoice(undefined);
      setShowResult(false);
      setTimeRemaining(QUESTION_TIME_LIMIT_SECONDS);
      setShowHint(false);
      setShowStats(false);
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleUseLifeline = async (lifeline: LifelineType) => {
    if (usedLifelines.has(lifeline) || showResult) return;
    
    const newLifelines = new Set([...usedLifelines, lifeline]);
    setUsedLifelines(newLifelines);

    // Update lifelines in database
    if (currentRun) {
      await updateLifelinesUsed(currentRun.id, Array.from(newLifelines));
    }
    
    switch (lifeline) {
      case LIFELINES.FIFTY_FIFTY:
        if (currentQuestion) {
          const correct = correctAnswersMap[currentQuestion.id];
          const wrongChoices = (['A', 'B', 'C', 'D'] as const).filter(c => c !== correct);
          const toHide = wrongChoices.slice(0, 2);
          setCurrentQuestion({
            ...currentQuestion,
            hiddenChoices: toHide,
          });
        }
        break;
        
      case LIFELINES.HINT:
        setShowHint(true);
        break;
        
      case LIFELINES.CHAIN_SCAN:
        // Fetch real stats from database for this question
        if (currentQuestion) {
          const stats = await fetchAnswerStats(currentQuestion.id);
          setCurrentQuestionStats(stats);
        }
        setShowStats(true);
        break;
    }
  };

  const handleQuit = async () => {
    const safeHavens = prizeLadder.filter(p => p.isSafeHaven && p.questionNumber <= currentQuestionIndex);
    const safeHavenAmount = safeHavens.length > 0 ? safeHavens[safeHavens.length - 1].prizeAmount : 0;
    setEarnedAmount(safeHavenAmount);
    setShowQuitDialog(false);
    setIsCompletingRun(true);

    // Complete run as abandoned BEFORE showing game over
    if (currentRun) {
      await completeRun({
        runId: currentRun.id,
        reachedQ: currentQuestionIndex,
        earnedTier: safeHavens.length,
        earnedAmount: safeHavenAmount,
        status: 'abandoned',
      });
    }
    
    setIsCompletingRun(false);
    setIsGameOver(true);
  };

  const handleViewResult = () => {
    navigate('/result', { 
      state: { 
        earnedAmount, 
        reachedQuestion: currentQuestionIndex + 1,
        isWinner: (isCorrect && currentQuestionIndex >= questions.length - 1) || claimedEarly,
        runId: currentRun?.id, // Pass the run ID for claiming
      } 
    });
  };

  // Check if current question is a safe haven (for UI highlighting)
  const isSafeHavenQuestion = SAFE_HAVEN_QUESTIONS.includes(currentQuestionIndex + 1);

  // Show loading while initializing run or loading questions
  if (isInitializing || isCompletingRun || !questionsLoaded) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {isCompletingRun ? 'Saving your progress...' : !questionsLoaded ? 'Loading questions...' : 'Starting game...'}
        </p>
      </div>
    );
  }

  // Show error if questions failed to load
  if (questionLoadError) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-display font-bold">No Questions Available</h2>
          <p className="text-muted-foreground">{questionLoadError}</p>
          <Button variant="outline" onClick={() => navigate('/game')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Ensure currentQuestion is set
  if (!currentQuestion) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading question...</p>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <div className={cn(
          'animate-bounce-in',
          (isCorrect && currentQuestionIndex >= questions.length - 1) || claimedEarly
            ? ''
            : earnedAmount > 0
            ? ''
            : ''
        )}>
          <JackieIcon size={100} className="drop-shadow-lg" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold">
            {isCorrect && currentQuestionIndex >= questions.length - 1
              ? '🎉 JACKPOT!' 
              : claimedEarly
              ? '🎉 Smart Move!'
              : earnedAmount > 0 
              ? 'Good Run!' 
              : 'Game Over'}
          </h2>
          <p className="text-muted-foreground">
            You reached question {currentQuestionIndex + 1} of 15
          </p>
        </div>

        <div className="flex items-center gap-3 px-8 py-5 bg-card rounded-2xl border border-border shadow-card">
          <CoinIcon size={40} />
          <span className="text-3xl font-display font-bold text-gradient-gold">
            {formatJC(earnedAmount)} JC
          </span>
        </div>

        <Button variant="gold" size="lg" onClick={handleViewResult}>
          {earnedAmount > 0 ? 'Claim Reward' : 'View Results'}
        </Button>

        <Button variant="ghost" onClick={() => navigate('/game')}>
          Back to Home
        </Button>
      </div>
    );
  }

  // Show "already played" screen
  if (hasPlayedToday) {
    const { hours, minutes, seconds } = formatCountdown(countdown);
    
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
        <JackieIcon size={100} className="drop-shadow-lg opacity-60" />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold">Come Back Tomorrow!</h2>
          <p className="text-muted-foreground">You've already played today. One play per day!</p>
        </div>
        
        {/* Countdown Timer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Next game available in:</p>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-2xl font-display font-bold text-primary">{String(hours).padStart(2, '0')}</span>
              <span className="text-xs text-muted-foreground">hours</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-2xl font-display font-bold text-primary">{String(minutes).padStart(2, '0')}</span>
              <span className="text-xs text-muted-foreground">mins</span>
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex flex-col items-center px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-2xl font-display font-bold text-primary">{String(seconds).padStart(2, '0')}</span>
              <span className="text-xs text-muted-foreground">secs</span>
            </div>
          </div>
        </div>
        
        <Button variant="gold" size="lg" onClick={() => navigate('/game')}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowQuitDialog(true)}
        >
          <X className="w-5 h-5" />
        </Button>

        <Timer seconds={timeRemaining} />

        {/* Mobile: Sheet trigger for prize ladder */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs lg:hidden">
              <div className="flex items-center gap-1">
                <CoinIcon size={16} />
                <span className="font-bold">
                  {formatJC(prizeLadder[currentQuestionIndex]?.prizeAmount || 0)}
                </span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Prize Ladder</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <PrizeLadder
                ladder={prizeLadder}
                currentQuestion={currentQuestionIndex + 1}
                reachedQuestion={currentQuestionIndex}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop: Just show current prize */}
        <div className="hidden lg:flex items-center gap-1 text-sm">
          <CoinIcon size={16} />
          <span className="font-bold">
            {formatJC(prizeLadder[currentQuestionIndex]?.prizeAmount || 0)}
          </span>
        </div>
      </header>

      {/* Main Content with Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col px-4 py-6 gap-6 overflow-y-auto hide-scrollbar">
        {/* Lifelines - 1 by default, more via invites */}
          <Lifelines
            usedLifelines={usedLifelines}
            onUseLifeline={handleUseLifeline}
            disabled={showResult}
            availableLifelines={1}
          />

          {/* Question Card */}
          <QuestionCard
            question={currentQuestion}
            questionNumber={currentQuestionIndex + 1}
            onAnswer={handleAnswer}
            disabled={showResult}
            selectedChoice={selectedChoice}
            correctChoice={showResult && currentQuestion ? correctAnswersMap[currentQuestion.id] : undefined}
            showResult={showResult}
            hint={currentQuestion?.hint || ''}
            showHint={showHint}
            answerStats={currentQuestionStats || undefined}
            showStats={showStats}
          />

          {/* Next Question Button removed - now handled by claim dialog */}
        </main>

        {/* Right Side Panel - Prize Ladder (Desktop Only) */}
        <aside className="hidden lg:flex w-72 border-l border-border bg-card/30 backdrop-blur p-4 overflow-y-auto">
          <PrizeLadder
            ladder={prizeLadder}
            currentQuestion={currentQuestionIndex + 1}
            reachedQuestion={currentQuestionIndex}
          />
        </aside>
      </div>

      {/* Quit Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent" />
              Quit Game?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If you quit now, you'll keep your safe haven amount:
              <span className="block text-lg font-bold text-foreground mt-2">
                {formatJC(prizeLadder.filter(p => p.isSafeHaven && p.questionNumber <= currentQuestionIndex)[0]?.prizeAmount || 0)} JC
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Playing</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuit}>Quit & Take Winnings</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Claim or Continue Dialog - shown after every correct answer */}
      <AlertDialog open={showCheckpointDialog} onOpenChange={setShowCheckpointDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <JackieIcon size={80} className="animate-float" />
            </div>
            <AlertDialogTitle className="text-center text-2xl font-display">
              {isSafeHavenQuestion ? `🏆 ${t('game.safe_haven')}` : `✅ ${t('game.correct')}`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p>{t('game.question_complete', { number: currentQuestionIndex + 1 })}</p>
              <div className="flex items-center justify-center gap-2 py-4 px-6 bg-card rounded-2xl border border-border shadow-card mx-auto">
                <CoinIcon size={32} />
                <span className="text-2xl font-display font-bold text-gradient-gold">
                  {formatJC(earnedAmount)} JC
                </span>
              </div>
              {isSafeHavenQuestion ? (
                <p className="text-sm text-primary font-medium">
                  {t('game.safe_haven_note')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('game.claim_or_continue')}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleClaimNow}
            >
              <HandCoins className="w-5 h-5" />
              {t('game.claim')} {formatJC(earnedAmount)} JC
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleKeepGoing}
            >
              <Rocket className="w-5 h-5" />
              {t('game.keep_going')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Progress Dialog - shown after clicking Keep Going */}
      <AlertDialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <AlertDialogContent className="max-w-sm max-h-[90vh] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl font-display">
              {t('game.your_progress')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              {t('game.question_complete', { number: currentQuestionIndex + 1 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Prize Ladder Progress - full height to show all 15 levels */}
          <div className="relative bg-gradient-to-b from-primary/20 via-background to-background rounded-xl border border-border overflow-hidden">
            <div className="py-2 px-3">
              <div className="flex flex-col-reverse gap-0.5">
                {prizeLadder.map((item) => {
                  const isCompleted = item.questionNumber <= currentQuestionIndex + 1;
                  const isCurrent = item.questionNumber === currentQuestionIndex + 1;
                  const isSafeHaven = item.isSafeHaven;
                  const isNext = item.questionNumber === currentQuestionIndex + 2;
                  
                  return (
                    <div
                      key={item.questionNumber}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded-md transition-all text-sm',
                        isCurrent && 'bg-primary text-primary-foreground scale-[1.02] shadow-md ring-1 ring-primary/50',
                        isCompleted && !isCurrent && 'bg-success/20 text-success',
                        !isCompleted && !isNext && 'opacity-50',
                        isNext && 'bg-accent/20 border border-accent/30',
                        isSafeHaven && !isCurrent && isCompleted && 'bg-primary/20 text-primary'
                      )}
                    >
                      <span className={cn(
                        'w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold',
                        isCurrent ? 'bg-primary-foreground text-primary' : 
                        isCompleted ? 'bg-success text-success-foreground' :
                        isSafeHaven ? 'bg-primary/30 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        {item.questionNumber}
                      </span>
                      
                      <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        isCurrent ? 'bg-primary-foreground animate-pulse' :
                        isCompleted ? 'bg-success' :
                        isSafeHaven ? 'bg-primary/50' : 'bg-muted-foreground/30'
                      )} />
                      
                      <span className={cn(
                        'font-display font-bold flex-1 text-xs',
                        isCurrent ? 'text-primary-foreground' :
                        isCompleted ? 'text-success' :
                        isSafeHaven ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {formatJC(item.prizeAmount)} JC
                      </span>
                      
                      {isSafeHaven && (
                        <span className={cn(
                          'text-[8px] font-medium px-1 py-0.5 rounded',
                          isCurrent ? 'bg-primary-foreground/20' : 'bg-primary/20 text-primary'
                        )}>
                          SAFE
                        </span>
                      )}
                      
                      {isCurrent && (
                        <span className="text-[8px] font-bold bg-primary-foreground/20 px-1 py-0.5 rounded animate-pulse">
                          YOU
                        </span>
                      )}
                      
                      {isNext && (
                        <span className="text-[8px] font-medium text-accent">
                          NEXT →
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={handleContinueFromProgress}
            >
              <Rocket className="w-5 h-5" />
              Next Question
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Game;
