// Live inbox of pending ride offers for the signed-in driver.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { VehicleClass } from '@angkorgo/shared';

export interface TripOffer {
  offer_id: string;
  trip_id: string;
  class: VehicleClass;
  distance_km: number | null;
  eta_minutes: number | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  est_fare: number | null;
}

async function fetchOffers(): Promise<TripOffer[]> {
  const { data } = await supabase
    .from('trip_offers')
    .select('id, trip_id, distance_km, eta_minutes, trips(class, pickup_address, dropoff_address, est_fare, status)')
    .eq('status', 'offered')
    .order('offered_at', { ascending: false });

  return (data ?? [])
    .filter((r: any) => ['requested', 'searching'].includes(r.trips?.status))
    .map((r: any) => ({
      offer_id: r.id,
      trip_id: r.trip_id,
      class: r.trips?.class,
      distance_km: r.distance_km,
      eta_minutes: r.eta_minutes,
      pickup_address: r.trips?.pickup_address,
      dropoff_address: r.trips?.dropoff_address,
      est_fare: r.trips?.est_fare,
    }));
}

export function useTripOffers(providerId: string | undefined) {
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const refresh = useCallback(() => { fetchOffers().then(setOffers); }, []);

  useEffect(() => {
    if (!providerId) return;
    refresh();
    const channel = supabase
      .channel(`trip-offers:${providerId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trip_offers', filter: `provider_id=eq.${providerId}` },
        refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [providerId, refresh]);

  return { offers, refresh };
}
