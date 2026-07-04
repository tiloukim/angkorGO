// Live inbox of pending offers for the signed-in provider.
// Subscribes to service_assignments (status='offered') and joins request detail.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ServiceCategory } from '@angkorgo/shared';

export interface Offer {
  assignment_id: string;
  request_id: string;
  category: ServiceCategory;
  distance_km: number | null;
  eta_minutes: number | null;
  address: string | null;
  offered_at: string;
}

async function fetchOffers(): Promise<Offer[]> {
  const { data } = await supabase
    .from('service_assignments')
    .select('id, request_id, distance_km, eta_minutes, offered_at, service_requests(category, address, status)')
    .eq('status', 'offered')
    .order('offered_at', { ascending: false });

  return (data ?? [])
    // Only surface offers whose request is still open.
    .filter((r: any) => ['pending', 'dispatching'].includes(r.service_requests?.status))
    .map((r: any) => ({
      assignment_id: r.id,
      request_id: r.request_id,
      category: r.service_requests?.category,
      distance_km: r.distance_km,
      eta_minutes: r.eta_minutes,
      address: r.service_requests?.address,
      offered_at: r.offered_at,
    }));
}

export function useProviderOffers(providerId: string | undefined) {
  const [offers, setOffers] = useState<Offer[]>([]);

  const refresh = useCallback(() => { fetchOffers().then(setOffers); }, []);

  useEffect(() => {
    if (!providerId) return;
    refresh();

    // Any change to this provider's assignments refetches the inbox.
    const channel = supabase
      .channel(`offers:${providerId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'service_assignments', filter: `provider_id=eq.${providerId}` },
        refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [providerId, refresh]);

  return { offers, refresh };
}
