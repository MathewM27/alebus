import 'react-native-get-random-values'; // must be first — polyfills crypto.getRandomValues for PKCE + LargeSecureStore
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/contexts/AuthContext";
import { JourneyProvider } from "@/contexts/JourneyContext";
import { MapThemeProvider } from "@/contexts/MapThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { bootReadyPromise } from "@/utils/boot";

// Prevent native splash from auto-hiding on startup.
// Module-scope call runs exactly once; .catch() silences harmless
// warnings during fast-refresh / dev reload double-mount.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Configure the native splash to fade out smoothly when hide() is called.
// duration: how long the fade-out lasts (ms). fade: opt-in on iOS.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

/** Minimum time (ms) the splash stays visible for branding. */
const MIN_SPLASH_MS = 800;


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      const minDelay = new Promise<void>((resolve) =>
        setTimeout(resolve, MIN_SPLASH_MS),
      );

      // Wait until BOTH conditions are true:
      //  1. Boot checks finished (storage reads + redirect decision), AND
      //  2. Minimum branding hold elapsed (so the splash feels intentional).
      await Promise.all([bootReadyPromise, minDelay]);

      setIsReady(true);
    }

    prepare();
  }, []);

  // Hide the native splash once app is ready.
  // SplashScreen.setOptions above ensures it fades out over 1000ms
  // rather than disappearing instantly.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <MapThemeProvider>
          <AuthProvider>
            <JourneyProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(boot)" />
                <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(modals)" />
              </Stack>
              <StatusBar style="auto" />
            </JourneyProvider>
          </AuthProvider>
        </MapThemeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
