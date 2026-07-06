// Google Places — destination autocomplete + place → coordinates.
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
  const loc = near ? `&location=${near.lat},${near.lng}&radius=50000` : '';
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(input)}&components=country:kh&language=en${loc}&key=${KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return (json.predictions ?? []).map((p: any) => ({
      place_id: p.place_id,
      primary: p.structured_formatting?.main_text ?? p.description,
      secondary: p.structured_formatting?.secondary_text ?? '',
    }));
  } catch {
    return [];
  }
}

// Resolve a selected place to coordinates.
export async function placeCoords(placeId: string): Promise<Coords | null> {
  if (!KEY) return null;
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}&fields=geometry&key=${KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const g = json.result?.geometry?.location;
    return g ? { lat: g.lat, lng: g.lng } : null;
  } catch {
    return null;
  }
}
