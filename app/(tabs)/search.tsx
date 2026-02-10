import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Href, router } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function SearchScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Search Journey
        </ThemedText>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor="#999"
          />
        </View>

        {/* Recent searches */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Searches
          </ThemedText>
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              No recent searches yet
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Saved locations */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Saved Locations
          </ThemedText>
          <ThemedView style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              + Add Location
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Demo button to open modal */}
        <View 
          style={styles.button}
          onTouchEnd={() => router.push('/(modals)/journey-details' as Href)}
        >
          <ThemedText style={styles.buttonText}>
            View Sample Journey
          </ThemedText>
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
  searchContainer: {
    marginBottom: 24,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  emptyStateText: {
    textAlign: 'center',
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
