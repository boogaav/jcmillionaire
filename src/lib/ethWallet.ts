import { supabase } from '@/integrations/supabase/client';

/**
 * Check if an EIP-1193 Ethereum provider is available (MetaMask, Rabby, Coinbase Wallet, etc.)
 */
export function isEthereumAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ethereum;
}

function getEthereumProvider(): any | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  // Prefer MetaMask if multiple providers are injected
  if (Array.isArray(eth.providers) && eth.providers.length) {
    return eth.providers.find((p: any) => p.isMetaMask) || eth.providers[0];
  }
  return eth;
}

async function fetchNonce(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-nonce');
  if (error || !data?.success) throw new Error('Failed to generate nonce');
  return data.nonce as string;
}

export async function authenticateWithEthereum(): Promise<{
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
    const provider = getEthereumProvider();
    if (!provider) {
      return { success: false, error: 'Ethereum wallet not found. Please install MetaMask.' };
    }

    const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts.length) {
      return { success: false, error: 'No Ethereum account available' };
    }
    const address = accounts[0].toLowerCase();

    const nonce = await fetchNonce();
    const message = `Sign in to Jackie Chain: Millionaire\n\nNonce: ${nonce}\nAddress: ${address}`;

    const signature: string = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });

    const { data, error } = await supabase.functions.invoke('verify-ethereum', {
      body: { address, signature, message, nonce },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error || 'Verification failed' };

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Ethereum authentication error:', error);
    if (error instanceof Error) {
      if (error.message.includes('User rejected') || (error as any).code === 4001) {
        return { success: false, error: 'Connection rejected by user' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to connect to Ethereum wallet' };
  }
}
