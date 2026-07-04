// Location helpers wrapping expo-location.
import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

// Phnom Penh (Independence Monument) — fallback if permission denied.
export const DEFAULT_COORDS: Coords = { lat: 11.5564, lng: 104.9219 };

export async function getCurrentCoords(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return DEFAULT_COORDS;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

// Reverse-geocode to a human address (uses on-device geocoder; no API key).
export async function coordsToAddress(c: Coords): Promise<string> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
    if (!r) return '';
    return [r.name, r.street, r.district, r.city, r.region]
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}
