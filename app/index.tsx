import { setBootReady } from '@/utils/boot';
import * as storage from '@/utils/storage';
import { Href, router, useSegments } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const segments = useSegments();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      // TEMPORARY: Uncomment to reset onboarding for testing
      await storage.clear();
      
      // Don't redirect if user is already deep-linked into a route group.
      const inGroup = segments[0] as string;
      const validGroups = ['(boot)', '(tabs)', '(modals)'];
      if (validGroups.includes(inGroup)) {
        setBootReady();
        return;
      }

      // Read boot-critical values in parallel for speed.
      const [hasCompletedOnboarding, userId] = await Promise.all([
        storage.getOnboardingComplete(),
        storage.getUserId(),
      ]);

      if (!hasCompletedOnboarding) {
        router.replace('/(boot)/onboarding' as Href);
      } else if (!userId) {
        router.replace('/(boot)/register' as Href);
      } else {
        router.replace('/(tabs)' as Href);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/(boot)/onboarding' as Href);
    } finally {
      // Signal that boot checks are complete.
      // The root layout awaits this before hiding the splash.
      setBootReady();
    }
  };

  // Return nothing — the native splash + overlay covers this screen.
  // No ActivityIndicator needed; the splash IS the loading indicator.
  return null;
}
