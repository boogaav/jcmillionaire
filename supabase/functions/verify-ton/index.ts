import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nacl from 'https://esm.sh/tweetnacl@1.0.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TonProof {
  timestamp: number;
  domain: { lengthBytes: number; value: string };
  signature: string; // base64
  payload: string;
}

interface VerifyTonRequest {
  address: string; // "0:hex"
  network: string;
  publicKey: string; // hex
  proof: TonProof;
  nonce: string;
}

const ALLOWED_DOMAINS = new Set([
  'jcmillionaire.lovable.app',
  'jackiechain.world',
  'www.jackiechain.world',
  'game.jackiechain.world',
  'localhost',
]);

function isAllowedDomain(domain: string): boolean {
  if (ALLOWED_DOMAINS.has(domain)) return true;
  // Allow Lovable preview subdomains
  if (/\.lovable\.app$/.test(domain)) return true;
  if (/^localhost(:\d+)?$/.test(domain)) return true;
  return false;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buf);
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

async function verifyTonProof(req: VerifyTonRequest): Promise<boolean> {
  const enc = new TextEncoder();
  const [wcStr, hashHex] = req.address.split(':');
  if (!wcStr || !hashHex) throw new Error('Invalid address');
  const workchain = parseInt(wcStr, 10);
  const addrHash = hexToBytes(hashHex);
  if (addrHash.length !== 32) throw new Error('Invalid address hash');

  // Workchain (int32 big-endian)
  const wcBuf = new ArrayBuffer(4);
  new DataView(wcBuf).setInt32(0, workchain, false);

  // Domain length (uint32 little-endian) + domain bytes
  const domainBytes = enc.encode(req.proof.domain.value);
  const domainLenBuf = new ArrayBuffer(4);
  new DataView(domainLenBuf).setUint32(0, domainBytes.length, true);

  // Timestamp (uint64 little-endian)
  const tsBuf = new ArrayBuffer(8);
  new DataView(tsBuf).setBigUint64(0, BigInt(req.proof.timestamp), true);

  const payloadBytes = enc.encode(req.proof.payload);

  const message = concat(
    enc.encode('ton-proof-item-v2/'),
    new Uint8Array(wcBuf),
    addrHash,
    new Uint8Array(domainLenBuf),
    domainBytes,
    new Uint8Array(tsBuf),
    payloadBytes
  );

  const innerHash = await sha256(message);
  const fullMessage = concat(
    new Uint8Array([0xff, 0xff]),
    enc.encode('ton-connect'),
    innerHash
  );
  const signedHash = await sha256(fullMessage);

  const sig = base64ToBytes(req.proof.signature);
  const pub = hexToBytes(req.publicKey);
  if (pub.length !== 32) throw new Error('Invalid public key length');
  if (sig.length !== 64) throw new Error('Invalid signature length');

  return nacl.sign.detached.verify(signedHash, sig, pub);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as VerifyTonRequest;
    const { address, publicKey, proof, nonce } = body;

    if (!address || !publicKey || !proof || !nonce) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Domain allowlist
    if (!isAllowedDomain(proof.domain.value)) {
      console.error('Disallowed domain:', proof.domain.value);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Timestamp freshness (5 min)
    const ageSec = Math.floor(Date.now() / 1000) - proof.timestamp;
    if (ageSec < -60 || ageSec > 5 * 60) {
      return new Response(
        JSON.stringify({ success: false, error: 'Proof expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Payload must equal our nonce
    if (proof.payload !== nonce) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nonce mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate nonce in DB
    const { data: nonceRecord } = await supabase
      .from('auth_nonces')
      .select('created_at, used_at')
      .eq('nonce', nonce)
      .maybeSingle();

    if (!nonceRecord) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (nonceRecord.used_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nonce already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const nonceAge = Date.now() - new Date(nonceRecord.created_at).getTime();
    if (nonceAge > 5 * 60 * 1000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nonce expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the ed25519 proof signature
    let ok = false;
    try {
      ok = await verifyTonProof(body);
    } catch (e) {
      console.error('Proof verification error:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Proof verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark nonce as used
    await supabase
      .from('auth_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('nonce', nonce);

    const nullifierHash = `ton_${address}`;

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('nullifier_hash', nullifierHash)
      .maybeSingle();

    let user = existingUser;
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          nullifier_hash: nullifierHash,
          verification_level: 'device',
          wallet_type: 'ton',
        })
        .select()
        .single();
      if (insertError) {
        console.error('Insert user error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = newUser;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          verification_level: user.verification_level,
          wallet_address: address,
          created_at: user.created_at,
          username: user.username,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verify-ton error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
