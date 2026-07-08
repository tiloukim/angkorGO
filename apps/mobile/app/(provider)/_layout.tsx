import { Stack } from 'expo-router';

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F6F7' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="vehicles" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="job/[id]" />
      <Stack.Screen name="trip/[id]" />
      <Stack.Screen name="delivery/[id]" />
      <Stack.Screen name="parcel/[id]" />
    </Stack>
  );
}
