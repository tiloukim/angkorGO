// Live inbox of pending delivery offers for the signed-in courier.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface CourierOffer {
  offer_id: string;
  order_id: string;
  distance_km: number | null;
  eta_minutes: number | null;
  restaurant: string | null;
  dropoff: string | null;
  fee: number | null;
}

async function fetchOffers(): Promise<CourierOffer[]> {
  const { data } = await supabase
    .from('courier_offers')
    .select('id, order_id, distance_km, eta_minutes, orders(status, delivery_address, delivery_fee, restaurants(name))')
    .eq('status', 'offered')
    .order('offered_at', { ascending: false });

  return (data ?? [])
    .filter((r: any) => r.orders?.status === 'ready')
    .map((r: any) => ({
      offer_id: r.id,
      order_id: r.order_id,
      distance_km: r.distance_km,
      eta_minutes: r.eta_minutes,
      restaurant: r.orders?.restaurants?.name ?? null,
      dropoff: r.orders?.delivery_address ?? null,
      fee: r.orders?.delivery_fee ?? null,
    }));
}

export function useCourierOffers(providerId: string | undefined) {
  const [offers, setOffers] = useState<CourierOffer[]>([]);
  const refresh = useCallback(() => { fetchOffers().then(setOffers); }, []);

  useEffect(() => {
    if (!providerId) return;
    refresh();
    const channel = supabase
      .channel(`courier-offers:${providerId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courier_offers', filter: `provider_id=eq.${providerId}` },
        refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [providerId, refresh]);

  return { offers, refresh };
}
