import { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from 'react-native';

interface AuthInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function AuthInput({
  label,
  error,
  style,
  ...props
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, !label && styles.containerNoLabel]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor="rgba(255, 255, 255, 0.4)"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  containerNoLabel: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#c1ec72',
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 6,
  },
});
