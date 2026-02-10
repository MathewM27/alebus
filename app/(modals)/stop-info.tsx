import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Href, router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function StopInfoModal() {
  const handlePlanFromHere = () => {
    router.dismiss();
    router.push('/(tabs)/search' as Href);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Stop Details',
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Stop info */}
          <ThemedView style={styles.infoCard}>
            <ThemedText type="title" style={styles.stopName}>
              Downtown Station
            </ThemedText>
            <ThemedText style={styles.stopCode}>Stop Code: DS-001</ThemedText>
            <ThemedText style={styles.address}>
              123 Main Street, City Center
            </ThemedText>
          </ThemedView>

          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <ThemedText style={styles.mapText}>
              🗺️ {'\n'}
              Stop Location Map
            </ThemedText>
            {/* TODO: Add map snippet showing stop location */}
          </View>

          {/* Upcoming arrivals */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Upcoming Arrivals
            </ThemedText>
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>
                No upcoming arrivals at this time
              </ThemedText>
              <ThemedText style={styles.emptyStateSubtext}>
                Check back later or plan your journey
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Action button */}
          <View 
            style={styles.button}
            onTouchEnd={handlePlanFromHere}
          >
            <ThemedText style={styles.buttonText}>
              Plan Journey from Here
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    marginBottom: 16,
  },
  stopName: {
    marginBottom: 8,
  },
  stopCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    opacity: 0.7,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapText: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
