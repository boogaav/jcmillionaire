import { supabase } from '@/integrations/supabase/client';
import type { TonConnectUI, ConnectedWallet } from '@tonconnect/ui-react';

async function fetchNonce(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-nonce');
  if (error || !data?.success) {
    throw new Error('Failed to generate nonce');
  }
  return data.nonce;
}

export interface TonAuthResult {
  success: boolean;
  user?: {
    id: string;
    wallet_address: string;
    verification_level: string;
    created_at: string;
  };
  error?: string;
}

/**
 * Authenticate with TON Connect (Tonkeeper, MyTonWallet, Telegram Wallet, etc.)
 * Requires a pre-initialized TonConnectUI instance from useTonConnectUI()
 */
export async function authenticateWithTon(
  tonConnectUI: TonConnectUI
): Promise<TonAuthResult> {
  try {
    const nonce = await fetchNonce();

    // Set ton_proof payload BEFORE opening modal
    tonConnectUI.setConnectRequestParameters({
      state: 'ready',
      value: { tonProof: nonce },
    });

    // If already connected, disconnect to force a fresh proof
    if (tonConnectUI.connected) {
      await tonConnectUI.disconnect();
    }

    const wallet = await new Promise<ConnectedWallet>((resolve, reject) => {
      const unsub = tonConnectUI.onStatusChange(
        (w) => {
          if (w) {
            unsub();
            resolve(w);
          }
        },
        (err) => {
          unsub();
          reject(err);
        }
      );
      tonConnectUI.openModal().catch((e) => {
        unsub();
        reject(e);
      });
    });

    const proofItem = wallet.connectItems?.tonProof;
    if (!proofItem || !('proof' in proofItem)) {
      return { success: false, error: 'Wallet did not return a proof' };
    }

    const { data, error } = await supabase.functions.invoke('verify-ton', {
      body: {
        address: wallet.account.address,
        network: wallet.account.chain,
        publicKey: wallet.account.publicKey,
        proof: proofItem.proof,
        nonce,
      },
    });

    if (error) {
      console.error('verify-ton error:', error);
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      return { success: false, error: data?.error || 'Verification failed' };
    }

    return { success: true, user: data.user };
  } catch (err) {
    console.error('TON auth error:', err);
    const msg = err instanceof Error ? err.message : 'TON authentication failed';
    return { success: false, error: msg };
  }
}
