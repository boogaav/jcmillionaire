import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Button } from '@/components/ui/button';
import { SolanaIcon } from '@/components/icons/SolanaIcon';
import { WorldIdIcon } from '@/components/icons/WorldIdIcon';
import { TonIcon } from '@/components/icons/TonIcon';
import { EthereumIcon } from '@/components/icons/EthereumIcon';
import { UsernamePrompt } from '@/components/UsernamePrompt';
import { useGame } from '@/contexts/GameContext';
import { ChevronRight, Loader2, LogIn, X } from 'lucide-react';
import { isPhantomAvailable, authenticateWithPhantom } from '@/lib/phantomWallet';
import { isInWorldApp, authenticateWithWallet } from '@/lib/minikit';
import { authenticateWithTon } from '@/lib/tonWallet';
import { isEthereumAvailable, authenticateWithEthereum } from '@/lib/ethWallet';
import { persistUser } from '@/lib/userService';
import { linkPendingReferralToUser } from '@/hooks/useReferralTracking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LoginButtonsProps {
  compact?: boolean;
}

export const LoginButtons: React.FC<LoginButtonsProps> = ({ compact = false }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dispatch } = useGame();
  const [tonConnectUI] = useTonConnectUI();
  const [isOpen, setIsOpen] = useState(false);
  const [isSolanaLogging, setIsSolanaLogging] = useState(false);
  const [isWorldLogging, setIsWorldLogging] = useState(false);
  const [isTonLogging, setIsTonLogging] = useState(false);
  const [isEthLogging, setIsEthLogging] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingWalletType, setPendingWalletType] = useState<'solana' | 'ton' | 'eth'>('solana');

  const handleWorldLogin = async () => {
    setIsWorldLogging(true);
    try {
      const result = await authenticateWithWallet('device');
      if (!result.success || !result.user) {
        throw new Error(result.error || 'World ID authentication failed');
      }
      const user = result.user;
      localStorage.setItem('jc_wallet_address', user.wallet_address);
      localStorage.setItem('jc_wallet_type', 'world_id');
      const userObj = {
        id: user.id,
        verificationLevel: user.verification_level as 'device' | 'orb',
        nullifierHash: `wallet_${user.wallet_address}`,
        createdAt: user.created_at,
        username: user.username,
        profilePictureUrl: user.profile_picture_url,
      };
      persistUser(userObj);
      await linkPendingReferralToUser(userObj.id);
      dispatch({ type: 'SET_USER', payload: userObj });
      setIsOpen(false);
    } catch (error) {
      console.error('World login failed:', error);
      toast.error(error instanceof Error ? error.message : 'World ID login failed');
    } finally {
      setIsWorldLogging(false);
    }
  };

  const handleSolanaLogin = async () => {
    if (!isPhantomAvailable()) {
      toast.error('Phantom wallet not found. Please install Phantom.');
      return;
    }
    setIsSolanaLogging(true);
    try {
      const result = await authenticateWithPhantom();
      if (!result.success || !result.user) {
        throw new Error(result.error || 'Phantom authentication failed');
      }
      const userData = {
        id: result.user.id,
        verification_level: result.user.verification_level,
        wallet_address: result.user.wallet_address,
        created_at: result.user.created_at,
      };
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', result.user.id)
        .maybeSingle();

      const finishLogin = async (username?: string) => {
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'solana');
        const userObj = {
          id: userData.id,
          verificationLevel: userData.verification_level as 'device' | 'orb',
          nullifierHash: `solana_${userData.wallet_address}`,
          createdAt: userData.created_at,
          username,
        };
        persistUser(userObj);
        await linkPendingReferralToUser(userObj.id);
        dispatch({ type: 'SET_USER', payload: userObj });
        setIsOpen(false);
      };

      if (existingUser?.username) {
        await finishLogin(existingUser.username);
      } else {
        setPendingUserId(result.user.id);
        setPendingWalletType('solana');
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'solana');
        localStorage.setItem('jc_pending_user_data', JSON.stringify({ ...userData, walletType: 'solana' }));
        setIsSolanaLogging(false);
        setIsOpen(false);
        setShowUsernamePrompt(true);
      }
    } catch (error) {
      console.error('Solana login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsSolanaLogging(false);
    }
  };

  const handleUsernameComplete = async (username: string) => {
    setShowUsernamePrompt(false);
    setIsOpen(false);
    const pendingData = localStorage.getItem('jc_pending_user_data');
    if (pendingData) {
      const userData = JSON.parse(pendingData);
      const walletType: 'solana' | 'ton' | 'eth' = userData.walletType || 'solana';
      localStorage.removeItem('jc_pending_user_data');
      const userObj = {
        id: userData.id,
        verificationLevel: userData.verification_level as 'device' | 'orb',
        nullifierHash: `${walletType}_${userData.wallet_address}`,
        createdAt: userData.created_at,
        username,
      };
      persistUser(userObj);
      await linkPendingReferralToUser(userObj.id);
      dispatch({ type: 'SET_USER', payload: userObj });
    }
  };

  const handleUsernameSkip = async () => {
    setShowUsernamePrompt(false);
    setIsOpen(false);
    const pendingData = localStorage.getItem('jc_pending_user_data');
    if (pendingData) {
      const userData = JSON.parse(pendingData);
      const walletType: 'solana' | 'ton' | 'eth' = userData.walletType || 'solana';
      localStorage.removeItem('jc_pending_user_data');
      const userObj = {
        id: userData.id,
        verificationLevel: userData.verification_level as 'device' | 'orb',
        nullifierHash: `${walletType}_${userData.wallet_address}`,
        createdAt: userData.created_at,
      };
      persistUser(userObj);
      await linkPendingReferralToUser(userObj.id);
      dispatch({ type: 'SET_USER', payload: userObj });
    }
  };

  const handleTonLogin = async () => {
    setIsTonLogging(true);
    try {
      const result = await authenticateWithTon(tonConnectUI);
      if (!result.success || !result.user) {
        throw new Error(result.error || 'TON authentication failed');
      }
      const userData = {
        id: result.user.id,
        verification_level: result.user.verification_level,
        wallet_address: result.user.wallet_address,
        created_at: result.user.created_at,
      };
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', result.user.id)
        .maybeSingle();

      const finishLogin = async (username?: string) => {
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'ton');
        const userObj = {
          id: userData.id,
          verificationLevel: userData.verification_level as 'device' | 'orb',
          nullifierHash: `ton_${userData.wallet_address}`,
          createdAt: userData.created_at,
          username,
        };
        persistUser(userObj);
        await linkPendingReferralToUser(userObj.id);
        dispatch({ type: 'SET_USER', payload: userObj });
        setIsOpen(false);
      };

      if (existingUser?.username) {
        await finishLogin(existingUser.username);
      } else {
        setPendingUserId(result.user.id);
        setPendingWalletType('ton');
        localStorage.setItem('jc_wallet_address', userData.wallet_address);
        localStorage.setItem('jc_wallet_type', 'ton');
        localStorage.setItem('jc_pending_user_data', JSON.stringify({ ...userData, walletType: 'ton' }));
        setIsTonLogging(false);
        setIsOpen(false);
        setShowUsernamePrompt(true);
      }
    } catch (error) {
      console.error('TON login failed:', error);
      toast.error(error instanceof Error ? error.message : 'TON login failed');
    } finally {
      setIsTonLogging(false);
    }
  };

  return (
    <>
      {showUsernamePrompt && pendingUserId && (
        <UsernamePrompt
          open={showUsernamePrompt}
          userId={pendingUserId}
          onComplete={handleUsernameComplete}
          onSkip={handleUsernameSkip}
        />
      )}

      <Button
        variant="gold"
        size={compact ? "sm" : "default"}
        onClick={() => {
          if (isInWorldApp()) {
            handleWorldLogin();
          } else {
            setIsOpen(true);
          }
        }}
        disabled={isWorldLogging}
        className="gap-2"
      >
        {isWorldLogging ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            Login
          </>
        )}
      </Button>

      {isOpen && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-6 shadow-xl max-w-sm w-full animate-scale-in space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-foreground">Choose Login</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <Button
              variant="gold"
              size="xl"
              className="w-full bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-[#8835EF] hover:to-[#0DE185] text-white border-0"
              onClick={handleSolanaLogin}
              disabled={isSolanaLogging}
            >
              {isSolanaLogging ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <SolanaIcon size={20} />
                  Login with Solana
                </>
              )}
            </Button>

            <Button
              variant="gold"
              size="xl"
              className="w-full bg-[#0098EA] hover:bg-[#0086CC] text-white border-0"
              onClick={handleTonLogin}
              disabled={isTonLogging}
            >
              {isTonLogging ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <TonIcon size={20} />
                  Login with TON
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              variant="outline"
              size="xl"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                navigate('/verify');
              }}
            >
              <WorldIdIcon size={20} />
              {t('home.login_world_id')}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
