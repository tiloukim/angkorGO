// Live inbox of pending parcel (Express) offers for the signed-in courier.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ParcelOffer {
  offer_id: string;
  parcel_id: string;
  distance_km: number | null;
  eta_minutes: number | null;
  pickup: string | null;
  dropoff: string | null;
  fee: number | null;
}

async function fetchOffers(): Promise<ParcelOffer[]> {
  const { data } = await supabase
    .from('parcel_offers')
    .select('id, parcel_id, distance_km, eta_minutes, parcels(status, pickup_address, dropoff_address, fee)')
    .eq('status', 'offered')
    .order('offered_at', { ascending: false });

  return (data ?? [])
    .filter((r: any) => r.parcels?.status === 'searching')
    .map((r: any) => ({
      offer_id: r.id,
      parcel_id: r.parcel_id,
      distance_km: r.distance_km,
      eta_minutes: r.eta_minutes,
      pickup: r.parcels?.pickup_address ?? null,
      dropoff: r.parcels?.dropoff_address ?? null,
      fee: r.parcels?.fee ?? null,
    }));
}

export function useParcelOffers(providerId: string | undefined) {
  const [offers, setOffers] = useState<ParcelOffer[]>([]);
  const refresh = useCallback(() => { fetchOffers().then(setOffers); }, []);

  useEffect(() => {
    if (!providerId) return;
    refresh();
    const channel = supabase
      .channel(`parcel-offers:${providerId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'parcel_offers', filter: `provider_id=eq.${providerId}` },
        refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [providerId, refresh]);

  return { offers, refresh };
}
