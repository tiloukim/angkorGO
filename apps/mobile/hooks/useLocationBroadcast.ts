// Provider heartbeat — streams GPS to update_provider_location every ~5s while
// `active` (i.e. during an accepted/en-route/arrived/in-progress job).
import { useEffect } from 'react';
import * as Location from 'expo-location';
import { LOCATION_HEARTBEAT_MS } from '@angkorgo/shared';
import { supabase } from '@/lib/supabase';

export function useLocationBroadcast(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_HEARTBEAT_MS,
          distanceInterval: 10, // meters
        },
        (pos) => {
          supabase.rpc('update_provider_location', {
            p_lng: pos.coords.longitude,
            p_lat: pos.coords.latitude,
            p_heading: pos.coords.heading ?? null,
            p_speed: pos.coords.speed ?? null,
          });
        },
      );
    })();

    return () => { cancelled = true; sub?.remove(); };
  }, [active]);
}
