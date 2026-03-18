import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

async function handleDeepLink(url: string) {
  console.log('[AuthCallback] handleDeepLink:', url);

  // Strategy 1: PKCE flow → ?code=xxx query param
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(url);
    if (!error) {
      console.log('[AuthCallback] PKCE exchange OK:', data.session?.user?.email);
      return;
    }
    console.warn('[AuthCallback] PKCE failed:', error.message);
  } catch (e) {
    console.warn('[AuthCallback] PKCE threw:', e);
  }

  // Strategy 2: implicit flow → #access_token=xxx&refresh_token=xxx hash
  try {
    const hash = url.split('#')[1];
    if (hash) {
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      console.log('[AuthCallback] implicit flow, access_token present:', !!access_token);
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
          console.log('[AuthCallback] implicit setSession OK');
          return;
        }
        console.error('[AuthCallback] implicit setSession failed:', error.message);
      }
    }
  } catch (e) {
    console.error('[AuthCallback] implicit parse threw:', e);
  }

  console.warn('[AuthCallback] all strategies failed');
}

export default function AuthCallback() {
  const { isAuthenticated } = useAuth();

  // Supabase-recommended pattern: useURL() handles both cold-start and foreground
  const url = Linking.useURL();
  useEffect(() => {
    if (url) handleDeepLink(url);
  }, [url]);

  // Navigate to app once auth context confirms the session
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[AuthCallback] isAuthenticated → navigating to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  return <View />;
}
