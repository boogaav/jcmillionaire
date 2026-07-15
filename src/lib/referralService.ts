import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique referral code for a user
 * Uses the user's ID as the base to ensure uniqueness
 */
export function generateReferralCode(userId: string): string {
  // Use first 8 characters of user ID as referral code (uppercase for display)
  return userId.slice(0, 8).toUpperCase();
}

/**
 * Check if a user has already redeemed a referral code
 */
export async function hasAlreadyRedeemedCode(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('referrals')
    .select('id')
    .eq('invited_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking redeemed status:', error);
    return false;
  }

  return !!data;
}

/**
 * Redeem a referral code manually entered by the user
 * Grants +1 extra life to BOTH the inviter and the invited user
 */
export async function redeemReferralCode(
  code: string,
  invitedUserId: string
): Promise<{ success: boolean; error: string | null }> {
  const normalizedCode = code.trim().toLowerCase();

  // Helper to log failures
  const logFailure = async (reason: string) => {
    try {
      await supabase.from('referral_failures').insert({
        attempted_code: normalizedCode,
        failure_reason: reason,
        user_id: invitedUserId,
      });
    } catch (e) {
      console.error('Failed to log referral failure:', e);
    }
  };

  try {
    // Find the inviter by their referral code OR username
    let inviter = null;
    
    // First try referral code
    const { data: byCode, error: codeError } = await supabase
      .from('users')
      .select('id, referral_code')
      .ilike('referral_code', normalizedCode)
      .maybeSingle();

    if (codeError) {
      console.error('Error finding inviter by code:', codeError);
      await logFailure('lookup_error');
      return { success: false, error: 'Failed to verify code' };
    }

    if (byCode) {
      inviter = byCode;
    } else {
      // Fall back to username lookup
      const { data: byUsername, error: usernameError } = await supabase
        .from('users')
        .select('id, referral_code')
        .ilike('username', normalizedCode)
        .maybeSingle();

      if (usernameError) {
        console.error('Error finding inviter by username:', usernameError);
        await logFailure('lookup_error');
        return { success: false, error: 'Failed to verify code' };
      }

      inviter = byUsername;
    }

    if (!inviter) {
      await logFailure('invalid_code');
      return { success: false, error: 'Invalid referral code' };
    }

    // Don't allow self-referral
    if (inviter.id === invitedUserId) {
      await logFailure('self_referral');
      return { success: false, error: 'Cannot use your own code' };
    }

    // Check if user has already redeemed a code
    const alreadyRedeemed = await hasAlreadyRedeemedCode(invitedUserId);
    if (alreadyRedeemed) {
      await logFailure('already_redeemed');
      return { success: false, error: 'Already redeemed a code' };
    }

    // Create the referral record
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        invite_code: normalizedCode,
        inviter_user_id: inviter.id,
        invited_user_id: invitedUserId,
        status: 'first_run_completed', // Mark as completed immediately since they're already verified
      });

    if (insertError) {
      console.error('Error creating referral:', insertError);
      if (insertError.code === '23505') {
        await logFailure('duplicate_insert');
        return { success: false, error: 'Already redeemed a code' };
      }
      await logFailure('insert_error');
      return { success: false, error: 'Failed to redeem code' };
    }

    // Note: The database trigger 'grant_referral_attempt' automatically grants:
    // - +1 to invited user when status becomes 'first_run_completed'
    // - +1 to inviter when status becomes 'first_run_completed'
    // No need to call grantExtraLife here as it would cause double-granting

    import.meta.env.DEV && console.log('Referral redeemed successfully:', { inviterId: inviter.id, invitedUserId });
    return { success: true, error: null };
  } catch (err) {
    console.error('Error in redeemReferralCode:', err);
    await logFailure('unexpected_error');
    return { success: false, error: 'Failed to redeem code' };
  }
}

/**
 * Grant an extra life (attempt) to a user
 */
async function grantExtraLife(userId: string, dayId: string): Promise<void> {
  try {
    // Check if user has an attempts record for today
    const { data: existingAttempts, error: fetchError } = await supabase
      .from('attempts')
      .select('id, cap, earned_from_referrals')
      .eq('user_id', userId)
      .eq('day_id', dayId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching attempts:', fetchError);
      return;
    }

    if (existingAttempts) {
      // Update existing record - increase cap and earned_from_referrals
      const { error: updateError } = await supabase
        .from('attempts')
        .update({
          cap: existingAttempts.cap + 1,
          earned_from_referrals: existingAttempts.earned_from_referrals + 1,
        })
        .eq('id', existingAttempts.id);

      if (updateError) {
        console.error('Error updating attempts:', updateError);
      }
    } else {
      // Create new record with extra life
      const { error: insertError } = await supabase
        .from('attempts')
        .insert({
          user_id: userId,
          day_id: dayId,
          cap: 2, // 1 base + 1 bonus
          used: 0,
          earned_from_referrals: 1,
        });

      if (insertError) {
        console.error('Error inserting attempts:', insertError);
      }
    }

    import.meta.env.DEV && console.log('Extra life granted to:', userId);
  } catch (err) {
    console.error('Error granting extra life:', err);
  }
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string): Promise<{
  totalInvited: number;
  completedRuns: number;
  pendingReferrals: number;
  error: string | null;
}> {
  try {
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('status')
      .eq('inviter_user_id', userId);

    if (error) {
      return { totalInvited: 0, completedRuns: 0, pendingReferrals: 0, error: error.message };
    }

    const totalInvited = referrals?.length || 0;
    const completedRuns = referrals?.filter(r => r.status === 'first_run_completed').length || 0;
    const pendingReferrals = referrals?.filter(r => r.status === 'verified').length || 0;

    return { totalInvited, completedRuns, pendingReferrals, error: null };
  } catch (err) {
    console.error('Error getting referral stats:', err);
    return { totalInvited: 0, completedRuns: 0, pendingReferrals: 0, error: 'Failed to get stats' };
  }
}
