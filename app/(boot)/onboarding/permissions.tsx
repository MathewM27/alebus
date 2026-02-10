import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as storage from '@/utils/storage';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function OnboardingPermissions() {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      // In Expo Go, native permissions require a development build
      // Show info and continue to registration
      Alert.alert(
        'Permissions',
        'Location and notification permissions will be requested when you build your own app. For now, continuing with Expo Go.',
        [
          {
            text: 'Continue',
            onPress: async () => {
              await storage.setOnboardingComplete(true);
              router.replace('/(boot)/register' as Href);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      await storage.setOnboardingComplete(true);
      router.replace('/(boot)/register' as Href);
    } finally {
      setIsLoading(false);
    }
  };

  const skipPermissions = async () => {
    await storage.setOnboardingComplete(true);
    router.replace('/(boot)/register' as Href);
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Enable Permissions
        </ThemedText>
        
        <View style={styles.permissions}>
          <View style={styles.permissionCard}>
            <ThemedText style={styles.permissionIcon}>📍</ThemedText>
            <ThemedText type="subtitle" style={styles.permissionTitle}>
              Location Access
            </ThemedText>
            <ThemedText style={styles.permissionDescription}>
              We need your location to show nearby bus stops and provide accurate journey planning.
            </ThemedText>
          </View>

          <View style={styles.permissionCard}>
            <ThemedText style={styles.permissionIcon}>🔔</ThemedText>
            <ThemedText type="subtitle" style={styles.permissionTitle}>
              Notifications
            </ThemedText>
            <ThemedText style={styles.permissionDescription}>
              Get timely alerts when your bus is arriving or if there are delays on your route.
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.note}>
          You can change these permissions anytime in your device settings.
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <View 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onTouchEnd={isLoading ? undefined : requestPermissions}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Setting up...' : 'Grant Permissions'}
          </ThemedText>
        </View>
        
        <View 
          style={styles.skipButton}
          onTouchEnd={isLoading ? undefined : skipPermissions}
        >
          <ThemedText style={styles.skipButtonText}>
            Skip for Now
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    marginBottom: 32,
    textAlign: 'center',
  },
  permissions: {
    gap: 20,
    marginBottom: 32,
  },
  permissionCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  permissionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  permissionTitle: {
    marginBottom: 8,
  },
  permissionDescription: {
    opacity: 0.7,
    lineHeight: 20,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  footer: {
    padding: 32,
    gap: 12,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: '600',
  },
});
