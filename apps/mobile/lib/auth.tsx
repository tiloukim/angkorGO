// Auth context — wraps Supabase Auth and exposes session + profile (role).
// Provides email-OTP, Google, and Apple sign-in for the customer/provider apps.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@angkorgo/shared';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  sendEmailOtp: (email: string, role?: UserRole) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const redirectTo = makeRedirectUri({ scheme: 'angkorgo', path: 'auth/callback' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- Email OTP (passwordless 6-digit code) ----
  async function sendEmailOtp(email: string, role: UserRole = 'customer') {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, data: { role } },
    });
    if (error) throw error;
  }

  async function verifyEmailOtp(email: string, token: string) {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
  }

  // ---- Google (OAuth via system browser) ----
  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success') await exchangeCodeFromUrl(res.url);
  }

  // ---- Apple (native, iOS only) ----
  async function signInWithApple() {
    if (Platform.OS !== 'ios') throw new Error('Apple Sign In is iOS only');
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!cred.identityToken) throw new Error('No Apple identity token');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: cred.identityToken,
    });
    if (error) throw error;
  }

  async function exchangeCodeFromUrl(url: string) {
    const code = new URL(url).searchParams.get('code');
    if (code) await supabase.auth.exchangeCodeForSession(code);
  }

  // Set/confirm role after first sign-in (new users pick customer vs provider).
  async function setRole(role: UserRole) {
    if (!session) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role, onboarded: true })
      .eq('id', session.user.id);
    if (error) throw error;
    // Also mirror to auth metadata so future JWTs carry the role.
    await supabase.auth.updateUser({ data: { role } });
    await loadProfile(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, sendEmailOtp, verifyEmailOtp, signInWithGoogle, signInWithApple, setRole, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
