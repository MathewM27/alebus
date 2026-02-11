import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

interface SplashOverlayProps {
  /** When true, the overlay begins fading out and then unmounts. */
  isReady: boolean;
}

/**
 * A lightweight overlay matching the native splash screen background.
 *
 * It sits on top of the React tree (absoluteFill + zIndex) so that
 * when the native splash hides via hideAsync(), there is no visual
 * gap or flicker. Once `isReady` becomes true, the overlay fades
 * out over 300 ms and then unmounts itself.
 *
 * This is NOT a route — it's a purely visual bridge rendered inside
 * the root layout so it persists across navigations.
 */
export function SplashOverlay({ isReady }: SplashOverlayProps) {
  const colorScheme = useColorScheme();
  const opacity = useSharedValue(1);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    if (isReady) {
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setUnmounted)(true);
        }
      });
    }
  }, [isReady]);

  // Must match native splash backgrounds from app.json exactly.
  const backgroundColor = colorScheme === 'dark' ? '#151718' : '#ffffff';

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // All hooks called above — safe to early-return now.
  if (unmounted) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
  },
});
