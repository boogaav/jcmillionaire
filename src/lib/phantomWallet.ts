import { supabase } from '@/integrations/supabase/client';
import bs58 from 'bs58';

/**
 * Check if Phantom wallet is available
 */
export function isPhantomAvailable(): boolean {
  return typeof window !== 'undefined' && 
    window.solana?.isPhantom === true;
}

/**
 * Get Phantom wallet provider
 */
export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  return window.solana?.isPhantom ? window.solana : null;
}

/**
 * Fetch a server-generated nonce for signing
 */
async function fetchNonce(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-nonce');
  if (error || !data?.success) {
    throw new Error('Failed to generate nonce');
  }
  return data.nonce;
}

/**
 * Authenticate with Phantom wallet
 */
export async function authenticateWithPhantom(): Promise<{
  success: boolean;
  user?: {
    id: string;
    wallet_address: string;
    verification_level: string;
    created_at: string;
  };
  error?: string;
}> {
  try {
    const provider = getPhantomProvider();
    
    if (!provider) {
      return { success: false, error: 'Phantom wallet not found. Please install Phantom.' };
    }

    // Connect to Phantom
    import.meta.env.DEV && console.log('Connecting to Phantom wallet...');
    const resp = await provider.connect();
    const publicKey = resp.publicKey.toString();
    import.meta.env.DEV && console.log('Connected to Phantom, public key:', publicKey);

    // Fetch server-generated nonce
    const nonce = await fetchNonce();
    const message = `Sign in to Jackie Chain: Millionaire\n\nNonce: ${nonce}\nAddress: ${publicKey}`;
    const encodedMessage = new TextEncoder().encode(message);

    // Request signature
    import.meta.env.DEV && console.log('Requesting signature...');
    const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
    const signature = bs58.encode(signedMessage.signature);
    import.meta.env.DEV && console.log('Message signed successfully');

    // Verify with backend
    const { data, error } = await supabase.functions.invoke('verify-phantom', {
      body: {
        publicKey,
        signature,
        message,
        nonce,
      },
    });

    if (error) {
      console.error('Backend verification failed:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Verification failed' };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('Phantom authentication error:', error);
    
    if (error instanceof Error) {
      // Handle user rejection
      if (error.message.includes('User rejected')) {
        return { success: false, error: 'Connection rejected by user' };
      }
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'Failed to connect to Phantom wallet' };
  }
}

/**
 * Disconnect from Phantom wallet
 */
export async function disconnectPhantom(): Promise<void> {
  const provider = getPhantomProvider();
  if (provider) {
    await provider.disconnect();
  }
}

// Type definitions for Phantom
interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toString(): string } | null;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, encoding: string): Promise<{ signature: Uint8Array }>;
  on(event: string, callback: (args: unknown) => void): void;
  off(event: string, callback: (args: unknown) => void): void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Window {
    solana?: any;
  }
}
