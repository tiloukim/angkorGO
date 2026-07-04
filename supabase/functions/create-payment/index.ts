// Edge Function: create-payment
// Given a payment_id + method, returns client-usable payment data:
//   khqr/aba/wing/acleda → a QR string / deeplink to display
//   stripe               → a PaymentIntent client_secret
// Gateway calls are stubbed where live credentials/bank onboarding are pending;
// each TODO marks the real integration point.
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { payment_id, method } = await req.json();
  const { data: payment } = await supabase.from('payments').select('*').eq('id', payment_id).single();
  if (!payment) return json({ error: 'payment not found' }, 404);

  const amount = Number(payment.amount);
  const callback = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`;

  switch (method) {
    case 'khqr':
    case 'aba_payway':
    case 'wing':
    case 'acleda': {
      // TODO: call Bakong/ABA PayWay to generate a real KHQR payload + txn ref.
      // For now return a deterministic placeholder the app renders as a QR.
      const qr = `KHQR|angkorgo|${payment.currency}|${amount.toFixed(2)}|${payment_id}`;
      return json({ method, qr, amount, currency: payment.currency, callback });
    }
    case 'stripe': {
      // TODO: create a Stripe PaymentIntent with STRIPE_SECRET_KEY and metadata
      // { payment_id } so the webhook can reconcile. Returns client_secret.
      return json({ method, client_secret: `pi_stub_${payment_id}`, amount, currency: payment.currency });
    }
    default:
      return json({ error: 'unsupported method' }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
