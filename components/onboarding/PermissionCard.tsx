import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Alebus brand colors
const ACCENT = '#c1ec72';
const BLACK = '#000000';

export type PermissionStatus = 'not-requested' | 'granted' | 'denied';

interface PermissionCardProps {
  icon: string;
  title: string;
  status: PermissionStatus;
  onPress: () => void;
  required?: boolean;
}

export function PermissionCard({
  icon,
  title,
  status,
  onPress,
  required = false,
}: PermissionCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getStatusColor = () => {
    switch (status) {
      case 'granted':
        return ACCENT;
      case 'denied':
        return '#EF4444';
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Denied';
      default:
        return 'Tap to enable';
    }
  };

  const isGranted = status === 'granted';

  return (
    <Pressable
      onPress={!isGranted ? handlePress : undefined}
      disabled={isGranted}
      style={({ pressed }) => [
        styles.card,
        pressed && !isGranted && styles.pressed,
        isGranted && styles.cardGranted,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.iconContainer, isGranted && styles.iconContainerGranted]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {required && <Text style={styles.required}>Required</Text>}
          </View>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
        {!isGranted && (
          <View style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </View>
        )}
        {isGranted && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
  },
  cardGranted: {
    backgroundColor: 'rgba(193, 236, 114, 0.12)',
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerGranted: {
    backgroundColor: 'rgba(193, 236, 114, 0.2)',
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  required: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    backgroundColor: 'rgba(193, 236, 114, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  status: {
    fontSize: 14,
    marginTop: 2,
  },
  arrow: {
    marginLeft: 12,
  },
  arrowText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '300',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: '700',
    color: BLACK,
  },
});
