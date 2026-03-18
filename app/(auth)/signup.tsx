import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Required for OAuth on Android — completes the auth session when the browser
// redirects back to the app. Must be called at module level, not inside a component.
WebBrowser.maybeCompleteAuthSession();
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthInput } from '@/components/auth/AuthInput';
import { PillButton } from '@/components/auth/PillButton';
import { SocialLoginButton } from '@/components/auth/SocialLoginButton';

export default function SignUp() {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  // Sheet animation
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sheetTopOffset = screenHeight * 0.22;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const validateForm = () => {
    const newErrors: { fullName?: string; email?: string } = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendMagicLink = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'alebus://callback',
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      setMagicLinkSent(true);
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      setErrors({ email: error?.message || 'Failed to send magic link. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    if (provider !== 'google') return;

    setIsLoading(true);
    try {
      const redirectUrl = Linking.createURL('callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const code = parsed.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setErrors({ email: err?.message || 'Google sign-in failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin' as Href);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Decorative Header Area */}
      <View style={[styles.headerArea, { height: screenHeight * 0.35 }]}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          {/* Back Button */}
          <Pressable 
            onPress={handleBack} 
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFFFFF" />
          </Pressable>
          
          {/* Decorative elements */}
          <View style={styles.decorativeContainer}>
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleOne,
                { 
                  right: -screenWidth * 0.15,
                  top: screenHeight * 0.02,
                  width: screenWidth * 0.5,
                  height: screenWidth * 0.5,
                }
              ]} 
            />
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleTwo,
                {
                  left: -screenWidth * 0.1,
                  top: screenHeight * 0.12,
                  width: screenWidth * 0.35,
                  height: screenWidth * 0.35,
                }
              ]} 
            />
            <View 
              style={[
                styles.decorativeCircle,
                styles.circleAccent,
                {
                  right: screenWidth * 0.15,
                  top: screenHeight * 0.18,
                  width: screenWidth * 0.15,
                  height: screenWidth * 0.15,
                }
              ]} 
            />
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom Sheet */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              top: sheetTopOffset,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
            {magicLinkSent ? (
              // Success State
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <MaterialCommunityIcons name="email-check-outline" size={48} color="#c1ec72" />
                </View>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>
                  We've sent a magic link to {email}. Click the link to continue.
                </Text>
                <View style={styles.successButtonContainer}>
                  <PillButton
                    title="Back to Welcome"
                    variant="secondary"
                    onPress={() => router.replace('/(auth)/welcome' as Href)}
                  />
                </View>
              </View>
            ) : (
              // Form State
              <>
                {/* Logo */}
                <Image
                  source={require('@/assets/images/iconAle.svg')}
                  style={styles.logo}
                  contentFit="contain"
                />
                
                {/* Title */}
                <Text style={styles.title}>Create Your Account</Text>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                  <AuthInput
                    placeholder="Enter your full name"
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    error={errors.fullName}
                  />
                  
                  <AuthInput
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email}
                  />
                </View>

                {/* Primary Button */}
                <View style={styles.primaryButtonContainer}>
                  <PillButton
                    title={isLoading ? '' : 'Send Magic Link'}
                    variant="primary"
                    onPress={handleSendMagicLink}
                    disabled={isLoading}
                    style={styles.primaryButton}
                  />
                  {isLoading && (
                    <ActivityIndicator 
                      size="small" 
                      color="#000000" 
                      style={styles.loadingIndicator}
                    />
                  )}
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social Login */}
                <View style={styles.socialContainer}>
                  {/* Google */}
                  <SocialLoginButton
                    provider="google"
                    variant="icon-only"
                    onPress={() => handleSocialLogin('google')}
                  />
                  
                  {/* Apple (iOS only) */}
                  {Platform.OS === 'ios' && (
                    <SocialLoginButton
                      provider="apple"
                      variant="icon-only"
                      onPress={() => handleSocialLogin('apple')}
                    />
                  )}
                  
                  {/* Facebook */}
                  <SocialLoginButton
                    provider="facebook"
                    variant="icon-only"
                    onPress={() => handleSocialLogin('facebook')}
                  />
                </View>

                {/* Sign In Link */}
                <View style={styles.signInContainer}>
                  <Text style={styles.signInText}>
                    Already have an account?{' '}
                  </Text>
                  <Pressable onPress={handleSignIn} accessibilityRole="button">
                    <Text style={styles.signInLink}>Sign in</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
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
  backButton: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(146, 133, 133, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#000000',
    opacity: 0.2,
  },
  circleTwo: {
    backgroundColor: '#c1ec72',
  },
  circleAccent: {
    backgroundColor: '#c1ec72',

  },
  keyboardAvoid: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0E0E10',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    ...Platform.select({
      android: {
        elevation: 16,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  formContainer: {
    marginBottom: 8,
  },
  primaryButtonContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
  },
  loadingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c1ec72',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(193, 236, 114, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successButtonContainer: {
    marginTop: 32,
    width: '100%',
  },
});
