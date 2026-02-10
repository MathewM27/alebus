import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { createUser } from '@/services/api/users';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

// Simple UUID v4 generator compatible with React Native/Expo Go
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Try to call the backend API first
      try {
        const response = await createUser(email);
        await login(response.userId, response.email);
        router.replace('/(tabs)' as Href);
      } catch (apiError: any) {
        // API failed, fallback to UUID generation
        console.log('API call failed, using UUID fallback:', apiError.message);
        const fallbackUserId = generateUUID();
        await login(fallbackUserId, email);
        router.replace('/(tabs)' as Href);
        
        // Show a subtle message that we're offline
        Alert.alert(
          'Offline Mode',
          'You\'re registered locally. Your account will sync when connection is restored.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'An error occurred during registration. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Create Your Account
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter your email to get started with Alebus
        </ThemedText>

        <View style={styles.form}>
          <ThemedText style={styles.label}>Email Address</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        <ThemedText style={styles.note}>
          No password required for now. We'll add full authentication later.
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <View 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onTouchEnd={isLoading ? undefined : handleRegister}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Registering...' : 'Register'}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    opacity: 0.7,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  footer: {
    padding: 32,
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
