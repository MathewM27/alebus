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
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

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

/* ── snap points (same as Home) ── */
const SNAP_LOW = 140;
const SNAP_MID = SCREEN_H * 0.5;
const SNAP_HIGH = SCREEN_H * 0.9;

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
        distanceMeters: 420,
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

/* ── same Leaflet HTML (reused from Home) ── */
const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #aadaff; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    .bus-marker {
      width: 24px; height: 24px; border-radius: 50%;
      background: ${ACCENT}; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.8);
      border: 2px solid #fff;
    }
    .bus-marker-inner { width: 8px; height: 8px; border-radius: 50%; background: #000; }
    .leaflet-popup-content-wrapper {
      background: #ffffff; color: #333; border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .leaflet-popup-tip { background: #ffffff; }
    .leaflet-popup-content { margin: 8px 12px; font-size: 13px; font-family: system-ui; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [-20.348404, 57.552152],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, subdomains: 'abc'
    }).addTo(map);
    var markers = ${JSON.stringify(BUS_MARKERS)};
    markers.forEach(function(m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="bus-marker"><div class="bus-marker-inner"></div></div>',
        iconSize: [24, 24], iconAnchor: [12, 12]
      });
      L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(m.title);
    });
  <\/script>
</body>
</html>
`;

/* ─────────────────────────────────────────────────
   JourneyScreen
   ───────────────────────────────────────────────── */

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const { activeJourney } = useJourney();

  /* ── Preview mode for testing active journey UI ── */
  const [showPreview, setShowPreview] = useState(true);

  /* ── Shortcuts state ── */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);

  /* ── shared values (same pattern as Home) ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);

  const snapTo = useCallback((target: number) => {
    "worklet";
    translateY.value = withSpring(target, SPRING_CFG);
  }, []);

  /* ── Pan gesture ── */
  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(
        TY_HIGH,
        Math.min(ctx.value + e.translationY, TY_LOW),
      );
    })
    .onEnd((e) => {
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;

      if (Math.abs(v) > FLING) {
        if (v > 0) {
          snapTo(cur < TY_MID ? TY_MID : TY_LOW);
        } else {
          snapTo(cur > TY_MID ? TY_MID : TY_HIGH);
        }
        return;
      }

      const snaps = [TY_HIGH, TY_MID, TY_LOW];
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
    // TODO: End active journey tracking and clean up
  };

  // Determine if we're showing journey recommendations
  const displayedRecommendations = showPreview
    ? MOCK_JOURNEY_RECOMMENDATIONS
    : null; // TODO: use actual journey tracking data from context
  const hasActiveJourney =
    displayedRecommendations && displayedRecommendations.length > 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      {/* Map */}
      <WebView
        source={{ html: LEAFLET_HTML }}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <View style={styles.mapLoading} />}
      />
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Journeys</Text>
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
            <Text style={styles.headerSubtitle}>
              Track and manage your trips
            </Text>
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
              {/* ── Active Journey Section ── */}
              <ActiveJourneySection
                journeyRecommendations={displayedRecommendations}
                onEndTracking={handleEndTracking}
              />

              {/* Spacer when active journey is shown */}
              {hasActiveJourney && <View style={{ height: 40 }} />}

              {/* ── Shortcuts Section ── */}
              <ShortcutsSection
                shortcuts={shortcuts}
                onShortcutsChange={setShortcuts}
                onStartJourney={handleStartJourney}
                onEditStart={handleEditStart}
              />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
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
  },
  previewToggleText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },

  expandedWrap: { flex: 1, marginTop: 8 },
});
