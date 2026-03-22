import * as storage from "@/utils/storage";
import { Image } from "expo-image";
import { Href, router, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PillButton } from "@/components/auth/PillButton";

// Onboarding steps data
const ONBOARDING_STEPS = [
  {
    title: "Welcome to Alebus",
    description:
      "Live bus tracking and smarter routes—so you spend less time waiting.",
  },
  {
    title: "Avoid the wait at the bus stop",
    description: "Get live location of nearest bus to your stop.",
  },
  {
    title: "Get notified of bus approaching",
    description: "Make informed move to the bus stop when bus is closer.",
  },
  {
    title: "Smart recommendation",
    description: "Get ETA of the right bus and get moving.",
  },
];

// Color themes for each step (circle colors)
const COLOR_THEMES = [
  { primary: "#454540", accent: "#c1ec72" }, // Welcome - original
  { primary: "#3a4a3a", accent: "#7dd87d" }, // Live location - green tint
  { primary: "#4a3a4a", accent: "#d87dd8" }, // Notification - purple tint
  { primary: "#3a3a4a", accent: "#7dd8d8" }, // Smart - cyan tint
];

const STEP_DURATION = 2500; // Time each step is shown (ms)
const FADE_DURATION = 400; // Fade animation duration (ms)

export default function Onboarding() {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [currentStep, setCurrentStep] = useState(0);
  const [showButton, setShowButton] = useState(false);

  // Check if navigation is ready
  const rootNavigationState = useRootNavigationState();
  const navigationReady = rootNavigationState?.key != null;

  // Animation values
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textTranslateY = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;

  // Circle color animations
  const colorProgress = useRef(new Animated.Value(0)).current;

  const handleGetStarted = useCallback(async () => {
    if (!navigationReady) return;
    await storage.setOnboardingComplete(true);
    // Small delay to ensure navigation is stable
    setTimeout(() => {
      router.replace("/(auth)/welcome" as Href);
    }, 100);
  }, [navigationReady]);

  // Auto-advance through steps
  useEffect(() => {
    if (currentStep >= ONBOARDING_STEPS.length - 1) {
      // Last step - show button after a delay
      const buttonTimer = setTimeout(() => {
        setShowButton(true);
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }),
          Animated.spring(buttonTranslateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
        ]).start();
      }, 800);
      return () => clearTimeout(buttonTimer);
    }

    const timer = setTimeout(() => {
      // Fade out current text
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: -10,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change step
        setCurrentStep((prev) => prev + 1);

        // Animate color transition
        Animated.timing(colorProgress, {
          toValue: currentStep + 1,
          duration: FADE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }).start();

        // Reset and fade in new text
        textTranslateY.setValue(10);
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }),
          Animated.spring(textTranslateY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, STEP_DURATION);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Interpolate circle colors based on current step
  const getInterpolatedColor = (
    colorType: "primary" | "accent",
    defaultIndex: number,
  ) => {
    return colorProgress.interpolate({
      inputRange: COLOR_THEMES.map((_, i) => i),
      outputRange: COLOR_THEMES.map((theme) => theme[colorType]),
      extrapolate: "clamp",
    });
  };

  const primaryColor = getInterpolatedColor("primary", 0);
  const accentColor = getInterpolatedColor("accent", 0);

  const currentContent = ONBOARDING_STEPS[currentStep];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Decorative Header Area */}
      <View style={[styles.headerArea, { height: screenHeight * 0.5 }]}>
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <View style={styles.decorativeContainer}>
            {/* Large circle - top right */}
            <Animated.View
              style={[
                styles.decorativeCircle,
                {
                  backgroundColor: primaryColor,
                  right: -screenWidth * 0.2,
                  top: screenHeight * 0.05,
                  width: screenWidth * 0.6,
                  height: screenWidth * 0.6,
                },
              ]}
            />
            {/* Medium circle - center left */}
            <Animated.View
              style={[
                styles.decorativeCircle,
                {
                  backgroundColor: primaryColor,
                  left: -screenWidth * 0.15,
                  top: screenHeight * 0.18,
                  width: screenWidth * 0.45,
                  height: screenWidth * 0.45,
                },
              ]}
            />
            {/* Small circle - bottom right */}
            <Animated.View
              style={[
                styles.decorativeCircle,
                {
                  backgroundColor: accentColor,
                  right: screenWidth * 0.1,
                  top: screenHeight * 0.28,
                  width: screenWidth * 0.2,
                  height: screenWidth * 0.2,
                },
              ]}
            />
            {/* Small accent circle */}
            <Animated.View
              style={[
                styles.decorativeCircle,
                {
                  backgroundColor: accentColor,
                  left: screenWidth * 0.2,
                  top: screenHeight * 0.08,
                  width: screenWidth * 0.12,
                  height: screenWidth * 0.12,
                },
              ]}
            />
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.sheet, { top: screenHeight * 0.38 }]}>
        <View style={styles.sheetContent}>
          {/* Logo */}
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />

          {/* Animated Title */}
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            {currentContent.title}
          </Animated.Text>

          {/* Animated Subtitle */}
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            {currentContent.description}
          </Animated.Text>
        </View>
      </View>

      {/* Bottom Controls */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomControlsContainer}>
        {/* Step Indicators - visible until button appears */}
        {!showButton && (
          <View style={styles.dotsContainer}>
            {ONBOARDING_STEPS.map((_, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              if (isActive) {
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      styles.dotActive,
                      { backgroundColor: accentColor },
                    ]}
                  />
                );
              } else if (isCompleted) {
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: accentColor,
                        opacity: 0.5,
                      },
                    ]}
                  />
                );
              } else {
                return (
                  <View key={index} style={[styles.dot, styles.dotInactive]} />
                );
              }
            })}
          </View>
        )}

        {/* Button - appears after last step */}
        {showButton && (
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonOpacity,
                transform: [{ translateY: buttonTranslateY }],
              },
            ]}
          >
            <PillButton
              title="Ale Ale"
              variant="primary"
              onPress={handleGetStarted}
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  headerArea: {
    width: "100%",
    overflow: "hidden",
  },
  headerSafeArea: {
    flex: 1,
  },
  decorativeContainer: {
    flex: 1,
    position: "relative",
  },
  decorativeCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0E0E10",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 100,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    minHeight: 64,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  bottomControlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 16,
  },
  buttonContainer: {
    width: "100%",
  },
});
