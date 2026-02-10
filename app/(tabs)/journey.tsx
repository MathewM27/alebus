import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useJourney } from '@/contexts/JourneyContext';
import { JourneyStatus } from '@/types/Journey';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function JourneyScreen() {
  const { activeJourney, updateStatus, endJourney } = useJourney();

  if (!activeJourney) {
    // Empty state when no journey is active
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyIcon}>🚌</ThemedText>
          <ThemedText type="title" style={styles.emptyTitle}>
            No Active Journey
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Start planning your journey from the Search tab
          </ThemedText>
          <Link href="/(tabs)/search" asChild>
            <View style={styles.button}>
              <ThemedText style={styles.buttonText}>
                Plan a Journey
              </ThemedText>
            </View>
          </Link>
        </View>
      </ThemedView>
    );
  }

  // Active journey view
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Active Journey
        </ThemedText>

        {/* Journey status badge */}
        <View style={styles.statusBadge}>
          <ThemedText style={styles.statusText}>
            {activeJourney.status}
          </ThemedText>
        </View>

        {/* Route summary */}
        <ThemedView style={styles.routeCard}>
          <ThemedText type="subtitle" style={styles.routeTitle}>
            {activeJourney.origin.name}
          </ThemedText>
          <ThemedText style={styles.routeArrow}>↓</ThemedText>
          <ThemedText type="subtitle" style={styles.routeTitle}>
            {activeJourney.destination.name}
          </ThemedText>
        </ThemedView>

        {/* Map placeholder for live tracking */}
        <View style={styles.mapPlaceholder}>
          <ThemedText style={styles.mapText}>
            🗺️ {'\n'}
            Live Tracking Map
          </ThemedText>
          {/* TODO: Integrate react-native-maps with live bus location */}
        </View>

        {/* ETA placeholder */}
        <ThemedView style={styles.etaCard}>
          <ThemedText type="subtitle">Estimated Arrival</ThemedText>
          <ThemedText style={styles.etaTime}>15 min</ThemedText>
        </ThemedView>

        {/* Action buttons based on status */}
        <View style={styles.actions}>
          {activeJourney.status === JourneyStatus.Planned && (
            <View 
              style={styles.button}
              onTouchEnd={() => updateStatus(JourneyStatus.Boarding)}
            >
              <ThemedText style={styles.buttonText}>Board Bus</ThemedText>
            </View>
          )}
          
          {activeJourney.status === JourneyStatus.Boarding && (
            <View 
              style={styles.button}
              onTouchEnd={() => updateStatus(JourneyStatus.InProgress)}
            >
              <ThemedText style={styles.buttonText}>Start Journey</ThemedText>
            </View>
          )}
          
          {activeJourney.status === JourneyStatus.InProgress && (
            <View 
              style={styles.button}
              onTouchEnd={() => updateStatus(JourneyStatus.Completed)}
            >
              <ThemedText style={styles.buttonText}>Complete Journey</ThemedText>
            </View>
          )}

          <View 
            style={[styles.button, styles.cancelButton]}
            onTouchEnd={() => endJourney()}
          >
            <ThemedText style={styles.buttonText}>Cancel</ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
  },
  statusBadge: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  routeCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    marginBottom: 16,
    alignItems: 'center',
  },
  routeTitle: {
    textAlign: 'center',
  },
  routeArrow: {
    fontSize: 24,
    marginVertical: 8,
  },
  mapPlaceholder: {
    height: 300,
    backgroundColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapText: {
    fontSize: 20,
    textAlign: 'center',
    opacity: 0.6,
  },
  etaCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    marginBottom: 24,
    alignItems: 'center',
  },
  etaTime: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#d9534f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
