import { setBootReady } from '@/utils/boot';
import * as storage from '@/utils/storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const storedUserId = await storage.getUserId();
      const storedEmail = await storage.getEmail();
      setUserId(storedUserId);
      setEmail(storedEmail);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
      // Fallback boot signal for deep-link scenarios where
      // index.tsx may not mount and can't call setBootReady().
      setBootReady();
    }
  };

  const login = async (newUserId: string, newEmail: string) => {
    try {
      await storage.setUserId(newUserId);
      await storage.setEmail(newEmail);
      setUserId(newUserId);
      setEmail(newEmail);
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await storage.removeItem(storage.STORAGE_KEYS.USER_ID);
      await storage.removeItem(storage.STORAGE_KEYS.EMAIL);
      await storage.removeActiveJourney();
      setUserId(null);
      setEmail(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const isAuthenticated = userId !== null;

  return (
    <AuthContext.Provider
      value={{
        userId,
        email,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
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
