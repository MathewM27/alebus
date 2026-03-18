import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function AuthCallback() {
  const { isAuthenticated, isLoading } = useAuth();
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string }>();

  useEffect(() => {
    console.log('[AuthCallback] params:', JSON.stringify(params));

    async function exchange() {
      // PKCE flow — magic link and OAuth both send ?code=
      if (params.code) {
        console.log('[AuthCallback] exchanging code...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(String(params.code));
        if (error) console.error('[AuthCallback] exchange failed:', error.message);
        else console.log('[AuthCallback] exchange OK:', data.session?.user?.email);
        return;
      }

      // Implicit flow fallback — access_token in params
      if (params.access_token && params.refresh_token) {
        console.log('[AuthCallback] implicit setSession...');
        const { error } = await supabase.auth.setSession({
          access_token: String(params.access_token),
          refresh_token: String(params.refresh_token),
        });
        if (error) console.error('[AuthCallback] setSession failed:', error.message);
        else console.log('[AuthCallback] setSession OK');
        return;
      }

      console.warn('[AuthCallback] no code or token params found');
    }

    exchange();
  }, [params.code, params.access_token]);

  useEffect(() => {
    console.log('[AuthCallback] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('[AuthCallback] → navigating to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  return <View />;
}
