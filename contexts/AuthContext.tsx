import { supabase } from '@/lib/supabase';
import { createAuthenticatedClient } from '@/services/api/client';
import * as storage from '@/utils/storage';
import { setBootReady } from '@/utils/boot';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

interface UserProfile {
  userId: string;
  email: string;
  supabaseUserId: string;
}

interface AuthContextType {
  session: Session | null;
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Called after a successful Supabase sign-in.
  // Creates or fetches the user's backend record (idempotent).
  async function ensureBackendRegistration(activeSession: Session) {
    try {
      const authClient = createAuthenticatedClient();
      const profile = await authClient.post<UserProfile>('/users/register');
      setUserId(profile.userId);
      setEmail(profile.email);
      // Persist for index.tsx boot check
      await storage.setUserId(profile.userId);
      await storage.setEmail(profile.email);
    } catch (err) {
      console.error('[Auth] backend registration failed, falling back to Supabase identity', err);
      // Don't block the user — session is valid even if backend call fails
      setUserId(activeSession.user.id);
      setEmail(activeSession.user.email ?? null);
    } finally {
      setIsLoading(false);
      setBootReady();
    }
  }

  function clearState() {
    setSession(null);
    setUserId(null);
    setEmail(null);
  }

  useEffect(() => {
    // 1. Restore any persisted session on app start
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      console.log('[AuthContext] getSession result:', existing ? `user=${existing.user.email}` : 'no session');
      setSession(existing);
      if (existing) {
        ensureBackendRegistration(existing);
      } else {
        setIsLoading(false);
        setBootReady();
      }
    });

    // 2. Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[AuthContext] onAuthStateChange:', event, newSession ? `user=${newSession.user.email}` : 'no session');
        setSession(newSession);
        if (event === 'SIGNED_IN' && newSession) {
          ensureBackendRegistration(newSession);
        } else if (event === 'SIGNED_OUT') {
          clearState();
          setIsLoading(false);
          setBootReady();
        }
        // TOKEN_REFRESHED: session is updated automatically; no action needed
      }
    );

    // 3. Resume auto-refresh when app comes back to foreground.
    //    Without this, a session that expired while the app was backgrounded
    //    won't be renewed until the next API call fails with 401.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      await storage.removeItem(storage.STORAGE_KEYS.USER_ID);
      await storage.removeItem(storage.STORAGE_KEYS.EMAIL);
      await storage.removeActiveJourney();
      // clearState() is called by the SIGNED_OUT event above
    } catch (error) {
      console.error('[Auth] logout error:', error);
      throw error;
    }
  };

  const isAuthenticated = session !== null && userId !== null;

  return (
    <AuthContext.Provider
      value={{
        session,
        userId,
        email,
        isAuthenticated,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
