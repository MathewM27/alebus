import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

export default function OnboardingWelcome() {
  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Welcome to Alebus
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your smart companion for real-time bus tracking and journey planning
        </ThemedText>
        
        <View style={styles.iconContainer}>
          <ThemedText style={styles.icon}>🚌</ThemedText>
        </View>

        <ThemedText style={styles.description}>
          Never miss your bus again. Track live bus locations, plan your journeys, and get real-time arrival notifications.
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <View 
          style={styles.button}
          onTouchEnd={() => router.push('/(boot)/onboarding/features' as Href)}
        >
          <ThemedText style={styles.buttonText}>Get Started</ThemedText>
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
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 48,
    opacity: 0.8,
  },
  iconContainer: {
    marginVertical: 48,
  },
  icon: {
    fontSize: 120,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
  },
  footer: {
    padding: 32,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
