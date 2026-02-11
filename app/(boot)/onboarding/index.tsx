import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Alebus brand colors
const BLACK = '#000000';
const ACCENT = '#c1ec72';

export default function OnboardingWelcome() {
  const handleContinue = () => {
    router.push('/(boot)/onboarding/features' as Href);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/AlebusLogo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        
        <Text style={styles.title}>Welcome to Alebus</Text>
      </View>

      <View style={styles.footer}>
        <OnboardingProgress currentStep={0} totalSteps={3} />
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
    paddingHorizontal: 40,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
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
