import { ReactNode, useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthSheetProps {
  children: ReactNode;
}

export function AuthSheet({ children }: AuthSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Sheet starts below the header area (roughly 45% from top)
  const sheetTopOffset = screenHeight * 0.38;

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

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          top: sheetTopOffset,
          transform: [{ translateY }],
          opacity,
          // Add extra padding at the bottom for safe area
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 32) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0E0E10',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    // Android elevation
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
});
