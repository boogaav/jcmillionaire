import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns/format';
import { Users, CheckCircle, Clock, MousePointer, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PendingNudges } from './PendingNudges';

interface ReferralItem {
  id: string;
  status: 'clicked' | 'verified' | 'first_run_completed';
  created_at: string;
  invited_user_id: string | null;
  invite_code: string;
  username?: string;
}

interface ReferralDashboardProps {
  userId: string;
  inviteCode: string;
}

const statusConfig = {
  clicked: {
    label: 'Clicked',
    icon: MousePointer,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeVariant: 'secondary' as const,
    description: 'Link clicked, not verified yet',
  },
  verified: {
    label: 'Verified',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/20',
    badgeVariant: 'outline' as const,
    description: 'Verified, awaiting first run',
  },
  first_run_completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/20',
    badgeVariant: 'default' as const,
    description: 'First run completed! +1 play earned',
  },
};

export const ReferralDashboard: React.FC<ReferralDashboardProps> = ({ userId, inviteCode }) => {
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch referrals
  const fetchReferrals = async () => {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, status, created_at, invited_user_id, invite_code')
      .eq('inviter_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return;
    }

    // Fetch usernames for invited users
    const referralsWithUsernames: ReferralItem[] = await Promise.all(
      (data || []).map(async (ref) => {
        if (ref.invited_user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', ref.invited_user_id)
            .maybeSingle();
          
          return {
            ...ref,
            status: ref.status as ReferralItem['status'],
            username: userData?.username || undefined,
          };
        }
        return {
          ...ref,
          status: ref.status as ReferralItem['status'],
        };
      })
    );

    setReferrals(referralsWithUsernames);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchReferrals();
  }, [userId]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('referrals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
          filter: `inviter_user_id=eq.${userId}`,
        },
        (payload) => {
          import.meta.env.DEV && console.log('Referral update:', payload);
          // Refetch to get updated data with usernames
          fetchReferrals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Stats
  const stats = {
    total: referrals.length,
    clicked: referrals.filter(r => r.status === 'clicked').length,
    verified: referrals.filter(r => r.status === 'verified').length,
    completed: referrals.filter(r => r.status === 'first_run_completed').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Nudges - Show first if there are pending referrals */}
      <PendingNudges 
        referrals={referrals.filter(r => r.status === 'clicked' || r.status === 'verified')} 
        inviteCode={inviteCode} 
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <MousePointer className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xl font-bold">{stats.clicked}</p>
          <p className="text-[10px] text-muted-foreground">Clicked</p>
        </div>
        <div className="bg-warning/10 rounded-lg p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-warning" />
          <p className="text-xl font-bold text-warning">{stats.verified}</p>
          <p className="text-[10px] text-muted-foreground">Verified</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center">
          <CheckCircle className="w-4 h-4 mx-auto mb-1 text-success" />
          <p className="text-xl font-bold text-success">{stats.completed}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span>Live updates</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs"
          onClick={fetchReferrals}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Referral List */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">
          Referral History ({referrals.length})
        </h4>
        
        {referrals.length === 0 ? (
          <div className="text-center py-6 bg-card rounded-xl border border-border">
            <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No referrals yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Share your invite link to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref) => {
              const config = statusConfig[ref.status];
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={ref.id}
                  className={cn(
                    'flex items-center justify-between bg-card rounded-xl p-4 border border-border',
                    'transition-all duration-300 hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      config.bgColor
                    )}>
                      <StatusIcon className={cn('w-5 h-5', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {ref.username || 'Anonymous User'}
                        </p>
                        <Badge 
                          variant={config.badgeVariant}
                          className="text-[10px] h-5"
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className={cn('text-xs', config.color)}>
                        {config.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(ref.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  {ref.status === 'first_run_completed' && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-success">+1</span>
                      <p className="text-[10px] text-muted-foreground">play</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
