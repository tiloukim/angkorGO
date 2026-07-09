// Google Routes API (v2) — fetch a driving route polyline + live ETA between two
// points. Replaces the legacy Directions API (blocked for new GCP projects).
import type { Coords } from './location';

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface Route {
  points: Coords[];       // decoded polyline for the map
  polyline: string;       // encoded polyline (store on the trip)
  etaMinutes: number;     // duration in traffic-free driving minutes
  distanceKm: number;
}

export async function fetchRoute(origin: Coords, dest: Coords): Promise<Route | null> {
  if (!KEY) return null;
  // Retry once on transient failure — we want the real road distance for fares,
  // not the straight-line fallback the callers use when this returns null.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
          travelMode: 'DRIVE',
          polylineEncoding: 'ENCODED_POLYLINE',
        }),
      });
      const json = await res.json();
      const route = json.routes?.[0];
      // Use the road route as long as a distance came back; the polyline is only
      // needed to draw the map, so don't discard the distance if it's missing.
      if (route && route.distanceMeters != null) {
        const encoded: string = route.polyline?.encodedPolyline ?? '';
        const seconds = parseInt(String(route.duration ?? '0'), 10) || 0; // "567s"
        return {
          points: encoded ? decodePolyline(encoded) : [],
          polyline: encoded,
          etaMinutes: Math.max(1, Math.round(seconds / 60)),
          distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
        };
      }
    } catch {
      // fall through to retry
    }
  }
  return null;
}

// Google's encoded-polyline algorithm.
export function decodePolyline(encoded: string): Coords[] {
  const points: Coords[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
