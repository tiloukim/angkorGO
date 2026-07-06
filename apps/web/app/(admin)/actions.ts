'use server';
// Admin mutations. RLS (role='admin') and SECURITY DEFINER guards on the RPCs
// are the real authority — these actions just run under the admin's session.
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export async function approveProvider(providerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('providers')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id })
    .eq('id', providerId);
  // Verify the provider's uploaded documents in one pass.
  await supabase.from('provider_documents').update({ verified: true, verified_by: user?.id }).eq('provider_id', providerId);
  // Notify the provider they're live (also pushes via the notifications webhook).
  const { data: prov } = await supabase.from('providers').select('user_id').eq('id', providerId).single();
  if (prov?.user_id) {
    await supabase.rpc('notify_user', {
      p_user_id: prov.user_id, p_title: 'You are approved!',
      p_body: 'Go online to start accepting rescue requests.', p_type: 'provider_approved', p_data: {},
    });
  }
  revalidatePath('/providers');
}

export async function rejectProvider(providerId: string) {
  const supabase = await createClient();
  await supabase.from('providers').update({ status: 'rejected' }).eq('id', providerId);
  revalidatePath('/providers');
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  const supabase = await createClient();
  await supabase.from('profiles').update({ is_suspended: suspended }).eq('id', userId);
  revalidatePath('/users');
}

export async function processPayout(withdrawalId: string, status: 'paid' | 'rejected' | 'processing') {
  const supabase = await createClient();
  // process_withdrawal handles the wallet refund on rejection atomically.
  await supabase.rpc('process_withdrawal', { p_withdrawal_id: withdrawalId, p_status: status });
  revalidatePath('/payouts');
}

export async function setVehicleVerified(vehicleId: string, verified: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('driver_vehicles')
    .update({ verified, verified_by: verified ? user?.id : null })
    .eq('id', vehicleId);
  revalidatePath('/vehicles');
}

export async function updateFareConfig(formData: FormData) {
  const supabase = await createClient();
  const cls = String(formData.get('class'));
  await supabase.from('fare_config').update({
    base_fare: Number(formData.get('base_fare')),
    per_km: Number(formData.get('per_km')),
    per_min: Number(formData.get('per_min')),
    minimum_fare: Number(formData.get('minimum_fare')),
    cancellation_fee: Number(formData.get('cancellation_fee')),
    updated_at: new Date().toISOString(),
  }).eq('class', cls);
  revalidatePath('/rides');
}

export async function setSurge(formData: FormData) {
  const supabase = await createClient();
  const v = Math.max(1, Number(formData.get('surge')) || 1);
  await supabase.from('platform_config').update({ value: v }).eq('key', 'surge_multiplier');
  revalidatePath('/rides');
}
