import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Home
        </ThemedText>

        {/* Map placeholder */}
        <View style={styles.mapPlaceholder}>
          <ThemedText style={styles.mapText}>
            🗺️ {'\n'}
            Map View Coming Soon
          </ThemedText>
          {/* TODO: Integrate react-native-maps */}
        </View>

        {/* Nearby stops section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Nearby Stops
          </ThemedText>
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              Pull down to refresh nearby stops
            </ThemedText>
          </ThemedView>
        </ThemedView>
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
  mapPlaceholder: {
    height: 400,
    backgroundColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mapText: {
    fontSize: 24,
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
    opacity: 0.7,
  },
});
