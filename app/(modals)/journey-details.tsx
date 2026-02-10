import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useJourney } from '@/contexts/JourneyContext';
import { JourneyStatus } from '@/types/Journey';
import { Href, router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function JourneyDetailsModal() {
  const { startJourney } = useJourney();

  const handleSelectRoute = (routeIndex: number) => {
    // Create a sample journey
    const sampleJourney = {
      id: `journey-${Date.now()}`,
      status: JourneyStatus.Planned,
      origin: {
        id: 'stop-1',
        name: 'Downtown Station',
        code: 'DS-001',
        location: { lat: 0, lng: 0 },
      },
      destination: {
        id: 'stop-2',
        name: 'Airport Terminal',
        code: 'AT-100',
        location: { lat: 0, lng: 0 },
      },
      legs: [
        {
          routeId: `route-${routeIndex}`,
          boardStop: {
            id: 'stop-1',
            name: 'Downtown Station',
            code: 'DS-001',
            location: { lat: 0, lng: 0 },
          },
          alightStop: {
            id: 'stop-2',
            name: 'Airport Terminal',
            code: 'AT-100',
            location: { lat: 0, lng: 0 },
          },
          estimatedDuration: 30,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    startJourney(sampleJourney);
    router.dismiss();
    router.push('/(tabs)/journey' as Href);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Journey Options',
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Origin/Destination summary */}
          <ThemedView style={styles.summaryCard}>
            <ThemedText type="subtitle">Downtown Station</ThemedText>
            <ThemedText style={styles.arrow}>↓</ThemedText>
            <ThemedText type="subtitle">Airport Terminal</ThemedText>
          </ThemedView>

          {/* Route options */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Available Routes
          </ThemedText>

          {/* Route 1 */}
          <ThemedView style={styles.routeCard}>
            <View style={styles.routeHeader}>
              <ThemedText style={styles.routeNumber}>Bus 42</ThemedText>
              <ThemedText style={styles.routeName}>Express Route</ThemedText>
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Stops</ThemedText>
                <ThemedText style={styles.detailValue}>8</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Duration</ThemedText>
                <ThemedText style={styles.detailValue}>25 min</ThemedText>
              </View>
            </View>
            <View style={styles.routeTiming}>
              <ThemedText style={styles.timingText}>Departs: 2:15 PM</ThemedText>
              <ThemedText style={styles.timingText}>Arrives: 2:40 PM</ThemedText>
            </View>
            <View 
              style={styles.selectButton}
              onTouchEnd={() => handleSelectRoute(1)}
            >
              <ThemedText style={styles.selectButtonText}>Select</ThemedText>
            </View>
          </ThemedView>

          {/* Route 2 */}
          <ThemedView style={styles.routeCard}>
            <View style={styles.routeHeader}>
              <ThemedText style={styles.routeNumber}>Bus 17</ThemedText>
              <ThemedText style={styles.routeName}>Standard Route</ThemedText>
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Stops</ThemedText>
                <ThemedText style={styles.detailValue}>12</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Duration</ThemedText>
                <ThemedText style={styles.detailValue}>35 min</ThemedText>
              </View>
            </View>
            <View style={styles.routeTiming}>
              <ThemedText style={styles.timingText}>Departs: 2:20 PM</ThemedText>
              <ThemedText style={styles.timingText}>Arrives: 2:55 PM</ThemedText>
            </View>
            <View 
              style={styles.selectButton}
              onTouchEnd={() => handleSelectRoute(2)}
            >
              <ThemedText style={styles.selectButtonText}>Select</ThemedText>
            </View>
          </ThemedView>

          {/* Route 3 */}
          <ThemedView style={styles.routeCard}>
            <View style={styles.routeHeader}>
              <ThemedText style={styles.routeNumber}>Bus 9</ThemedText>
              <ThemedText style={styles.routeName}>Scenic Route</ThemedText>
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Stops</ThemedText>
                <ThemedText style={styles.detailValue}>15</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText style={styles.detailLabel}>Duration</ThemedText>
                <ThemedText style={styles.detailValue}>40 min</ThemedText>
              </View>
            </View>
            <View style={styles.routeTiming}>
              <ThemedText style={styles.timingText}>Departs: 2:30 PM</ThemedText>
              <ThemedText style={styles.timingText}>Arrives: 3:10 PM</ThemedText>
            </View>
            <View 
              style={styles.selectButton}
              onTouchEnd={() => handleSelectRoute(3)}
            >
              <ThemedText style={styles.selectButtonText}>Select</ThemedText>
            </View>
          </ThemedView>
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
  summaryCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    alignItems: 'center',
    marginBottom: 24,
  },
  arrow: {
    fontSize: 24,
    marginVertical: 8,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  routeCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    marginBottom: 16,
  },
  routeHeader: {
    marginBottom: 12,
  },
  routeNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  routeName: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 4,
  },
  routeDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  routeTiming: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  timingText: {
    fontSize: 14,
  },
  selectButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
