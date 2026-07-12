import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { WorldIdBadge } from '@/components/icons/WorldIdIcon';
import { AttemptsDisplay } from '@/components/game/AttemptsDisplay';
import { ShareModal } from '@/components/referral/ShareModal';
import { useGame } from '@/contexts/GameContext';
import { formatJC, getWorldAppLink } from '@/lib/constants';
import { ArrowLeft, Copy, Share2, Trophy, History, Users, CheckCircle, Loader2, Flame, Shield, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns/format';
import { getCurrentUserInfo } from '@/lib/minikit';
import { MiniKit } from '@worldcoin/minikit-js';
import { ReferralDashboard } from '@/components/referral/ReferralDashboard';
import { clearStoredUser } from '@/lib/userService';

interface RunHistoryItem {
  id: string;
  day_id: string;
  reached_q: number;
  earned_amount: number;
  status: string;
  started_at: string;
  claimed: boolean;
}

interface ReferralItem {
  id: string;
  status: string;
  created_at: string;
}

interface UserStats {
  totalRuns: number;
  bestQuestion: number;
  bestWin: number;
  totalEarned: number;
  currentStreak: number;
  longestStreak: number;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { state, dispatch, fetchAttempts, isAdmin } = useGame();
  const { user, attempts, isVerified } = state;
  
  const defaultTab = searchParams.get('tab') || 'stats';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(true);
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [userProfile, setUserProfile] = useState<{ username?: string; profilePictureUrl?: string; referralCode?: string }>({});
  const [userStats, setUserStats] = useState<UserStats>({
    totalRuns: 0,
    bestQuestion: 0,
    bestWin: 0,
    totalEarned: 0,
    currentStreak: 0,
    longestStreak: 0,
  });
  
  // Invite code from backend (fallback to user id prefix)
  const inviteCode = (userProfile.referralCode || user?.id.slice(0, 8) || 'jackie').toLowerCase();
  const inviteLink = getWorldAppLink(`/?ref=${inviteCode}`);

  // Fetch World ID username
  useEffect(() => {
    const fetchWorldIdProfile = async () => {
      if (!user?.id) return;

      // First check if username is stored in database
      const { data: userData } = await supabase
        .from('users')
        .select('username, profile_picture_url, referral_code')
        .eq('id', user.id)
        .maybeSingle();

      if (userData?.username) {
        setUserProfile({
          username: userData.username,
          profilePictureUrl: userData.profile_picture_url || undefined,
          referralCode: userData.referral_code || undefined,
        });
        return;
      }

      // If not in database, try to get from MiniKit
      if (MiniKit.isInstalled()) {
        try {
          const currentUser = getCurrentUserInfo();
          if (currentUser?.username) {
            setUserProfile({
              username: currentUser.username,
              profilePictureUrl: currentUser.profilePictureUrl,
            });
            
            // Save to database for future
            await supabase
              .from('users')
              .update({
                username: currentUser.username,
                profile_picture_url: currentUser.profilePictureUrl,
              })
              .eq('id', user.id);
          }
        } catch (e) {
          console.log('Could not fetch World ID profile:', e);
        }
      }
    };

    fetchWorldIdProfile();
  }, [user?.id]);

  // Fetch all profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Fetch runs with claim status
        const { data: runsData, error: runsError } = await supabase
          .from('runs')
          .select('id, day_id, reached_q, earned_amount, status, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(50);

        if (runsError) {
          console.error('Error fetching runs:', runsError);
        }

        // Fetch claims to check which runs were claimed
        const { data: claimsData, error: claimsError } = await supabase
          .from('claims')
          .select('run_id, status')
          .eq('user_id', user.id);

        if (claimsError) {
          console.error('Error fetching claims:', claimsError);
        }

        // Map claims to runs
        const claimedRunIds = new Set(
          claimsData?.filter(c => c.status === 'authorized' || c.status === 'confirmed')
            .map(c => c.run_id) || []
        );

        const runsWithClaims: RunHistoryItem[] = (runsData || []).map(run => ({
          ...run,
          claimed: claimedRunIds.has(run.id),
        }));

        setRunHistory(runsWithClaims);

        // Fetch user streaks for stats
        const { data: streakData, error: streakError } = await supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (streakError) {
          console.error('Error fetching streaks:', streakError);
        }

        // Fetch user balance
        const { data: balanceData, error: balanceError } = await supabase
          .from('user_balances')
          .select('total_claimed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (balanceError) {
          console.error('Error fetching balance:', balanceError);
        }

        // Fetch referrals
        const { data: referralsData, error: referralsError } = await supabase
          .from('referrals')
          .select('id, status, created_at')
          .eq('inviter_user_id', user.id)
          .order('created_at', { ascending: false });

        if (referralsError) {
          console.error('Error fetching referrals:', referralsError);
        }

        setReferrals(referralsData || []);

        // Calculate stats
        const completedRuns = runsData?.filter(r => r.status === 'completed') || [];
        const bestQuestion = Math.max(0, ...completedRuns.map(r => r.reached_q));
        const bestWin = Math.max(0, ...completedRuns.map(r => r.earned_amount));
        
        setUserStats({
          totalRuns: streakData?.total_runs || completedRuns.length,
          bestQuestion,
          bestWin,
          totalEarned: balanceData?.total_claimed || 0,
          currentStreak: streakData?.current_streak || 0,
          longestStreak: streakData?.longest_streak || 0,
        });

        // Refresh attempts
        fetchAttempts();

      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user?.id, fetchAttempts]);

  const [codeCopied, setCodeCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleLogout = () => {
    clearStoredUser();
    dispatch({ type: 'SET_USER', payload: null });
    toast.success('Logged out successfully');
    navigate('/verify');
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteLink);
    setCodeCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const completedReferrals = referrals.filter(r => r.status === 'first_run_completed').length;

  if (!isVerified) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 pb-24 gap-6">
        <JackieIcon size={80} className="animate-float" />
        <h2 className="text-xl font-display font-bold">Verify to View Profile</h2>
        <Button variant="gold" onClick={() => navigate('/verify')}>
          Get Verified
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex flex-col items-center justify-center px-4 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col pb-24">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-border bg-card/50 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/game')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-display font-bold">{t('profile.title')}</h1>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/analytics')}
                className="text-primary"
              >
                <BarChart3 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
                className="text-primary"
              >
                <Shield className="w-5 h-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-destructive"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile Header */}
      <div className="px-4 py-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          {userProfile.profilePictureUrl ? (
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <img 
                src={userProfile.profilePictureUrl} 
                alt={userProfile.username || 'Profile'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <JackieIcon size={60} />
          )}
          <div className="flex-1">
            <p className="text-lg font-bold">
              {userProfile.username || 'Player'}
            </p>
            <WorldIdBadge className="mt-1" />
            {userStats.currentStreak > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Flame className="w-4 h-4 text-accent" />
                <span className="text-xs text-accent font-medium">{t('profile.day_streak', { count: userStats.currentStreak })}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('profile.total_earned')}</p>
            <div className="flex items-center gap-1 justify-end">
              <CoinIcon size={20} />
              <span className="text-lg font-bold">{formatJC(userStats.totalEarned)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="px-4 py-4">
        <AttemptsDisplay attempts={attempts} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="stats" className="gap-1">
            <Trophy className="w-4 h-4" />
            {t('profile.stats')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="w-4 h-4" />
            {t('profile.history')}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-1">
            <Users className="w-4 h-4" />
            {t('profile.referrals')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="flex-1 px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-primary">{userStats.totalRuns}</p>
              <p className="text-sm text-muted-foreground">{t('profile.total_runs')}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-primary">{userStats.bestQuestion}</p>
              <p className="text-sm text-muted-foreground">{t('profile.best_question')}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-success">{completedReferrals}</p>
              <p className="text-sm text-muted-foreground">{t('profile.referrals')}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="flex items-center gap-1">
                <CoinIcon size={24} />
                <p className="text-2xl font-display font-bold">{formatJC(userStats.bestWin)}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.best_win')}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="flex items-center gap-1">
                <Flame className="w-6 h-6 text-accent" />
                <p className="text-2xl font-display font-bold">{userStats.currentStreak}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t('profile.current_streak')}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <p className="text-3xl font-display font-bold text-accent">{userStats.longestStreak}</p>
              <p className="text-sm text-muted-foreground">{t('profile.longest_streak')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1 px-4 py-4 space-y-3 overflow-y-auto hide-scrollbar">
          {runHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No games played yet.</p>
              <Button variant="gold" className="mt-4" onClick={() => navigate('/game')}>
                Start Playing
              </Button>
            </div>
          ) : (
            runHistory.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between bg-card rounded-xl p-4 border border-border shadow-soft"
              >
                <div>
                  <p className="font-medium">Question {run.reached_q}/15</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(run.started_at), 'MMM d, yyyy')}
                  </p>
                  <p className={cn(
                    'text-[10px] mt-0.5',
                    run.status === 'completed' ? 'text-success' : 
                    run.status === 'abandoned' ? 'text-muted-foreground' : 'text-accent'
                  )}>
                    {run.status === 'completed' ? 'Completed' : 
                     run.status === 'abandoned' ? 'Quit Early' : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {run.earned_amount > 0 && (
                    <div className="flex items-center gap-1">
                      <CoinIcon size={16} />
                      <span className="font-bold">{formatJC(run.earned_amount)}</span>
                    </div>
                  )}
                  {run.claimed && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="referrals" className="flex-1 px-4 py-4 space-y-4 overflow-y-auto hide-scrollbar">
          {/* Invite Card */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card space-y-4">
            <div className="text-center">
              <h3 className="font-display font-bold text-lg">Invite Friends</h3>
              <p className="text-sm text-muted-foreground">
                Get +1 play when they complete their first run!
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Your referral code</p>
              <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
                <span className="flex-1 text-center text-lg font-mono font-bold tracking-widest">
                  {inviteCode.toUpperCase()}
                </span>
              </div>
              <Button 
                variant={codeCopied ? "default" : "outline"} 
                className="w-full gap-2" 
                onClick={copyInviteCode}
              >
                {codeCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <Button variant="gold" className="w-full" onClick={() => setIsShareModalOpen(true)}>
              <Share2 className="w-5 h-5" />
              Share Invite Link
            </Button>
          </div>

          {/* Share Modal */}
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            referralCode={inviteCode}
            username={userProfile.username}
          />

          {/* Real-time Referral Dashboard */}
          {user?.id && <ReferralDashboard userId={user.id} inviteCode={inviteCode} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
