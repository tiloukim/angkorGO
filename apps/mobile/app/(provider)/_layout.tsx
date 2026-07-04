import { Stack } from 'expo-router';

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B1220' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="job/[id]" />
    </Stack>
  );
}
