import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    ViewStyle
} from 'react-native';

type SocialProvider = 'google' | 'apple' | 'facebook';
type ButtonVariant = 'primary' | 'secondary' | 'icon-only';

interface SocialLoginButtonProps {
  provider: SocialProvider;
  variant?: ButtonVariant;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const PROVIDER_CONFIG: Record<SocialProvider, { 
  icon: string; 
  label: string;
  iconColor: string;
}> = {
  google: {
    icon: 'google',
    label: 'Continue with Google',
    iconColor: '#FFFFFF',
  },
  apple: {
    icon: 'apple',
    label: 'Continue with Apple',
    iconColor: '#FFFFFF',
  },
  facebook: {
    icon: 'facebook',
    label: 'Continue with Facebook',
    iconColor: '#FFFFFF',
  },
};

export function SocialLoginButton({
  provider,
  variant = 'secondary',
  onPress,
  disabled = false,
  style,
}: SocialLoginButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = PROVIDER_CONFIG[provider];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // Hide Apple button on Android
  if (provider === 'apple' && Platform.OS !== 'ios') {
    return null;
  }

  const isIconOnly = variant === 'icon-only';
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={config.label}
    >
      <Animated.View
        style={[
          isIconOnly ? styles.iconOnlyButton : styles.button,
          isPrimary && styles.primaryButton,
          disabled && styles.disabledButton,
          { transform: [{ scale: scaleAnim }] },
          style,
        ]}
      >
        <MaterialCommunityIcons
          name={config.icon as any}
          size={isIconOnly ? 24 : 22}
          color={config.iconColor}
        />
        {!isIconOnly && (
          <Text style={[styles.buttonText, isPrimary && styles.primaryText]}>
            {config.label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconOnlyButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryText: {
    color: '#FFFFFF',
  },
});
