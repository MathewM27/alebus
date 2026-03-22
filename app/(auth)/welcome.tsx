import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthSheet } from '@/components/auth/AuthSheet';
import { PillButton } from '@/components/auth/PillButton';

export default function Welcome() {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  
  const handleSignIn = () => {
    router.push('/(auth)/signin' as Href);
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup' as Href);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Decorative Header Area */}
      <View style={[styles.headerArea, { height: screenHeight * 0.5 }]}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          {/* Decorative elements */}
          <View style={styles.decorativeContainer}>
            {/* Large circle - top right */}
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleOne,
                { 
                  right: -screenWidth * 0.2,
                  top: screenHeight * 0.05,
                  width: screenWidth * 0.6,
                  height: screenWidth * 0.6,
                }
              ]} 
            />
            {/* Medium circle - center left */}
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleTwo,
                {
                  left: -screenWidth * 0.15,
                  top: screenHeight * 0.18,
                  width: screenWidth * 0.45,
                  height: screenWidth * 0.45,
                }
              ]} 
            />
            {/* Small circle - bottom right */}
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleThree,
                {
                  right: screenWidth * 0.1,
                  top: screenHeight * 0.28,
                  width: screenWidth * 0.2,
                  height: screenWidth * 0.2,
                }
              ]} 
            />
            {/* Small accent circle */}
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleAccent,
                {
                  left: screenWidth * 0.2,
                  top: screenHeight * 0.08,
                  width: screenWidth * 0.12,
                  height: screenWidth * 0.12,
                }
              ]} 
            />
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom Sheet */}
      <AuthSheet>
        <View style={styles.sheetContent}>
          {/* Logo */}
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
          
          {/* Title */}
          <Text style={styles.title}>
            Welcome to Alebus
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Live bus tracking and smarter routes—so you spend less time waiting.
          </Text>
        </View>
      </AuthSheet>

      {/* Bottom Controls */}
      <SafeAreaView edges={['bottom']} style={styles.bottomControlsContainer}>
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <PillButton
              title="Sign in"
              variant="secondary"
              onPress={handleSignIn}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <PillButton
              title="Sign up"
              variant="primary"
              onPress={handleSignUp}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerArea: {
    width: '100%',
    overflow: 'hidden',
  },
  headerSafeArea: {
    flex: 1,
  },
  decorativeContainer: {
    flex: 1,
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleOne: {
    backgroundColor: '#454540',
  },
  circleTwo: {
    backgroundColor: '#454540',
  },
  circleThree: {
    backgroundColor: '#c1ec72',
    
  },
  circleAccent: {
    backgroundColor: '#c1ec72',
    
  },
  sheetContent: {
    alignItems: 'center',
    paddingBottom: 80, // Space for buttons at bottom
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottomControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});
