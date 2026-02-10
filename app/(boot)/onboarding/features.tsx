import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function OnboardingFeatures() {
  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Why Alebus?
        </ThemedText>
        
        <View style={styles.features}>
          <View style={styles.featureCard}>
            <ThemedText style={styles.featureIcon}>📍</ThemedText>
            <ThemedText type="subtitle" style={styles.featureTitle}>
              Real-Time Tracking
            </ThemedText>
            <ThemedText style={styles.featureDescription}>
              See exactly where your bus is on the map and get accurate arrival times.
            </ThemedText>
          </View>

          <View style={styles.featureCard}>
            <ThemedText style={styles.featureIcon}>🗺️</ThemedText>
            <ThemedText type="subtitle" style={styles.featureTitle}>
              Smart Journey Planning
            </ThemedText>
            <ThemedText style={styles.featureDescription}>
              Get the best route recommendations with multiple journey options.
            </ThemedText>
          </View>

          <View style={styles.featureCard}>
            <ThemedText style={styles.featureIcon}>🔔</ThemedText>
            <ThemedText type="subtitle" style={styles.featureTitle}>
              Arrival Notifications
            </ThemedText>
            <ThemedText style={styles.featureDescription}>
              Receive alerts when your bus is approaching so you never miss it.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View 
          style={styles.button}
          onTouchEnd={() => router.push('/(boot)/onboarding/permissions' as Href)}
        >
          <ThemedText style={styles.buttonText}>Next</ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 32,
    paddingBottom: 100,
  },
  title: {
    marginBottom: 32,
    textAlign: 'center',
  },
  features: {
    gap: 24,
  },
  featureCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    backgroundColor: 'transparent',
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
