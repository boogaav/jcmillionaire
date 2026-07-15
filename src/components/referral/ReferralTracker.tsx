import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REFERRAL_STORAGE_KEY = 'jc_pending_referral';
const REFERRAL_SHOWN_KEY = 'jc_referral_popup_shown';

interface PendingReferral {
  code: string;
  referralId: string;
  inviterUserId: string;
  clickedAt: string;
}

export type ReferralStatus = 
  | 'new_referral'
  | 'already_tracked'
  | 'invalid_code'
  | 'already_played'
  | null;

/**
 * Component that handles referral tracking on app load
 * Uses useSearchParams internally to track ?ref= parameter
 */
export const ReferralTrackerInner: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>(null);

  // Show toast notification based on referral status (only for errors, success shown after verify)
  useEffect(() => {
    if (!referralStatus) return;

    const shownKey = sessionStorage.getItem(REFERRAL_SHOWN_KEY);
    if (shownKey) return;

    sessionStorage.setItem(REFERRAL_SHOWN_KEY, 'true');

    switch (referralStatus) {
      case 'new_referral':
        // Don't show toast here - the Verify page shows the bonus indicator instead
        // This prevents duplicate "referral bonus" messages
        break;
      case 'invalid_code':
        toast.error("Invalid referral code - this code doesn't exist", {
          duration: 4000,
        });
        break;
      case 'already_played':
        toast.error("Referral can't be used - you already have an account", {
          duration: 4000,
        });
        break;
    }
  }, [referralStatus]);

  // Track referral click when ?ref= parameter is present
  useEffect(() => {
    const refCode = searchParams.get('ref');
    
    if (!refCode || isProcessing) return;

    const trackReferralClick = async () => {
      setIsProcessing(true);
      const normalizedCode = refCode.trim().toLowerCase();
      
      // Helper to log failures
      const logFailure = async (reason: string) => {
        try {
          await supabase.from('referral_failures').insert({
            attempted_code: normalizedCode,
            failure_reason: reason,
            user_id: null,
          });
        } catch (e) {
          console.error('Failed to log referral failure:', e);
        }
      };
      
      try {
        // Check if user already has a stored user (already played)
        const storedUser = localStorage.getItem('jc_user');
        if (storedUser) {
          import.meta.env.DEV && console.log('User already has an account, referral cannot be applied');
          await logFailure('already_played');
          setReferralStatus('already_played');
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
          return;
        }

        // Check if we already have this referral tracked
        const existingReferral = localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (existingReferral) {
          try {
            const parsed = JSON.parse(existingReferral) as PendingReferral;
            if (parsed.code === normalizedCode) {
              import.meta.env.DEV && console.log('Referral already tracked:', normalizedCode);
              setReferralStatus('already_tracked');
              searchParams.delete('ref');
              setSearchParams(searchParams, { replace: true });
              setIsProcessing(false);
              return;
            }
          } catch (e) {
            localStorage.removeItem(REFERRAL_STORAGE_KEY);
          }
        }

        // Find the inviter by their referral code OR username
        let inviter = null;

        // First try referral code
        const { data: byCode, error: codeError } = await supabase
          .from('users')
          .select('id, referral_code, username')
          .ilike('referral_code', normalizedCode)
          .maybeSingle();

        if (codeError) {
          console.error('Error finding inviter by code:', codeError);
          await logFailure('lookup_error');
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
          return;
        }

        if (byCode) {
          inviter = byCode;
        } else {
          // Fall back to username lookup
          const { data: byUsername, error: usernameError } = await supabase
            .from('users')
            .select('id, referral_code, username')
            .ilike('username', normalizedCode)
            .maybeSingle();

          if (usernameError) {
            console.error('Error finding inviter by username:', usernameError);
            await logFailure('lookup_error');
            searchParams.delete('ref');
            setSearchParams(searchParams, { replace: true });
            setIsProcessing(false);
            return;
          }

          inviter = byUsername;
        }

        if (!inviter) {
          import.meta.env.DEV && console.log('Invalid referral code:', normalizedCode);
          await logFailure('invalid_code');
          setReferralStatus('invalid_code');
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
          return;
        }

        // Create a referral record with status='clicked'
        const { data: referral, error: insertError } = await supabase
          .from('referrals')
          .insert({
            invite_code: normalizedCode,
            inviter_user_id: inviter.id,
            invited_user_id: null,
            status: 'clicked',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating referral:', insertError);
          searchParams.delete('ref');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
          return;
        }

        // Store the pending referral for later attribution
        const pending: PendingReferral = {
          code: normalizedCode,
          referralId: referral.id,
          inviterUserId: inviter.id,
          clickedAt: new Date().toISOString(),
        };
        
        localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(pending));
        setReferralStatus('new_referral');
        
        import.meta.env.DEV && console.log('Referral click tracked:', { code: normalizedCode, referralId: referral.id });

        // Clear the URL param
        searchParams.delete('ref');
        setSearchParams(searchParams, { replace: true });
        
      } catch (error) {
        console.error('Error tracking referral:', error);
        searchParams.delete('ref');
        setSearchParams(searchParams, { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    trackReferralClick();
  }, [searchParams, setSearchParams, isProcessing]);

  return null;
};

/**
 * Wrapper component that safely renders the tracker
 */
export const ReferralTracker: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render after mount to avoid HMR issues
  if (!mounted) return null;

  return <ReferralTrackerInner />;
};
