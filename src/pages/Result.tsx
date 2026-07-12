import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { formatJC } from '@/lib/constants';
import { claimRewards } from '@/lib/rewardsService';
import { Share2, Trophy, Home, Loader2, CheckCircle, Wallet, AlertCircle, Coins, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';
import { shareGameResult, inviteFriends } from '@/lib/worldShare';
import { isInWorldApp } from '@/lib/minikit';
import { toast } from 'sonner';

type ClaimStep = 'idle' | 'claiming' | 'success' | 'error';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: gameState } = useGame();
  const { earnedAmount = 0, reachedQuestion = 1, isWinner = false, runId, autoClaim = false } = location.state || {};
  
  const [claimStep, setClaimStep] = useState<ClaimStep>(autoClaim && earnedAmount > 0 ? 'claiming' : 'idle');
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAutoClaimedRef = React.useRef(false);

  const performClaim = React.useCallback(async () => {
    if (earnedAmount <= 0) return;
    
    // Require proper authentication - no demo mode
    if (!runId || !gameState.user) {
      setErrorMessage('Authentication required to claim rewards');
      setClaimStep('error');
      return;
    }
    
    setClaimStep('claiming');
    setErrorMessage(null);

    try {
      // Real claim via backend
      const result = await claimRewards(runId, gameState.user.id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to claim rewards');
      }

      setTotalBalance(result.totalBalance || earnedAmount);
      setClaimStep('success');
    } catch (error) {
      console.error('Claim failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Claim failed');
      setClaimStep('error');
    }
  }, [earnedAmount, runId, gameState.user]);

  // Auto-claim on mount if autoClaim flag is set
  React.useEffect(() => {
    if (autoClaim && earnedAmount > 0 && !hasAutoClaimedRef.current) {
      hasAutoClaimedRef.current = true;
      performClaim();
    }
  }, [autoClaim, earnedAmount, performClaim]);

  const handleClaim = async () => {
    await performClaim();
  };

  const handleShare = async () => {
    const result = await shareGameResult({
      earnedAmount,
      reachedQuestion,
      isWinner,
    });
    
    if (result.success) {
      toast.success('Shared successfully!');
    } else if (result.error !== 'Share cancelled') {
      toast.error(result.error || 'Failed to share');
    }
  };

  const handleInviteFriends = async () => {
    const referralCode = gameState.user?.referralCode;
    const result = await inviteFriends(referralCode || undefined);
    
    if (result.success) {
      toast.success('Invite sent!');
    } else if (result.error !== 'Share cancelled') {
      toast.error(result.error || 'Failed to invite');
    }
  };

  const renderClaimSection = () => {
    if (earnedAmount <= 0) return null;

    switch (claimStep) {
      case 'idle':
        return (
          <div className="w-full max-w-sm space-y-4">
            <Button
              variant="gold"
              size="xl"
              className="w-full"
              onClick={handleClaim}
            >
              <Wallet className="w-5 h-5" />
              Claim {formatJC(earnedAmount)} JC
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Coins will be added to your balance instantly
            </p>
          </div>
        );

      case 'claiming':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center justify-center gap-3 py-4 bg-card rounded-xl border border-border">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Claiming your rewards...</span>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="p-4 bg-success/10 rounded-xl border border-success/30 space-y-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-6 h-6" />
                <span className="font-bold">Claimed Successfully!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatJC(earnedAmount)} JC has been added to your balance.
              </p>
            </div>
            
            {totalBalance !== null && (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-card rounded-xl border border-primary/30">
                <Coins className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Balance:</span>
                <span className="font-bold text-primary">{formatJC(totalBalance)} JC</span>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="w-full max-w-sm space-y-4">
            <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/30 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Claim Failed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                setClaimStep('idle');
                setErrorMessage(null);
              }}
            >
              Try Again
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-6">
      {/* Result Icon */}
      <div className={cn('relative animate-bounce-in')}>
        {isWinner ? (
          <div className="relative">
            <JackieIcon size={120} className="animate-float" />
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-glow animate-wiggle">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        ) : earnedAmount > 0 ? (
          <div className="w-28 h-28 rounded-full gradient-success flex items-center justify-center shadow-glow">
            <Trophy className="w-14 h-14 text-success-foreground" />
          </div>
        ) : (
          <JackieIcon size={100} />
        )}
      </div>

      {/* Result Text */}
      <div className="text-center space-y-2 animate-slide-up">
        <h1 className="text-3xl font-display font-bold">
          {isWinner ? '🎉 JACKPOT!' : earnedAmount > 0 ? 'Great Run!' : 'Better Luck Next Time!'}
        </h1>
        <p className="text-muted-foreground">
          You reached question {reachedQuestion} of 15
        </p>
      </div>

      {/* Earned Amount */}
      <div className={cn(
        'flex items-center gap-3 px-8 py-5 rounded-2xl border shadow-card animate-slide-up stagger-1',
        earnedAmount > 0 
          ? 'bg-card border-primary/30' 
          : 'bg-secondary border-border'
      )}>
        <CoinIcon size={40} className={earnedAmount > 0 ? 'animate-coin-flip' : ''} />
        <div className="text-left">
          <p className="text-sm text-muted-foreground">You earned</p>
          <p className="text-3xl font-display font-bold text-gradient-gold">
            {formatJC(earnedAmount)} JC
          </p>
        </div>
      </div>

      {/* Claim Section */}
      <div className="animate-slide-up stagger-2">
        {renderClaimSection()}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm animate-slide-up stagger-3">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5" />
            Share
          </Button>
          
          {isInWorldApp() && (
            <div className="flex-1 flex flex-col gap-1">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleInviteFriends}
              >
                <MessageCircle className="w-5 h-5" />
                Invite
              </Button>
              {gameState.user?.referralCode && (
                <span className="text-[10px] text-muted-foreground text-center">
                  Code: {gameState.user.referralCode}
                </span>
              )}
            </div>
          )}
        </div>
        
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/game')}
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default Result;
