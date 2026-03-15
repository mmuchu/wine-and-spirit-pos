// supabase/functions/mpesa-callback/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const callbackData = await req.json();

    console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));

    const stkCallback = callbackData?.Body?.stkCallback;
    const checkoutRequestId = stkCallback?.CheckoutRequestID;
    const resultCode = stkCallback?.ResultCode;
    const resultDesc = stkCallback?.ResultDesc;

    if (!checkoutRequestId) {
      return new Response(JSON.stringify({ error: 'Missing CheckoutRequestID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('mpesa_transactions')
      .update({
        status: resultCode === 0 ? 'success' : 'failed',
        result_code: resultCode,
        result_desc: resultDesc,
        updated_at: new Date().toISOString(),
        metadata: stkCallback?.CallbackMetadata?.Item || null,
      })
      .eq('checkout_request_id', checkoutRequestId);

    if (updateError) {
      console.error('Database update failed:', updateError);
      // Return 200 anyway to stop retries
    }

    // Respond to Safaricom
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Callback processing failed:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});