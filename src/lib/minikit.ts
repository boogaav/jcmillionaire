import { MiniKit } from '@worldcoin/minikit-js';
import { supabase } from '@/integrations/supabase/client';
import { APP_ID } from '@/lib/constants';

declare global {
  interface Window {
    WorldApp?: unknown;
    MiniKit?: unknown;
  }
}

export function hasWorldAppBridge(): boolean {
  return typeof window !== 'undefined' && Boolean(window.WorldApp);
}

function hasWorldAppUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /WorldApp|World App|Worldcoin/i.test(navigator.userAgent);
}

// Check if running inside World App. Do not rely only on MiniKit.isInstalled()
// because React renders once before MiniKitProvider's effect installs the SDK.
export function isInWorldApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasWorldAppBridge() || hasWorldAppUserAgent()) return true;
  if (!window.MiniKit) return false;

  try {
    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

export function ensureMiniKitInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.MiniKit) return true;
  if (!hasWorldAppBridge()) return false;

  try {
    const result = MiniKit.install(APP_ID);
    return result.success || (result as { errorCode?: string }).errorCode === 'already_installed';
  } catch (error) {
    console.warn('MiniKit install failed:', error);
    return false;
  }
}

// Get the user's wallet address from World App
export function getWalletAddress(): string | null {
  try {
    if (!ensureMiniKitInstalled()) return null;
    // MiniKit provides the wallet address after wallet auth
    return (MiniKit as any).walletAddress || null;
  } catch {
    return null;
  }
}

// Fetch a server-generated nonce for SIWE
export async function generateNonce(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-nonce');
  if (error || !data?.success) {
    throw new Error('Failed to generate nonce');
  }
  return data.nonce;
}

export interface WalletAuthResult {
  success: boolean;
  user?: {
    id: string;
    verification_level: string;
    wallet_address: string;
    created_at: string;
    username?: string;
    profile_picture_url?: string;
  };
  error?: string;
}

export interface WorldIdUserInfo {
  walletAddress: string;
  username?: string;
  profilePictureUrl?: string;
}

/**
 * Get user info by wallet address from World ID
 */
export async function getUserInfoByAddress(address: string): Promise<WorldIdUserInfo | null> {
  if (!ensureMiniKitInstalled()) return null;
  
  try {
    const userInfo = await MiniKit.getUserByAddress(address);
    return {
      walletAddress: userInfo?.walletAddress || address,
      username: userInfo?.username,
      profilePictureUrl: userInfo?.profilePictureUrl,
    };
  } catch (error) {
    import.meta.env.DEV && console.log('Could not get user info by address:', error);
    return null;
  }
}

/**
 * Get current user info from MiniKit
 */
export function getCurrentUserInfo(): WorldIdUserInfo | null {
  if (!ensureMiniKitInstalled()) return null;
  
  try {
    const user = (MiniKit as any).user;
    if (user) {
      return {
        walletAddress: user.walletAddress || '',
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Authenticate user with World App wallet
 */
export async function authenticateWithWallet(
  verificationLevel: 'device' | 'orb' = 'device'
): Promise<WalletAuthResult> {
  if (!ensureMiniKitInstalled()) {
    return { success: false, error: 'World App not detected' };
  }

  try {
    const nonce = await generateNonce();
    import.meta.env.DEV && console.log('Starting wallet auth with nonce:', nonce);

    // Request wallet authentication
    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
      expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      statement: 'Sign in to Jackie Chain: Millionaire to verify your identity and claim tokens.',
    });

    import.meta.env.DEV && console.log('Wallet auth response:', finalPayload);

    if (finalPayload.status === 'error') {
      return {
        success: false,
        error: (finalPayload as any).error_code || 'Wallet authentication failed',
      };
    }

    // Try to get World ID username and profile picture before backend call
    let username: string | undefined;
    let profilePictureUrl: string | undefined;
    
    try {
      // First try to get current user info
      const currentUser = getCurrentUserInfo();
      if (currentUser) {
        username = currentUser.username;
        profilePictureUrl = currentUser.profilePictureUrl;
      }
      
      // If not available, try to fetch by address
      if (!username && !profilePictureUrl && (finalPayload as any).address) {
        const userInfo = await getUserInfoByAddress((finalPayload as any).address);
        if (userInfo) {
          username = userInfo.username;
          profilePictureUrl = userInfo.profilePictureUrl;
        }
      }
    } catch (e) {
      import.meta.env.DEV && console.log('Could not fetch World ID user info before verification:', e);
    }

    // Verify with backend and pass World ID info
    const { data, error } = await supabase.functions.invoke('verify-wallet', {
      body: {
        payload: finalPayload,
        nonce,
        verification_level: verificationLevel,
        username,
        profile_picture_url: profilePictureUrl,
      },
    });

    if (error) {
      console.error('Backend verification failed:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Verification failed' };
    }
    
    import.meta.env.DEV && console.log('Wallet auth successful:', data.user);
    return {
      success: true,
      user: {
        ...data.user,
        username: data.user.username || username,
        profile_picture_url: data.user.profile_picture_url || profilePictureUrl,
      },
    };

  } catch (error) {
    console.error('Wallet auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet authentication failed',
    };
  }
}

export { MiniKit };
