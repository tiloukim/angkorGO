import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B1220' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="request/location" />
      <Stack.Screen name="request/photos" />
      <Stack.Screen name="request/[id]" />
    </Stack>
  );
}
