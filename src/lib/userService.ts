import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

const USER_STORAGE_KEY = 'jc_user_id';

/**
 * Create or get a user by nullifier hash
 */
export async function createOrGetUser(
  nullifierHash: string,
  verificationLevel: 'device' | 'orb'
): Promise<{ user: User | null; error: string | null }> {
  try {
    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('nullifier_hash', nullifierHash)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return { user: null, error: fetchError.message };
    }

    if (existingUser) {
      import.meta.env.DEV && console.log('Found existing user:', existingUser.id);
      const user: User = {
        id: existingUser.id,
        nullifierHash: existingUser.nullifier_hash,
        verificationLevel: existingUser.verification_level,
        createdAt: existingUser.created_at,
        referralCode: existingUser.referral_code || undefined,
        walletType: existingUser.wallet_type || 'world_id',
      };
      
      // Store user ID in localStorage
      localStorage.setItem(USER_STORAGE_KEY, existingUser.id);
      
      return { user, error: null };
    }

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        nullifier_hash: nullifierHash,
        verification_level: verificationLevel,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return { user: null, error: insertError.message };
    }

    import.meta.env.DEV && console.log('Created new user:', newUser.id);
    const user: User = {
      id: newUser.id,
      nullifierHash: newUser.nullifier_hash,
      verificationLevel: newUser.verification_level,
      createdAt: newUser.created_at,
      referralCode: newUser.referral_code || undefined,
      walletType: newUser.wallet_type || 'world_id',
    };

    // Store user ID in localStorage
    localStorage.setItem(USER_STORAGE_KEY, newUser.id);

    return { user, error: null };
  } catch (err) {
    console.error('Error in createOrGetUser:', err);
    return { user: null, error: 'Failed to create or get user' };
  }
}

/**
 * Get user by ID from database
 */
export async function getUserById(userId: string): Promise<{ user: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user by ID:', error);
      return { user: null, error: error.message };
    }

    if (!data) {
      return { user: null, error: 'User not found' };
    }

    const user: User = {
      id: data.id,
      nullifierHash: data.nullifier_hash,
      verificationLevel: data.verification_level,
      createdAt: data.created_at,
      referralCode: data.referral_code || undefined,
      walletType: data.wallet_type || 'world_id',
    };

    return { user, error: null };
  } catch (err) {
    console.error('Error in getUserById:', err);
    return { user: null, error: 'Failed to get user' };
  }
}

/**
 * Get stored user ID from localStorage
 */
export function getStoredUserId(): string | null {
  return localStorage.getItem(USER_STORAGE_KEY);
}

/**
 * Clear stored user (logout)
 */
export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem('jc_wallet_address');
}

/**
 * Persist user data to localStorage
 */
export function persistUser(user: { id: string; verification_level?: string; nullifier_hash?: string }): void {
  localStorage.setItem(USER_STORAGE_KEY, user.id);
}

/**
 * Get stored wallet address
 */
export function getStoredWalletAddress(): string | null {
  return localStorage.getItem('jc_wallet_address');
}

/**
 * Load user from stored ID
 */
export async function loadStoredUser(): Promise<{ user: User | null; error: string | null }> {
  const storedId = getStoredUserId();
  if (!storedId) {
    return { user: null, error: null };
  }

  const result = await getUserById(storedId);
  
  // If user not found in database, clear the stale localStorage entry
  if (!result.user) {
    import.meta.env.DEV && console.log('Stored user not found in database, clearing localStorage');
    clearStoredUser();
  }
  
  return result;
}
