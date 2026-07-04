// Customer-side live subscription to the assigned provider's position.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Coords } from '@/lib/location';

export function useProviderLocation(providerId: string | null | undefined) {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (!providerId) return;

    supabase.from('provider_locations').select('lat, lng').eq('provider_id', providerId).single()
      .then(({ data }) => { if (data?.lat != null) setCoords({ lat: data.lat, lng: data.lng }); });

    const channel = supabase
      .channel(`track:${providerId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'provider_locations', filter: `provider_id=eq.${providerId}` },
        (p) => {
          const row = p.new as { lat: number | null; lng: number | null };
          if (row.lat != null && row.lng != null) setCoords({ lat: row.lat, lng: row.lng });
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [providerId]);

  return coords;
}
