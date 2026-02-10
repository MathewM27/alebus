import * as storage from '@/utils/storage';
import { Href, router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      // Get first segment to check if user is already in a route group
      const inGroup = segments[0] as string;
      
      // Valid route groups - don't redirect if user is already in one
      const validGroups = ['(boot)', '(tabs)', '(modals)'];
      const isInValidGroup = validGroups.includes(inGroup);
      
      // Only redirect if we're at root, not if deep linked into a group
      if (isInValidGroup) {
        setIsLoading(false);
        return;
      }

      // Check onboarding and auth status
      const hasCompletedOnboarding = await storage.getOnboardingComplete();
      const userId = await storage.getUserId();

      if (!hasCompletedOnboarding) {
        router.replace('/(boot)/onboarding' as Href);
      } else if (!userId) {
        router.replace('/(boot)/register' as Href);
      } else {
        router.replace('/(tabs)' as Href);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Default to onboarding on error
      router.replace('/(boot)/onboarding' as Href);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
