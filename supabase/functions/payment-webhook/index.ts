// Edge Function: payment-webhook
// Receives gateway callbacks (ABA PayWay / Stripe / Bakong KHQR) and moves the
// payment to escrow (held). For MVP it also auto-releases so the provider wallet
// is credited immediately; flip AUTO_RELEASE off to require customer approval.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const AUTO_RELEASE = true;

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // TODO: verify the gateway signature (Stripe-Signature / ABA hash) before trusting.
  const body = await req.json().catch(() => ({}));
  const paymentId: string | undefined = body.payment_id ?? body.metadata?.payment_id;
  const method: string = body.method ?? 'khqr';
  const txn: string | null = body.transaction_id ?? body.txn ?? null;
  const success: boolean = body.status ? body.status === 'success' || body.status === 'paid' : true;

  if (!paymentId) return json({ error: 'missing payment_id' }, 400);
  if (!success) {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId);
    return json({ ok: true, status: 'failed' });
  }

  const { error: cErr } = await supabase.rpc('confirm_payment', {
    p_payment_id: paymentId, p_method: method, p_txn: txn,
  });
  if (cErr) return json({ error: cErr.message }, 500);

  if (AUTO_RELEASE) {
    // Service role passes the release guard (is_admin OR customer) via SQL context;
    // release_payment checks auth.uid() — call the admin path helper instead.
    await supabase.rpc('release_payment_admin', { p_payment_id: paymentId });
  }

  return json({ ok: true, status: AUTO_RELEASE ? 'released' : 'held' });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
