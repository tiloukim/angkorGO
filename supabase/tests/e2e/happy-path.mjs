// End-to-end happy path against a running Supabase (local or staging).
// Exercises the real RLS + RPC surface as customer and provider clients.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
//     node supabase/tests/e2e/happy-path.mjs
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const pw = 'Test-1234!';
const stamp = Date.now();

async function makeUser(email, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: pw, email_confirm: true, user_metadata: { role },
  });
  if (error) throw error;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: pw });
  return { id: data.user.id, client };
}

async function main() {
  // 1) Actors
  const customer = await makeUser(`cust+${stamp}@e2e.test`, 'customer');
  const provider = await makeUser(`prov+${stamp}@e2e.test`, 'provider');

  // 2) Provider setup (service role): approve, online, service, location ~1 km away
  const { data: prov } = await admin.from('providers').select('id').eq('user_id', provider.id).single();
  await admin.from('providers').update({ status: 'approved', is_online: true }).eq('id', prov.id);
  await admin.from('provider_services').insert({ provider_id: prov.id, category: 'flat_tire' });
  await admin.from('provider_locations').insert({
    provider_id: prov.id, location: `SRID=4326;POINT(104.935 11.560)`, lat: 11.560, lng: 104.935,
  });

  // 3) Customer creates a request (RPC, RLS-enforced)
  const { data: requestId, error: rErr } = await customer.client.rpc('create_service_request', {
    p_category: 'flat_tire', p_lng: 104.9219, p_lat: 11.5564, p_address: 'Independence Monument',
  });
  assert.ok(!rErr && requestId, 'request created');

  // 4) Dispatch → provider is offered
  const { data: offers } = await customer.client.rpc('dispatch_request', { p_request_id: requestId });
  assert.ok(offers >= 1, 'at least one offer created');

  const { data: assignment } = await provider.client
    .from('service_assignments').select('id').eq('request_id', requestId).single();
  assert.ok(assignment, 'provider can see their offer');

  // 5) Provider accepts (atomic)
  const { error: aErr } = await provider.client.rpc('accept_assignment', { p_assignment_id: assignment.id });
  assert.ok(!aErr, 'provider accepted');

  // 6) Provider drives → location heartbeat + status transitions
  await provider.client.rpc('update_provider_location', { p_lng: 104.930, p_lat: 11.558 });
  for (const s of ['en_route', 'arrived', 'in_progress']) {
    await provider.client.from('service_requests').update({ status: s }).eq('id', requestId);
  }

  // 7) Invoice → confirm (webhook/service role) → release (customer)
  const { data: paymentId } = await provider.client.rpc('create_invoice', {
    p_request_id: requestId, p_amount: 40, p_currency: 'USD',
  });
  await admin.rpc('confirm_payment', { p_payment_id: paymentId, p_method: 'khqr', p_txn: 'e2e' });
  const { error: relErr } = await customer.client.rpc('release_payment', { p_payment_id: paymentId });
  assert.ok(!relErr, 'customer released payment');

  // 8) Assertions: wallet credited 90%, request completed, provider rating updated
  const { data: wallet } = await admin.from('wallets').select('balance').eq('provider_id', prov.id).single();
  assert.equal(Number(wallet.balance), 36, 'provider wallet credited $36 (90% of $40)');

  const { data: req } = await admin.from('service_requests').select('status').eq('id', requestId).single();
  assert.equal(req.status, 'completed', 'request completed');

  await customer.client.from('reviews').insert({
    request_id: requestId, provider_id: prov.id, customer_id: customer.id, rating: 5,
  });
  const { data: p2 } = await admin.from('providers').select('rating').eq('id', prov.id).single();
  assert.equal(Number(p2.rating), 5, 'provider rating recomputed to 5.0');

  // Cleanup
  await admin.auth.admin.deleteUser(customer.id);
  await admin.auth.admin.deleteUser(provider.id);

  console.log('✅ e2e happy path passed');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });
