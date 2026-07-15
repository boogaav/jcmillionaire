import { supabase } from '@/integrations/supabase/client';

const REFERRAL_STORAGE_KEY = 'jc_pending_referral';

interface PendingReferral {
  code: string;
  referralId: string;
  inviterUserId: string;
  clickedAt: string;
}

/**
 * Get pending referral from localStorage
 */
export function getPendingReferral(): PendingReferral | null {
  const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch (e) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return null;
  }
}

/**
 * Clear pending referral from storage
 */
export function clearPendingReferral(): void {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

/**
 * Link pending referral to user on verification
 */
export async function linkPendingReferralToUser(userId: string): Promise<boolean> {
  const pending = getPendingReferral();
  if (!pending) return false;

  try {
    // Don't allow self-referral
    if (pending.inviterUserId === userId) {
      import.meta.env.DEV && console.log('Self-referral prevented');
      clearPendingReferral();
      return false;
    }

    // Check if user already has a referral
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('invited_user_id', userId)
      .maybeSingle();

    if (existingReferral) {
      import.meta.env.DEV && console.log('User already has a referral');
      clearPendingReferral();
      return false;
    }

    // Update the referral with the user ID and status
    const { error } = await supabase
      .from('referrals')
      .update({
        invited_user_id: userId,
        status: 'verified',
      })
      .eq('id', pending.referralId);

    if (error) {
      console.error('Error linking referral to user:', error);
      return false;
    }

    import.meta.env.DEV && console.log('Referral linked to user:', { referralId: pending.referralId, userId });
    return true;
    
  } catch (error) {
    console.error('Error in linkPendingReferralToUser:', error);
    return false;
  }
}

// Legacy export for backwards compatibility
export function useReferralTracking() {
  return {
    pendingReferral: getPendingReferral(),
    clearPendingReferral,
    getPendingReferral,
    linkReferralToUser: linkPendingReferralToUser,
    isProcessing: false,
    referralStatus: null,
  };
}
