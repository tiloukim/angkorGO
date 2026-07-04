// Google Directions — fetch a driving route polyline + live ETA between two points.
import type { Coords } from './location';

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface Route {
  points: Coords[];       // decoded polyline for the map
  etaMinutes: number;     // duration in traffic-free driving minutes
  distanceKm: number;
}

export async function fetchRoute(origin: Coords, dest: Coords): Promise<Route | null> {
  if (!KEY) return null;
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}` +
    `&mode=driving&key=${KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const route = json.routes?.[0];
    const leg = route?.legs?.[0];
    if (!route || !leg) return null;
    return {
      points: decodePolyline(route.overview_polyline.points),
      etaMinutes: Math.max(1, Math.round(leg.duration.value / 60)),
      distanceKm: Math.round((leg.distance.value / 1000) * 10) / 10,
    };
  } catch {
    return null;
  }
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
