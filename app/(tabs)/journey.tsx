import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Map from "@/components/Map";

import ActiveJourneySection from "@/components/journey/ActiveJourneySection";
import ShortcutsSection, {
  DEFAULT_SHORTCUTS,
  Shortcut,
} from "@/components/journey/ShortcutsSection";
import { useJourney } from "@/contexts/JourneyContext";
import { JourneyTrackingDTO } from "@/types/JourneyTracking";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/* ───────────── theme (reused from Home) ───────────── */
const { height: SCREEN_H } = Dimensions.get("window");
const ACCENT = "#c1ec72";
const BG = "#000000";
const SHEET_BG = "#0E0E10";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

/* ── snap points ── */
const SNAP_LOW = 140;
const SNAP_MID = SCREEN_H * 0.46; // Mid snap (also max when no active journey)
const SNAP_HIGH = SCREEN_H * 0.75; // High snap (only available with active journey)

const TY_HIGH = SCREEN_H - SNAP_HIGH;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;

const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

/* ── Mock Journey Tracking Recommendations for Preview (3 options from API) ── */
const MOCK_JOURNEY_RECOMMENDATIONS: JourneyTrackingDTO[] = [
  {
    journeyId: "journey-1",
    status: 2,
    statusName: "tracking",
    originStopId: "STOP_120",
    destinationStopId: "STOP_240",
    activeBusId: "1234 AB 21",
    proximityName: "approaching",
    recommendations: [
      {
        busId: "1234 AB 21",
        operatorId: "OP_1",
        estimatedArrival: 480000, // 8 min in ms
        distanceMeters: 1420,
        direction: 1,
        isWrongDirection: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    journeyId: "journey-2",
    status: 1,
    statusName: "planned",
    originStopId: "STOP_120",
    destinationStopId: "STOP_240",
    activeBusId: "5678 CD 22",
    proximityName: "near",
    recommendations: [
      {
        busId: "5678 CD 22",
        operatorId: "OP_3",
        estimatedArrival: 780000, // 13 min in ms
        distanceMeters: 1350,
        direction: 1,
        isWrongDirection: false,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    journeyId: "journey-3",
    status: 1,
    statusName: "planned",
    originStopId: "STOP_120",
    destinationStopId: "STOP_240",
    activeBusId: "9012 EF 23",
    proximityName: "far",
    recommendations: [
      {
        busId: "9012 EF 23",
        operatorId: "OP_2",
        estimatedArrival: 1140000, // 19 min in ms
        distanceMeters: 2800,
        direction: 1,
        isWrongDirection: true, // Example of wrong direction
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/* ── same map markers as Home ── */
const BUS_MARKERS = [
  { id: "1", lat: -20.1609, lng: 57.5012, title: "Port Louis Terminal" },
  { id: "2", lat: -20.2309, lng: 57.4992, title: "Quatre Bornes Stop" },
  { id: "3", lat: -20.3168, lng: 57.5225, title: "Curepipe Central" },
  { id: "4", lat: -20.2631, lng: 57.5803, title: "Centre de Flacq" },
  { id: "5", lat: -20.4398, lng: 57.6592, title: "Mahebourg Station" },
  { id: "6", lat: -20.1, lng: 57.57, title: "Pamplemousses" },
];

/* ─────────────────────────────────────────────────
   JourneyScreen
   ───────────────────────────────────────────────── */

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const { activeJourney } = useJourney();

  /* ── Preview mode for testing active journey UI ── */
  const [showPreview, setShowPreview] = useState(false);

  /* ── Shortcuts state ── */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);

  /* ── shared values ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);
  const maxSnapY = useSharedValue(TY_MID); // Dynamic max snap based on active journey
  const overscrollGlow = useSharedValue(0); // overscroll indicator

  // Determine if we're showing journey recommendations
  // In preview mode: show mock data
  // In production: use activeJourney from context (when API is connected)
  const displayedRecommendations = showPreview
    ? MOCK_JOURNEY_RECOMMENDATIONS
    : null; // TODO: Replace with activeJourney?.recommendations when API is ready
  const hasActiveJourney =
    displayedRecommendations && displayedRecommendations.length > 0;

  // Update max snap based on active journey state
  React.useEffect(() => {
    maxSnapY.value = hasActiveJourney ? TY_HIGH : TY_MID;
  }, [hasActiveJourney, maxSnapY]);

  const snapTo = useCallback(
    (target: number) => {
      "worklet";
      translateY.value = withSpring(target, SPRING_CFG);
    },
    [translateY],
  );

  /* ── Pan gesture ── */
  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      const rawY = ctx.value + e.translationY;
      const currentMax = maxSnapY.value;
      // Track overscroll when trying to go beyond max height
      if (rawY < currentMax) {
        const overAmount = Math.min((currentMax - rawY) / 80, 1);
        overscrollGlow.value = overAmount;
      } else {
        overscrollGlow.value = withTiming(0, { duration: 150 });
      }
      translateY.value = Math.max(currentMax, Math.min(rawY, TY_LOW));
    })
    .onEnd((e) => {
      overscrollGlow.value = withTiming(0, { duration: 200 });
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;
      const maxSnap = maxSnapY.value;

      if (Math.abs(v) > FLING) {
        if (v > 0) {
          snapTo(cur < TY_MID ? TY_MID : TY_LOW);
        } else {
          snapTo(cur > TY_MID ? TY_MID : maxSnap);
        }
        return;
      }

      const snaps = [maxSnap, TY_MID, TY_LOW];
      let best = snaps[0];
      let bestD = Math.abs(cur - snaps[0]);
      for (const snap of snaps) {
        const d = Math.abs(cur - snap);
        if (d < bestD) {
          bestD = d;
          best = snap;
        }
      }
      snapTo(best);
    });

  /* ── Animated styles ── */
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: overscrollGlow.value,
  }));

  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY_MID, TY_LOW],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /* ── Handlers ── */
  const handleStartJourney = (sc: Shortcut) => {
    console.log("Start journey:", { from: sc.origin, to: sc.destination });
    // TODO: Navigate to Home with prefilled origin/destination or call startJourney
  };

  const handleEditStart = () => {
    translateY.value = withSpring(TY_MID, SPRING_CFG);
  };

  const handleEndTracking = () => {
    console.log("End tracking");
    // Clear preview to hide active journey
    setShowPreview(false);
    // Snap back to mid since we'll lose access to high snap
    translateY.value = withSpring(TY_MID, SPRING_CFG);
    // TODO: End active journey tracking in context and clean up
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      {/* Map */}
      <Map />
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerWrap}>
            <Text style={styles.headerTitle}>Journeys</Text>
            <Text style={styles.headerSubtitle}>
              Track and manage your trips
            </Text>
            {/* Preview toggle button */}
            <Pressable
              onPress={() => setShowPreview(!showPreview)}
              style={({ pressed }) => [
                styles.previewToggle,
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialCommunityIcons
                name={showPreview ? "eye" : "eye-off"}
                size={16}
                color={showPreview ? ACCENT : TEXT_SECONDARY}
              />
              <Text
                style={[
                  styles.previewToggleText,
                  { color: showPreview ? ACCENT : TEXT_SECONDARY },
                ]}
              >
                {showPreview ? "Preview ON" : "Preview OFF"}
              </Text>
            </Pressable>
          </View>

          {/* Expanded content */}
          <Animated.View style={[styles.expandedWrap, expandedOpacity]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 100,
              }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {hasActiveJourney ? (
                <>
                  {/* ── Active Journey Section (shown first when active) ── */}
                  <ActiveJourneySection
                    journeyRecommendations={displayedRecommendations}
                    onEndTracking={handleEndTracking}
                  />
                </>
              ) : (
                <>
                  {/* ── Shortcuts Section (shown first when no active journey) ── */}
                  <ShortcutsSection
                    shortcuts={shortcuts}
                    onShortcutsChange={setShortcuts}
                    onStartJourney={handleStartJourney}
                    onEditStart={handleEditStart}
                  />

                  {/* Spacer */}
                  <View style={{ height: 40 }} />

                  {/* ── No Active Journey Message (shown at bottom) ── */}
                  <ActiveJourneySection
                    journeyRecommendations={displayedRecommendations}
                    onEndTracking={handleEndTracking}
                  />
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Overscroll glow effect - positioned at actual screen bottom */}
      <Animated.View
        style={[styles.glowOverlay, glowStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", `${ACCENT}10`, `${ACCENT}40`]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>
    </GestureHandlerRootView>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  mapLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#aadaff" },

  sheetOuter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  glowOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 100,
  },
  handleArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  /* Header */
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: "center",
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  previewToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  previewToggleText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  expandedWrap: { flex: 1, marginTop: 8 },
});
