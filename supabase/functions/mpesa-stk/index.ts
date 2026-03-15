// supabase/functions/mpesa-stk/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY')!
const CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET')!
const PASSKEY = Deno.env.get('MPESA_PASSKEY')!
const SHORTCODE = Deno.env.get('MPESA_SHORTCODE')! // Paybill or Till Number
const ENVIRONMENT = Deno.env.get('MPESA_ENVIRONMENT')! // 'sandbox' or 'production'

// Helper to generate M-Pesa Token
async function getMpesaToken() {
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)
  const url = ENVIRONMENT === 'production' 
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'

  const response = await fetch(url, {
    headers: { 'Authorization': `Basic ${auth}` }
  })
  const data = await response.json()
  return data.access_token
}

// Helper to generate Password
function generatePassword(timestamp: string) {
  return btoa(`${SHORTCODE}${PASSKEY}${timestamp}`)
}

serve(async (req) => {
  try {
    const { phone, amount, sale_id, org_id } = await req.json()

    if (!phone || !amount) {
      return new Response(JSON.stringify({ error: 'Phone and Amount required' }), { status: 400 })
    }

    const token = await getMpesaToken()
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    const password = generatePassword(timestamp)

    const stkUrl = ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

    // Initiate STK Push
    const response = await fetch(stkUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // or "CustomerBuyGoodsOnline"
        Amount: amount,
        PartyA: phone,
        PartyB: SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`, // We will create this next
        AccountReference: "WinePOS",
        TransactionDesc: "Payment for Sales"
      })
    })

    const data = await response.json()

    if (data.ResponseCode === "0") {
      // Save transaction to DB
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabase.from('mpesa_transactions').insert({
        organization_id: org_id,
        sale_id: sale_id,
        phone_number: phone,
        amount: amount,
        merchant_request_id: data.MerchantRequestID,
        checkout_request_id: data.CheckoutRequestID,
        status: 'pending'
      })

      return new Response(JSON.stringify({ success: true, data }), { status: 200 })
    } else {
      return new Response(JSON.stringify({ success: false, error: data.errorMessage }), { status: 400 })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})