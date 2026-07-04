// Root layout — wraps the app in AuthProvider and gates routing by session/role.
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/lib/auth';

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Not signed in → force to login.
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Signed in but hasn't finished onboarding → role selection.
    if (profile && !profile.onboarded) {
      if (segments[1] !== 'role') router.replace('/(auth)/role');
      return;
    }

    // Signed in and onboarded → send to the right app root.
    if (profile && inAuthGroup) {
      router.replace(profile.role === 'provider' ? '/(provider)' : '/(customer)');
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220' }}>
        <ActivityIndicator color="#F04438" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
