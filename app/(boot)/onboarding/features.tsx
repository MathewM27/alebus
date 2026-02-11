import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Alebus brand colors
const BLACK = '#000000';

export default function OnboardingFeatures() {
  const handleContinue = () => {
    router.push('/(boot)/onboarding/permissions' as Href);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Image
          source={require('@/assets/images/board1.png')}
          style={styles.image}
          contentFit="contain"
        />

        <Text style={styles.title}>Real-time bus tracking</Text>
        <Text style={styles.subtitle}>Avoid the waits at the stop</Text>
      </View>

      <View style={styles.footer}>
        <OnboardingProgress currentStep={1} totalSteps={3} />
        <View style={styles.buttonContainer}>
          <OnboardingButton onPress={handleContinue} title="Continue" variant="primary" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  image: {
    width: 280,
    height: 280,
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    gap: 32,
  },
  buttonContainer: {
    gap: 12,
  },
});
