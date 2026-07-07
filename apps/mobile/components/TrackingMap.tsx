// Live tracking map — customer pin + moving provider marker + driving route.
// Re-fetches the Google Directions route/ETA whenever the provider moves.
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { type Language } from '@angkorgo/shared';
import { fetchRoute, type Route } from '@/lib/directions';
import type { Coords } from '@/lib/location';
import { useLocale } from '@/lib/locale';

const L: Record<Language, Record<string, string>> = {
  en: { you: 'You', provider: 'Your provider', min: 'min', away: 'km away' },
  km: { you: 'អ្នក', provider: 'អ្នកផ្តល់សេវារបស់អ្នក', min: 'នាទី', away: 'គ.ម ទៀត' },
  zh: { you: '你', provider: '您的服务商', min: '分钟', away: '公里外' },
};

export function TrackingMap({ customer, provider }: { customer: Coords; provider: Coords | null }) {
  const { lang } = useLocale();
  const t = L[lang] ?? L.en;
  const [route, setRoute] = useState<Route | null>(null);
  const mapRef = useRef<MapView>(null);

  // Refresh the route when the provider's position changes meaningfully.
  useEffect(() => {
    if (!provider) return;
    fetchRoute(provider, customer).then(setRoute);
    mapRef.current?.fitToCoordinates(
      [
        { latitude: customer.lat, longitude: customer.lng },
        { latitude: provider.lat, longitude: provider.lng },
      ],
      { edgePadding: { top: 80, right: 80, bottom: 200, left: 80 }, animated: true },
    );
  }, [provider?.lat, provider?.lng]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: customer.lat, longitude: customer.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      >
        <Marker coordinate={{ latitude: customer.lat, longitude: customer.lng }} title={t.you} pinColor="#E5484D" />
        {provider && (
          <Marker
            coordinate={{ latitude: provider.lat, longitude: provider.lng }}
            title={t.provider}
            pinColor="#00B14F"
          />
        )}
        {route && (
          <Polyline
            coordinates={route.points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#00B14F"
            strokeWidth={4}
          />
        )}
      </MapView>

      {route && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>~{route.etaMinutes} {t.min} · {route.distanceKm} {t.away}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  etaPill: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 999, borderWidth: 1, borderColor: '#ECECEC',
  },
  etaText: { color: '#1C1C1C', fontWeight: '700' },
});
