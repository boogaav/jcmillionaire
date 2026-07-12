import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { JackieIcon } from '@/components/icons/JackieIcon';
import { WorldIdIcon, WorldIdBadge, PoweredByWorldId } from '@/components/icons/WorldIdIcon';
import { SolanaIcon } from '@/components/icons/SolanaIcon';
import { NotificationSubscription } from '@/components/NotificationSubscription';
import { UsernamePrompt } from '@/components/UsernamePrompt';
import { useGame } from '@/contexts/GameContext';
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Gift, Wallet, Send } from 'lucide-react';
import { persistUser } from '@/lib/userService';
import { isInWorldApp, authenticateWithWallet } from '@/lib/minikit';
import { isPhantomAvailable, authenticateWithPhantom } from '@/lib/phantomWallet';
import { linkPendingReferralToUser } from '@/hooks/useReferralTracking';
import { toast } from 'sonner';

const Verify: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useGame();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingWith, setVerifyingWith] = useState<'world' | 'phantom' | null>(null);
  const verificationLevel: 'device' | 'orb' = 'device';
  const [isSuccess, setIsSuccess] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [inWorldApp, setInWorldApp] = useState(false);
  const [phantomAvailable, setPhantomAvailable] = useState(false);
  const [isCheckingEnv, setIsCheckingEnv] = useState(true);

  // Check if there's a pending referral
  const hasPendingReferral = !!localStorage.getItem('jc_pending_referral');

  // Check environment on mount
  useEffect(() => {
    const checkEnv = setTimeout(() => {
      const isInstalled = isInWorldApp();
      const hasPhantom = isPhantomAvailable();
      console.log('World App check:', isInstalled, 'Phantom check:', hasPhantom);
      setInWorldApp(isInstalled);
      setPhantomAvailable(hasPhantom);
      setIsCheckingEnv(false);
    }, 500);
    
    return () => clearTimeout(checkEnv);
  }, []);

  const handleVerifySuccess = async (user: {
    id: string;
    verification_level: string;
    wallet_address: string;
    created_at: string;
    username?: string;
    profile_picture_url?: string;
  }, walletType: 'world_id' | 'solana') => {
    // Store the wallet address for later use
    localStorage.setItem('jc_wallet_address', user.wallet_address);
    localStorage.setItem('jc_wallet_type', walletType);
    
    // Create the user object matching our type
    const userObj = {
      id: user.id,
      verificationLevel: user.verification_level as 'device' | 'orb',
      nullifierHash: walletType === 'solana' ? `solana_${user.wallet_address}` : `wallet_${user.wallet_address}`,
      createdAt: user.created_at,
      username: user.username,
      profilePictureUrl: user.profile_picture_url,
    };
    
    // Persist user to localStorage
    persistUser(userObj);
    
    console.log('User verified:', userObj.id, 'wallet type:', walletType);
    
    // Link pending referral if exists
    const wasLinked = await linkPendingReferralToUser(userObj.id);
    if (wasLinked) {
      console.log('Referral linked successfully');
    }
    
    dispatch({ type: 'SET_USER', payload: userObj });
    setIsSuccess(true);
    
    // Check if user already has notifications enabled or skipped
    const notificationsEnabled = localStorage.getItem('jc_notifications_enabled');
    const notificationsSkipped = localStorage.getItem('jc_notifications_skipped');
    
    if (!notificationsEnabled && !notificationsSkipped) {
      setTimeout(() => {
        setShowNotificationPrompt(true);
      }, 1500);
    } else {
      setTimeout(() => {
        navigate('/game');
      }, 1500);
    }
  };

  const handleVerifyWorld = async () => {
    if (!inWorldApp) {
      toast.error('Please open this app in World App to verify');
      return;
    }

    setIsVerifying(true);
    setVerifyingWith('world');
    
    try {
      console.log('Authenticating with World App wallet...');
      const result = await authenticateWithWallet(verificationLevel);
      
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Wallet authentication failed');
      }
      
      await handleVerifySuccess({
        id: result.user.id,
        verification_level: result.user.verification_level,
        wallet_address: result.user.wallet_address,
        created_at: result.user.created_at,
        username: result.user.username,
        profile_picture_url: result.user.profile_picture_url,
      }, 'world_id');
      
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error(error instanceof Error ? error.message : 'Verification failed');
      setIsVerifying(false);
      setVerifyingWith(null);
    }
  };

  const handleVerifyPhantom = async () => {
    if (!phantomAvailable) {
      toast.error('Phantom wallet not found. Please install Phantom.');
      return;
    }

    setIsVerifying(true);
    setVerifyingWith('phantom');
    
    try {
      console.log('Authenticating with Phantom wallet...');
      const result = await authenticateWithPhantom();
      
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Phantom authentication failed');
      }
      
      // Store user data for after username prompt
      const userData = {
        id: result.user.id,
        verification_level: result.user.verification_level,
        wallet_address: result.user.wallet_address,
        created_at: result.user.created_at,
      };
      
      // Check if user already has a username (returning user)
      const { data: existingUser } = await (await import('@/integrations/supabase/client')).supabase
        .from('users')
        .select('username')
        .eq('id', result.user.id)
        .maybeSingle();
      
      if (existingUser?.username) {
        // User already has username, proceed directly
        await handleVerifySuccess({
          ...userData,
          username: existingUser.username,
        }, 'solana');
      } else {
        // New user without username, show prompt
        setPendingUserId(result.user.id);
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'solana');
        
        // Store user data temporarily
        localStorage.setItem('jc_pending_user_data', JSON.stringify(userData));
        
        setIsVerifying(false);
        setVerifyingWith(null);
        setShowUsernamePrompt(true);
      }
      
    } catch (error) {
      console.error('Phantom verification failed:', error);
      toast.error(error instanceof Error ? error.message : 'Phantom verification failed');
      setIsVerifying(false);
      setVerifyingWith(null);
    }
  };


  const handleUsernameComplete = async (username: string) => {
    setShowUsernamePrompt(false);
    
    const pendingData = localStorage.getItem('jc_pending_user_data');
    if (pendingData) {
      const userData = JSON.parse(pendingData);
      localStorage.removeItem('jc_pending_user_data');
      
      await handleVerifySuccess({
        ...userData,
        username,
      }, 'solana');
    }
  };

  const handleUsernameSkip = async () => {
    setShowUsernamePrompt(false);
    
    const pendingData = localStorage.getItem('jc_pending_user_data');
    if (pendingData) {
      const userData = JSON.parse(pendingData);
      localStorage.removeItem('jc_pending_user_data');
      
      await handleVerifySuccess(userData, 'solana');
    }
  };

  const handleNotificationComplete = () => {
    navigate('/game');
  };

  const handleNotificationSkip = () => {
    navigate('/game');
  };

  // Show username prompt dialog
  if (showUsernamePrompt && pendingUserId) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        <UsernamePrompt
          open={showUsernamePrompt}
          userId={pendingUserId}
          onComplete={handleUsernameComplete}
          onSkip={handleUsernameSkip}
        />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4">
        {showNotificationPrompt ? (
          <div className="w-full max-w-sm animate-fade-in">
            <NotificationSubscription
              onComplete={handleNotificationComplete}
              onSkip={handleNotificationSkip}
            />
          </div>
        ) : (
          <div className="text-center space-y-6 animate-bounce-in">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full gradient-success flex items-center justify-center shadow-glow">
                <CheckCircle className="w-12 h-12 text-success-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">Verified!</h2>
            {verifyingWith === 'world' && <WorldIdBadge />}
            {verifyingWith === 'phantom' && (
              <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#9945FF]/20 rounded-full">
                <SolanaIcon size={20} />
                <span className="text-sm font-medium text-[#9945FF]">Solana Wallet</span>
              </div>
            )}
            <p className="text-muted-foreground">Welcome to Jackie Chain: Millionaire</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/game')}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-6">
        {/* Hero */}
        <div className="text-center space-y-4 animate-fade-in">
          <JackieIcon size={80} className="mx-auto animate-float" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Login to Play
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Connect with Solana to play and earn $JC tokens.
          </p>
        </div>

        {/* Environment Check */}
        {isCheckingEnv && (
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-lg animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Checking wallets...</span>
          </div>
        )}

        {/* Pending Referral Indicator */}
        {hasPendingReferral && (inWorldApp || phantomAvailable) && (
          <div className="flex items-center gap-2 px-4 py-3 bg-success/10 border border-success/30 rounded-lg text-sm animate-slide-up">
            <Gift className="w-5 h-5 text-success" />
            <span className="text-foreground">
              <span className="font-medium text-success">Referral bonus ready!</span> Login to claim your extra play.
            </span>
          </div>
        )}

        {/* Login Options */}
        <div className="w-full max-w-sm space-y-3 animate-slide-up stagger-2">
          {/* Solana Login */}
          <Button
            variant="gold"
            size="xl"
            className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#8835EF] hover:to-[#0DE185] text-white border-0"
            onClick={handleVerifyPhantom}
            disabled={isVerifying || isCheckingEnv || !phantomAvailable}
          >
            {isVerifying && verifyingWith === 'phantom' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <SolanaIcon size={20} />
                Login with Solana
              </>
            )}
          </Button>

          {!phantomAvailable && !isCheckingEnv && !inWorldApp && (
            <a 
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-center text-[#AB9FF2] hover:underline"
            >
              Install Phantom Wallet →
            </a>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* World ID Button - Secondary */}
          <Button
            variant="outline"
            size="xl"
            className="w-full"
            onClick={handleVerifyWorld}
            disabled={isVerifying || isCheckingEnv || !inWorldApp}
          >
            {isVerifying && verifyingWith === 'world' ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <WorldIdIcon size={24} />
                Login with World ID
              </>
            )}
          </Button>
          
          {!inWorldApp && !isCheckingEnv && (
            <p className="text-xs text-muted-foreground text-center">
              World ID requires World App
            </p>
          )}
        </div>

      </main>
    </div>
  );
};

export default Verify;
