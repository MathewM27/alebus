import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import {
  PermissionCard,
  PermissionStatus,
} from '@/components/onboarding/PermissionCard';
import * as storage from '@/utils/storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

export default function OnboardingPermissions() {
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('not-requested');
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('not-requested');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);

  useEffect(() => {
    // Detect if running in Expo Go
    const appOwnership = Constants.appOwnership;
    setIsExpoGo(appOwnership === 'expo');
    checkCurrentPermissions();
  }, []);

  const checkCurrentPermissions = async () => {
    try {
      // Check location permission
      const locationResult = await Location.getForegroundPermissionsAsync();
      if (locationResult.granted) {
        setLocationStatus('granted');
      } else if (locationResult.canAskAgain === false) {
        setLocationStatus('denied');
      }

      // Check notification permission - only if not in Expo Go
      if (Constants.appOwnership !== 'expo') {
        try {
          const Notifications = await import('expo-notifications');
          const notificationResult = await Notifications.getPermissionsAsync();
          if (notificationResult.granted) {
            setNotificationStatus('granted');
          } else if (notificationResult.canAskAgain === false) {
            setNotificationStatus('denied');
          }
        } catch (error) {
          console.log('Notifications not available in Expo Go');
          // In Expo Go, mark as granted to allow progression
          setNotificationStatus('granted');
        }
      } else {
        // In Expo Go, show as granted (will work in dev build)
        setNotificationStatus('granted');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.granted) {
        setLocationStatus('granted');
      } else if (result.canAskAgain === false) {
        setLocationStatus('denied');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  const requestNotificationPermission = async () => {
    if (isExpoGo) {
      Alert.alert(
        'Expo Go Limitation',
        'Push notifications are not available in Expo Go. This feature will work when you build your app with a development build or production build.',
        [{ text: 'OK', onPress: () => setNotificationStatus('granted') }]
      );
      return;
    }

    try {
      const Notifications = await import('expo-notifications');
      const result = await Notifications.requestPermissionsAsync();
      if (result.granted) {
        setNotificationStatus('granted');
      } else if (result.canAskAgain === false) {
        setNotificationStatus('denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const handleLocationPress = async () => {
    if (locationStatus === 'denied') {
      openSettings();
    } else if (locationStatus === 'not-requested') {
      await requestLocationPermission();
    }
  };

  const handleNotificationPress = async () => {
    if (notificationStatus === 'denied') {
      openSettings();
    } else if (notificationStatus === 'not-requested') {
      await requestNotificationPermission();
    } else if (notificationStatus === 'granted' && isExpoGo) {
      // Show info about Expo Go limitation
      Alert.alert(
        'Expo Go',
        'Push notifications require a development build. This feature is simulated in Expo Go for testing purposes.',
        [{ text: 'OK' }]
      );
    }
  };

  const openSettings = () => {
    Alert.alert(
      'Open Settings',
      'To grant permissions, please open your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const handleComplete = async () => {
    if (locationStatus !== 'granted') {
      Alert.alert('Location Required', 'Location permission is required to use Alebus.');
      return;
    }

    setIsLoading(true);
    try {
      await storage.setOnboardingComplete(true);
      router.replace('/(boot)/register' as Href);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const canComplete = locationStatus === 'granted';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Text style={styles.title}>Final Step</Text>
        <Text style={styles.subtitle}>Enable access for the best experience</Text>

        <View style={styles.permissions}>
          <PermissionCard
            icon="📍"
            title="Location"
            status={locationStatus}
            onPress={handleLocationPress}
            required
          />

          <PermissionCard
            icon="🔔"
            title="Notifications"
            status={notificationStatus}
            onPress={handleNotificationPress}
          />
        </View>

        {isExpoGo && (
          <Text style={styles.note}>
            Notifications require a development build
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <OnboardingProgress currentStep={2} totalSteps={3} />
        <View style={styles.buttonContainer}>
          <OnboardingButton
            onPress={handleComplete}
            title="Get Started"
            variant="primary"
            disabled={!canComplete}
            loading={isLoading}
          />
          {!canComplete && (
            <Text style={styles.hint}>Enable location to continue</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 48,
  },
  permissions: {
    gap: 16,
  },
  note: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    gap: 32,
  },
  buttonContainer: {
    gap: 12,
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
