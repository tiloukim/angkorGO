import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F6F7' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="membership" />
      <Stack.Screen name="sos" />
      <Stack.Screen name="airport" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="spin" />
      <Stack.Screen name="account" />
      <Stack.Screen name="ride/index" />
      <Stack.Screen name="ride/select" />
      <Stack.Screen name="ride/[id]" />
      <Stack.Screen name="rentals/index" />
      <Stack.Screen name="rentals/[id]" />
      <Stack.Screen name="stays/index" />
      <Stack.Screen name="stays/[id]" />
      <Stack.Screen name="booking/[id]" />
      <Stack.Screen name="host/index" />
      <Stack.Screen name="host/new" />
      <Stack.Screen name="food/index" />
      <Stack.Screen name="food/[id]" />
      <Stack.Screen name="food/order/[id]" />
      <Stack.Screen name="express/index" />
      <Stack.Screen name="express/[id]" />
      <Stack.Screen name="restaurant/index" />
      <Stack.Screen name="request/location" />
      <Stack.Screen name="request/photos" />
      <Stack.Screen name="request/[id]" />
    </Stack>
  );
}
