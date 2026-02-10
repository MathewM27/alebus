import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

export default function SettingsScreen() {
  const { userId, email, logout } = useAuth();
  const [arrivalAlerts, setArrivalAlerts] = useState(true);
  const [delayNotifications, setDelayNotifications] = useState(true);
  const [promotions, setPromotions] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(boot)/register' as Href);
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Settings
        </ThemedText>

        {/* User info section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account
          </ThemedText>
          <ThemedView style={styles.card}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <ThemedText style={styles.value}>{email}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>User ID</ThemedText>
              <ThemedText style={[styles.value, styles.userId]}>
                {userId?.substring(0, 8)}...
              </ThemedText>
            </View>
          </ThemedView>
        </ThemedView>

        {/* Notification preferences */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notifications
          </ThemedText>
          <ThemedView style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Arrival Alerts</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Get notified when your bus is arriving
                </ThemedText>
              </View>
              <Switch
                value={arrivalAlerts}
                onValueChange={setArrivalAlerts}
                trackColor={{ false: '#ccc', true: '#0a7ea4' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Delay Notifications</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Receive alerts about delays on your route
                </ThemedText>
              </View>
              <Switch
                value={delayNotifications}
                onValueChange={setDelayNotifications}
                trackColor={{ false: '#ccc', true: '#0a7ea4' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={styles.settingLabel}>Promotions</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Get updates about new features and offers
                </ThemedText>
              </View>
              <Switch
                value={promotions}
                onValueChange={setPromotions}
                trackColor={{ false: '#ccc', true: '#0a7ea4' }}
              />
            </View>
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

        {/* App info */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>
          <ThemedView style={styles.card}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Version</ThemedText>
              <ThemedText style={styles.value}>
                {Constants.expoConfig?.version || '1.0.0'}
              </ThemedText>
            </View>
          </ThemedView>
        </ThemedView>

        {/* Logout button */}
        <View 
          style={styles.logoutButton}
          onTouchEnd={handleLogout}
        >
          <ThemedText style={styles.logoutButtonText}>
            Logout
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
    paddingBottom: 40,
  },
  title: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    opacity: 0.7,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  userId: {
    fontFamily: 'monospace',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
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
  logoutButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
