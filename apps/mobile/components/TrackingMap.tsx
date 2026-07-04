// Live tracking map — customer pin + moving provider marker + driving route.
// Re-fetches the Google Directions route/ETA whenever the provider moves.
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { fetchRoute, type Route } from '@/lib/directions';
import type { Coords } from '@/lib/location';

export function TrackingMap({ customer, provider }: { customer: Coords; provider: Coords | null }) {
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
        <Marker coordinate={{ latitude: customer.lat, longitude: customer.lng }} title="You" pinColor="#F04438" />
        {provider && (
          <Marker
            coordinate={{ latitude: provider.lat, longitude: provider.lng }}
            title="Your provider"
            pinColor="#10B981"
          />
        )}
        {route && (
          <Polyline
            coordinates={route.points.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#F04438"
            strokeWidth={4}
          />
        )}
      </MapView>

      {route && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>~{route.etaMinutes} min · {route.distanceKm} km away</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  etaPill: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: '#0B1220', paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 999, borderWidth: 1, borderColor: '#1F2A40',
  },
  etaText: { color: '#fff', fontWeight: '700' },
});
