// Root layout — wraps the app in AuthProvider and gates routing by session/role.
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useRef } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LocaleProvider } from '@/lib/locale';
import { IS_DRIVER_APP } from '@/lib/variant';

function RootNavigator() {
  const { session, profile, loading, setRole } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const settingRole = useRef(false);

  useEffect(() => {
    if (loading) return;

    // expo-router types `segments` as a narrow tuple per known routes; index
    // it as a plain string[] for our group/screen checks.
    const seg = segments as string[];
    const inAuthGroup = seg[0] === '(auth)';

    if (!session) {
      // Not signed in → start at the welcome/language splash.
      if (!inAuthGroup) router.replace('/(auth)/welcome');
      return;
    }

    // Driver app (build variant): everyone is a provider — skip the role picker.
    // Any signed-in account is (auto-)set to provider, then routed to (provider).
    if (IS_DRIVER_APP) {
      if (profile && profile.role !== 'provider') {
        if (!settingRole.current) { settingRole.current = true; setRole('provider').catch(() => { settingRole.current = false; }); }
        return;
      }
      if (profile && inAuthGroup) router.replace('/(provider)');
      return;
    }

    // Signed in but hasn't finished onboarding → role selection.
    if (profile && !profile.onboarded) {
      if (seg[1] !== 'role') router.replace('/(auth)/role');
      return;
    }

    // Signed in and onboarded → send to the right app root.
    if (profile && inAuthGroup) {
      router.replace(profile.role === 'provider' ? '/(provider)' : '/(customer)');
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' }}>
        <ActivityIndicator color="#00B14F" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <RootNavigator />
      </LocaleProvider>
    </AuthProvider>
  );
}
