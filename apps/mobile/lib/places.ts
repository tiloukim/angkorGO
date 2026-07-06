// Google Places API (New) — destination autocomplete + place → coordinates.
// Uses places.googleapis.com/v1 with an API key + field masks.
import type { Coords } from './location';

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface Prediction {
  place_id: string;
  primary: string;   // main text (e.g. "Aeon Mall")
  secondary: string; // context (e.g. "Phnom Penh")
}

// Autocomplete, biased to near the rider and restricted to Cambodia.
export async function placeAutocomplete(input: string, near?: Coords): Promise<Prediction[]> {
  if (!KEY || input.trim().length < 2) return [];
  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ['kh'],
    ...(near
      ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 50000 } } }
      : {}),
  };
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return (json.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        place_id: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      }));
  } catch {
    return [];
  }
}

// Resolve a selected place to coordinates (field mask keeps the call cheap).
export async function placeCoords(placeId: string): Promise<Coords | null> {
  if (!KEY) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'location' },
    });
    const json = await res.json();
    const g = json.location;
    return g ? { lat: g.latitude, lng: g.longitude } : null;
  } catch {
    return null;
  }
}
