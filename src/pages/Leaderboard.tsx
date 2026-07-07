import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { JackieIcon, CoinIcon } from '@/components/icons/JackieIcon';
import { SolanaIcon } from '@/components/icons/SolanaIcon';
import { WorldIdIcon } from '@/components/icons/WorldIdIcon';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/contexts/GameContext';
import { ArrowLeft, Trophy, Crown, Medal, Loader2, Rocket, Users, Gamepad2, TrendingUp, TrendingDown, Minus, MessageCircle, ClipboardCopy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniKit } from '@worldcoin/minikit-js';
import { isInWorldApp } from '@/lib/minikit';
import { toast } from 'sonner';

// Airdrop date - August 1, 2026 at 6pm Vietnam time (UTC+7) = 11:00 UTC
const AIRDROP_DATE = new Date('2026-08-01T11:00:00Z');

function getTimeUntilAirdrop(): { days: number; hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const diff = Math.max(0, AIRDROP_DATE.getTime() - now.getTime());
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

interface LeaderboardEntry {
  user_id: string;
  total_claimed: number;
  rank: number;
  username?: string;
  profile_picture_url?: string;
  invited_count: number;
  games_played: number;
  rank_change: number | null;
  wallet_type?: string;
  solana_address?: string;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state, isAdmin } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userStats, setUserStats] = useState<{ invited: number; games: number }>({ invited: 0, games: 0 });
  const [userRankChange, setUserRankChange] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilAirdrop());
  const [visibleCount, setVisibleCount] = useState(50);
  const [walletFilter, setWalletFilter] = useState<'all' | 'solana' | 'world'>('all');

  const handleFilterChange = (filter: 'all' | 'solana' | 'world') => {
    setWalletFilter(filter);
    setVisibleCount(50);
  };

  // Countdown timer
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdate = 0;
    
    const updateCountdown = (timestamp: number) => {
      if (timestamp - lastUpdate >= 1000) {
        setCountdown(getTimeUntilAirdrop());
        lastUpdate = timestamp;
      }
      animationFrameId = requestAnimationFrame(updateCountdown);
    };
    
    animationFrameId = requestAnimationFrame(updateCountdown);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Fetch unified leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      // Get total player count
      const { count: playerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      setTotalPlayers(playerCount || 0);

      // Fetch all balances ordered by total_claimed (no limit to ensure filtered views show all players)
      const { data: balances, error: balanceError } = await supabase
        .from('user_balances')
        .select('user_id, total_claimed')
        .gt('total_claimed', 0)
        .order('total_claimed', { ascending: false })
        .limit(1000);

      if (balanceError) {
        console.error('Error fetching leaderboard:', balanceError);
        setLoading(false);
        return;
      }

      if (!balances || balances.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const userIds = balances.map(b => b.user_id);

      // Fetch user profiles in batches to avoid URL length limits with .in()
      const batchSize = 100;
      const allUsers: { id: string; username: string | null; profile_picture_url: string | null; wallet_type: string; solana_address: string | null }[] = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const { data: batchUsers } = await supabase
          .from('users')
          .select('id, username, profile_picture_url, wallet_type, solana_address')
          .in('id', batch);
        if (batchUsers) allUsers.push(...batchUsers);
      }
      const users = allUsers;

      const userMap = new Map((users || []).map((u: { id: string; username: string | null; profile_picture_url: string | null; wallet_type: string; solana_address: string | null }) => [u.id, u]));

      // Get additional data
      const today = new Date().toISOString().split('T')[0];
      const { data: lastSnapshotData } = await supabase
        .from('leaderboard_snapshots')
        .select('day_id')
        .lt('day_id', today)
        .order('day_id', { ascending: false })
        .limit(1);
      
      const lastSnapshotDate = lastSnapshotData?.[0]?.day_id || null;

      const [referralsResult, runsResult, previousSnapshotsResult] = await Promise.all([
        supabase
          .from('referrals')
          .select('inviter_user_id')
          .in('inviter_user_id', userIds)
          .eq('status', 'first_run_completed'),
        supabase
          .from('runs')
          .select('user_id')
          .in('user_id', userIds),
        lastSnapshotDate 
          ? supabase
              .from('leaderboard_snapshots')
              .select('user_id, rank')
              .eq('day_id', lastSnapshotDate)
              .in('user_id', userIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const referralCounts = new Map<string, number>();
      referralsResult.data?.forEach(r => {
        referralCounts.set(r.inviter_user_id, (referralCounts.get(r.inviter_user_id) || 0) + 1);
      });
      
      const runCounts = new Map<string, number>();
      runsResult.data?.forEach(r => {
        runCounts.set(r.user_id, (runCounts.get(r.user_id) || 0) + 1);
      });

      const previousRanks = new Map<string, number>();
      previousSnapshotsResult.data?.forEach(s => {
        previousRanks.set(s.user_id, s.rank);
      });

      const rankedEntries = balances.map((entry, index) => {
        const userProfile = userMap.get(entry.user_id);
        const currentRank = index + 1;
        const previousRank = previousRanks.get(entry.user_id);
        
        let rankChange: number | null = null;
        if (previousRank !== undefined) {
          rankChange = previousRank - currentRank;
        }
        
        return {
          ...entry,
          rank: currentRank,
          username: userProfile?.username || undefined,
          profile_picture_url: userProfile?.profile_picture_url || undefined,
          invited_count: referralCounts.get(entry.user_id) || 0,
          games_played: runCounts.get(entry.user_id) || 0,
          rank_change: rankChange,
          wallet_type: userProfile?.wallet_type || 'world_id',
          solana_address: userProfile?.solana_address || undefined,
        };
      });

      setEntries(rankedEntries);

      // Find current user's rank
      if (state.user?.id) {
        const userEntry = rankedEntries.find(e => e.user_id === state.user?.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
          setUserBalance(userEntry.total_claimed);
          setUserStats({ invited: userEntry.invited_count, games: userEntry.games_played });
          setUserRankChange(userEntry.rank_change);
        }
      }

      setLoading(false);
    };

    fetchLeaderboard();
  }, [state.user?.id]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankChangeIndicator = (rankChange: number | null) => {
    if (rankChange === null) {
      return <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">NEW</span>;
    }
    if (rankChange > 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-success">
          <TrendingUp className="w-3 h-3" />
          {rankChange}
        </span>
      );
    }
    if (rankChange < 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-destructive">
          <TrendingDown className="w-3 h-3" />
          {Math.abs(rankChange)}
        </span>
      );
    }
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/40';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/40';
      default:
        return 'bg-card border-border';
    }
  };

  const handleSendDM = async (username: string, rank: number) => {
    if (!username || !isInWorldApp()) return;

    const message = `Hey! I saw you're ranked #${rank} on Jackie Chain: Millionaire 🎮 Nice work!`;

    try {
      const { finalPayload } = await MiniKit.commandsAsync.chat({
        message,
        to: [username],
      });
      if (finalPayload?.status === 'success') return;
    } catch (error) {
      console.warn('[Leaderboard] MiniKit chat failed', error);
    }
    toast.error('Could not open World Chat. Please try again.');
  };

  const handleCopyLogs = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: { id: state.user?.id },
      entries: entries.length,
      totalPlayers,
      userRank,
    };
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      .then(() => toast.success('Debug logs copied!'));
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (walletType?: string) => {
    if (walletType === 'solana') {
      return <SolanaIcon size={14} />;
    }
    return <WorldIdIcon size={14} />;
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold">{t('leaderboard.title')}</h1>
          <span className="text-sm text-muted-foreground">
            ({totalPlayers.toLocaleString()} {t('leaderboard.players')})
          </span>
        </div>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={handleCopyLogs} title="Copy debug logs">
            <ClipboardCopy className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}
      </header>

      {/* Airdrop Countdown */}
      <div className="px-4 py-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-5">
          <div className="absolute top-2 right-2 opacity-20">
            <Rocket className="w-12 h-12 text-primary animate-float" />
          </div>
          
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <CoinIcon size={24} />
              <h2 className="text-lg font-display font-bold text-foreground">{t('leaderboard.airdropIn')}</h2>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[60px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('leaderboard.days')}</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[50px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('leaderboard.hrs')}</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[50px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('leaderboard.min')}</span>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center px-3 py-2 bg-background/50 rounded-lg min-w-[50px] backdrop-blur-sm">
                <span className="text-2xl font-display font-bold text-primary">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('leaderboard.sec')}</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {t('leaderboard.airdropDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* User's Rank Card */}
      {state.isVerified && userRank !== null && (
        <div className="px-4 py-4">
          <div className="p-4 bg-primary/10 rounded-xl border border-primary/30 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                {getRankIcon(userRank)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t('leaderboard.yourRank')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-display font-bold">#{userRank}</p>
                  {getRankChangeIndicator(userRankChange)}
                </div>
              </div>
            </div>
            <div className="flex justify-around pt-2 border-t border-primary/20">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{userStats.invited}</span>
                <span className="text-muted-foreground">{t('leaderboard.invited')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{userStats.games}</span>
                <span className="text-muted-foreground">{t('leaderboard.games')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <CoinIcon size={16} />
                <span className="font-medium">{userBalance.toLocaleString()}</span>
                <span className="text-muted-foreground">JC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP PLAYERS Header + Filter */}
      <div className="px-4 pb-2 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-foreground">TOP PLAYERS</h2>
          <span className="text-sm text-muted-foreground">
            ({totalPlayers.toLocaleString()})
          </span>
        </div>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => handleFilterChange('all')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              walletFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('solana')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              walletFilter === 'solana' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <SolanaIcon size={14} />
            Solana
          </button>
          <button
            onClick={() => handleFilterChange('world')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              walletFilter === 'world' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <WorldIdIcon size={14} />
            World
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      <main className="flex-1 px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <JackieIcon size={80} className="opacity-50 mb-4" />
            <p className="text-muted-foreground">{t('leaderboard.noClaims')}</p>
            <p className="text-sm text-muted-foreground">{t('leaderboard.beFirst')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const filtered = entries.filter(e => {
                if (walletFilter === 'all') return true;
                if (walletFilter === 'solana') return e.wallet_type === 'solana' || e.wallet_type === 'telegram';
                return e.wallet_type !== 'solana' && e.wallet_type !== 'telegram';
              });
              const visible = filtered.slice(0, visibleCount);
              return (<>
              {visible.map((entry, idx) => {
              const isCurrentUser = state.user?.id === entry.user_id;
              const isSolana = entry.wallet_type === 'solana' || entry.wallet_type === 'telegram';
              const displayRank = walletFilter === 'all' ? entry.rank : idx + 1;
              
              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    getRankStyle(displayRank),
                    isCurrentUser && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}
                >
                  {/* Rank */}
                  <div className="flex flex-col items-center justify-center w-10">
                    {getRankIcon(displayRank)}
                    {walletFilter === 'all' && getRankChangeIndicator(entry.rank_change)}
                  </div>

                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
                    {entry.profile_picture_url ? (
                      <img 
                        src={entry.profile_picture_url} 
                        alt={entry.username || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : isSolana ? (
                      <SolanaIcon size={24} />
                    ) : (
                      <span className="text-sm font-bold text-primary">
                        {entry.username ? entry.username.charAt(0).toUpperCase() : `#${entry.rank}`}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn(
                        'font-medium truncate',
                        isCurrentUser && 'text-primary'
                      )}>
                        {isCurrentUser ? 'You' : (
                          entry.username || 
                          (isSolana && entry.solana_address ? shortenAddress(entry.solana_address) : `Player ${displayRank}`)
                        )}
                      </p>
                      {getWalletIcon(entry.wallet_type)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {entry.invited_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gamepad2 className="w-3 h-3" />
                        {entry.games_played}
                      </span>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="flex items-center gap-2">
                    <CoinIcon size={20} />
                    <span className={cn(
                      'font-display font-bold',
                      entry.rank <= 3 ? 'text-lg' : 'text-base'
                    )}>
                      {entry.total_claimed.toLocaleString()}
                    </span>
                  </div>

                  {/* DM Button - only for World ID users */}
                  {!isCurrentUser && entry.username && !isSolana && isInWorldApp() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSendDM(entry.username!, entry.rank);
                      }}
                    >
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </Button>
                  )}
                </div>
              );
            })}
            
            {visibleCount < filtered.length && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setVisibleCount(prev => Math.min(prev + 50, filtered.length))}
              >
                Load More ({filtered.length - visibleCount} remaining)
              </Button>
            )}
              </>);
            })()}
          </div>
        )}
      </main>

      {/* Footer Stats */}
      <footer className="px-4 py-4 border-t border-border/50">
        <div className="flex justify-center gap-6 text-center">
          <div>
            <p className="text-2xl font-display font-bold text-primary">
              {entries.length}
            </p>
            <p className="text-xs text-muted-foreground">{t('leaderboard.players')}</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="text-2xl font-display font-bold text-gradient-gold">
              {entries.reduce((sum, e) => sum + e.total_claimed, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{t('leaderboard.totalClaimed')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Leaderboard;
