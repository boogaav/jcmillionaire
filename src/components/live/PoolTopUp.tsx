// Solana SOL top-up UI for a live show's prize pool.
// - Host sets a Solana wallet address (any valid pubkey) as the treasury for their show.
// - Anyone with Phantom can send SOL to that address; we record the tx signature
//   in `live_pool_topups` and display a running total.
// - Payouts are handled off-chain by the host for now.
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Coins, Wallet, ExternalLink, Plus, Loader2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import { getPhantomProvider, isPhantomAvailable } from '@/lib/phantomWallet';

interface TopUpRow {
  id: string;
  quiz_set_id: string;
  from_address: string;
  to_address: string;
  tx_signature: string;
  amount_sol: number;
  amount_lamports: number;
  note: string | null;
  created_at: string;
}

interface Props {
  quizSetId: string;
  hostAddress: string | null;
  isHost: boolean;
  userId: string | null;
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function isValidSolAddress(v: string): boolean {
  try { new PublicKey(v.trim()); return true; } catch { return false; }
}

export const PoolTopUp: React.FC<Props> = ({ quizSetId, hostAddress, isHost, userId }) => {
  const [topups, setTopups] = useState<TopUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddr, setEditingAddr] = useState(false);
  const [addrInput, setAddrInput] = useState(hostAddress || '');
  const [savingAddr, setSavingAddr] = useState(false);
  const [amountSol, setAmountSol] = useState('0.1');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { setAddrInput(hostAddress || ''); }, [hostAddress]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('live_pool_topups')
      .select('*')
      .eq('quiz_set_id', quizSetId)
      .order('created_at', { ascending: false });
    setTopups((data as TopUpRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [quizSetId]);

  useEffect(() => {
    const ch = supabase
      .channel(`pool-topups-${quizSetId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_pool_topups', filter: `quiz_set_id=eq.${quizSetId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [quizSetId]);

  const totalSol = useMemo(
    () => topups.reduce((s, t) => s + Number(t.amount_sol || 0), 0),
    [topups]
  );

  const saveHostAddress = async () => {
    const v = addrInput.trim();
    if (!isValidSolAddress(v)) { toast.error('That is not a valid Solana address.'); return; }
    setSavingAddr(true);
    const { error } = await supabase
      .from('live_quiz_sets')
      .update({ host_wallet_address: v })
      .eq('id', quizSetId);
    setSavingAddr(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Prize pool wallet set');
    setEditingAddr(false);
  };

  const contribute = async () => {
    if (!userId) { toast.error('Sign in to contribute'); return; }
    if (!hostAddress) { toast.error('Host has not set a wallet yet'); return; }
    const amount = Number(amountSol);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a valid SOL amount'); return; }
    if (!isPhantomAvailable()) {
      toast.error('Phantom wallet not detected. Install it to contribute.');
      return;
    }
    const provider = getPhantomProvider();
    if (!provider) return;

    setSending(true);
    try {
      const resp = await provider.connect();
      const from = new PublicKey(resp.publicKey.toString());
      const to = new PublicKey(hostAddress);
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);

      const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
      const { blockhash } = await connection.getLatestBlockhash();

      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: from }).add(
        SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })
      );

      // Phantom's signAndSendTransaction returns { signature }
      const { signature } = await (provider as any).signAndSendTransaction(tx);
      toast.info('Transaction sent, waiting for confirmation…');
      await connection.confirmTransaction(signature, 'confirmed');

      const { error } = await supabase.from('live_pool_topups').insert({
        quiz_set_id: quizSetId,
        from_address: from.toString(),
        to_address: to.toString(),
        tx_signature: signature,
        amount_lamports: lamports,
        amount_sol: amount,
        note: note.trim() || null,
        created_by: userId,
      } as never);
      if (error) { toast.error(`Sent, but recording failed: ${error.message}`); return; }

      toast.success(`Contributed ${amount} SOL to the prize pool!`);
      setNote('');
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('user rejected')) toast.error('Transaction cancelled');
      else toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Prize pool (SOL)</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total contributed</p>
          <p className="text-xl font-bold text-primary">{totalSol.toFixed(4)} SOL</p>
        </div>
      </div>

      {/* Host wallet section */}
      {hostAddress && !editingAddr ? (
        <div className="flex items-center justify-between gap-2 text-sm bg-muted/40 rounded-md p-2">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-mono truncate" title={hostAddress}>{shortAddr(hostAddress)}</span>
            <a
              href={`https://solscan.io/account/${hostAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary"
              aria-label="View on Solscan"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {isHost && (
            <Button variant="ghost" size="sm" onClick={() => setEditingAddr(true)}>Change</Button>
          )}
        </div>
      ) : isHost ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Set the Solana wallet that will receive contributions to this show's prize pool. You control this wallet — payouts to winners are made by you.
          </p>
          <div className="flex gap-2">
            <Input
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value)}
              placeholder="Your Solana wallet address"
              className="font-mono text-xs"
            />
            <Button size="sm" onClick={saveHostAddress} disabled={savingAddr}>
              {savingAddr ? '…' : 'Save'}
            </Button>
            {hostAddress && (
              <Button size="sm" variant="ghost" onClick={() => { setEditingAddr(false); setAddrInput(hostAddress); }}>Cancel</Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">The host hasn't set a prize pool wallet yet.</p>
      )}

      {/* Contribute */}
      {hostAddress && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-sm font-semibold">Top up the pool</p>
          {!userId && <p className="text-xs text-muted-foreground">Sign in to contribute SOL.</p>}
          {userId && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amountSol}
                    onChange={(e) => setAmountSol(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">SOL</span>
                </div>
                <Button onClick={contribute} disabled={sending} className="gap-1">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </div>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (name, message)"
                maxLength={80}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Requires Phantom wallet on Solana mainnet. Contributions are non-refundable.
              </p>
            </>
          )}
        </div>
      )}

      {/* Contribution list */}
      {topups.length > 0 && (
        <div className="border-t border-border pt-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent top-ups</p>
          <div className="space-y-1 max-h-48 overflow-auto">
            {topups.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-muted-foreground shrink-0">{shortAddr(t.from_address)}</span>
                  {t.note && <span className="truncate">"{t.note}"</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-primary">{Number(t.amount_sol).toFixed(4)} SOL</span>
                  <a
                    href={`https://solscan.io/tx/${t.tx_signature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    aria-label="View transaction"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && topups.length === 0 && (
        <p className="text-xs text-muted-foreground">Loading contributions…</p>
      )}
    </Card>
  );
};
