import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyMessage } from 'https://esm.sh/viem@2.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerifyEthereumRequest {
  address: string;
  signature: string;
  message: string;
  nonce: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, signature, message, nonce } = await req.json() as VerifyEthereumRequest;

    console.log('Verify Ethereum request:', { address, nonce, messageLength: message?.length });

    if (!address || !signature || !message || !nonce) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    if (!message.includes(nonce)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid nonce' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!message.toLowerCase().includes(address.toLowerCase())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('auth_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('nonce', nonce);

    const walletAddress = address.toLowerCase();
    const nullifierHash = `eth_${walletAddress}`;

    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('nullifier_hash', nullifierHash)
      .maybeSingle();

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let user = existingUser;
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          nullifier_hash: nullifierHash,
          verification_level: 'device',
          wallet_type: 'ethereum',
        })
        .select()
        .single();
      if (insertError) {
        console.error('Error creating user:', insertError);
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
          wallet_address: walletAddress,
          created_at: user.created_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify Ethereum error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
