import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

/* ───────────── constants ───────────── */
const { height: SCREEN_H } = Dimensions.get("window");
const ACCENT = "#c1ec72";
const BG = "#000000";
const SHEET_BG = "#0E0E10";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

/* snap points – heights measured from the bottom of the screen */
const SNAP_LOW = 140;
const SNAP_MID = SCREEN_H * 0.5;
const SNAP_HIGH = SCREEN_H * 0.7;

/* translateY values that correspond to each snap height.
   translateY = SCREEN_H - snapHeight  (lower = taller sheet) */
const TY_HIGH = SCREEN_H - SNAP_HIGH;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;

const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

/* placeholder bus markers around Mauritius */
const BUS_MARKERS = [
  { id: "1", lat: -20.1609, lng: 57.5012, title: "Port Louis Terminal" },
  { id: "2", lat: -20.2309, lng: 57.4992, title: "Quatre Bornes Stop" },
  { id: "3", lat: -20.3168, lng: 57.5225, title: "Curepipe Central" },
  { id: "4", lat: -20.2631, lng: 57.5803, title: "Centre de Flacq" },
  { id: "5", lat: -20.4398, lng: 57.6592, title: "Mahebourg Station" },
  { id: "6", lat: -20.1, lng: 57.57, title: "Pamplemousses" },
];

/* Leaflet map HTML — OpenStreetMap tiles (Google Maps style: blue sea, white land, dark roads) */
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

/* mock recent places */
const RECENT_PLACES = [
  {
    id: "1",
    type: "recent" as const,
    title: "Curepipe Central",
    subtitle: "Royal Road, Curepipe 74401",
  },
  {
    id: "2",
    type: "saved" as const,
    title: "Port Louis Market",
    subtitle: "Queen Street, Port Louis 11328",
  },
  {
    id: "3",
    type: "recent" as const,
    title: "Rose Hill Transport Hub",
    subtitle: "Royal Road, Rose Hill 71368",
  },
  {
    id: "4",
    type: "saved" as const,
    title: "Quatre Bornes",
    subtitle: "St Jean Road, Quatre Bornes 72257",
  },
  {
    id: "5",
    type: "recent" as const,
    title: "Mahebourg Waterfront",
    subtitle: "Rue des Hollandais, Mahebourg 50802",
  },
];

/* ───────────── small sub-components ───────────── */

function MenuButton({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <View style={[menuStyles.wrap, { top: top + 8 }]}>
      <Pressable onPress={onPress} style={menuStyles.btn}>
        <MaterialCommunityIcons name="menu" size={22} color={TEXT_PRIMARY} />
      </Pressable>
    </View>
  );
}
const menuStyles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, zIndex: 10 },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
});

function QuickActionButton({
  icon,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[quickStyles.btn, active && quickStyles.btnActive]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={active ? ACCENT : TEXT_SECONDARY}
      />
    </Pressable>
  );
}
const quickStyles = StyleSheet.create({
  btn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: { borderColor: ACCENT },
});

function PlaceCard({ item }: { item: (typeof RECENT_PLACES)[number] }) {
  return (
    <Pressable
      onPress={() => console.log("Navigate to", item.title)}
      style={placeStyles.card}
    >
      <View style={placeStyles.titleRow}>
        <View style={placeStyles.iconWrap}>
          <MaterialCommunityIcons
            name={
              item.type === "recent" ? "clock-outline" : "map-marker-outline"
            }
            size={16}
            color={TEXT_SECONDARY}
          />
        </View>
        <Text style={placeStyles.title} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
      <Text style={placeStyles.subtitle} numberOfLines={2}>
        {item.subtitle}
      </Text>
    </Pressable>
  );
}
const placeStyles = StyleSheet.create({
  card: {
    width: 220,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginRight: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  title: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: "500", flex: 1 },
  subtitle: { color: TEXT_SECONDARY, fontSize: 13, lineHeight: 18 },
});

/* ─────────────────────────────────────────────────
   HomeScreen — draggable bottom sheet with 3 snaps
   ───────────────────────────────────────────────── */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);
  const [destination, setDestination] = useState("");
  const [originError, setOriginError] = useState("");
  const [destinationError, setDestinationError] = useState("");

  const isButtonActive = searchText.trim() !== "" && destination.trim() !== "";

  const handleFindBus = () => {
    // Show errors one by one: check origin first
    if (searchText.trim() === "") {
      setOriginError("Please enter your starting location");
      setDestinationError(""); // Clear destination error
      return;
    }

    // If origin is filled, check destination next
    if (destination.trim() === "") {
      setOriginError(""); // Clear origin error
      setDestinationError("Please enter your destination");
      return;
    }

    // Both filled, proceed
    setOriginError("");
    setDestinationError("");
    console.log("Find bus", { from: searchText, to: destination });
    // TODO: Navigate to results or perform search
  };

  // Clear errors when user starts typing
  const handleOriginChange = (text: string) => {
    setSearchText(text);
    if (originError) setOriginError("");
  };

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    if (destinationError) setDestinationError("");
  };

  /* ── shared values ── */
  const translateY = useSharedValue(TY_LOW); // start collapsed
  const ctx = useSharedValue(0); // gesture context
  const overscrollGlow = useSharedValue(0); // overscroll indicator

  /* ── helpers (callable from UI thread via runOnJS) ── */
  const dismissKB = useCallback(() => Keyboard.dismiss(), []);

  const snapTo = useCallback((target: number) => {
    "worklet";
    translateY.value = withSpring(target, SPRING_CFG);
  }, []);

  /* called from JS thread (e.g. onFocus) */
  const expandToMid = useCallback(() => {
    translateY.value = withSpring(TY_MID, SPRING_CFG);
  }, []);

  /* ── Pan gesture on the entire sheet ── */
  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10]) // only activate on vertical movement
    .failOffsetX([-15, 15]) // fail gesture if horizontal movement exceeds threshold
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      const rawY = ctx.value + e.translationY;
      // Track overscroll when trying to go beyond max height
      if (rawY < TY_HIGH) {
        const overAmount = Math.min((TY_HIGH - rawY) / 80, 1);
        overscrollGlow.value = overAmount;
      } else {
        overscrollGlow.value = withTiming(0, { duration: 150 });
      }
      // clamp between fully expanded and fully collapsed
      translateY.value = Math.max(TY_HIGH, Math.min(rawY, TY_LOW));
    })
    .onEnd((e) => {
      overscrollGlow.value = withTiming(0, { duration: 200 });
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;

      // fast fling → snap in fling direction
      if (Math.abs(v) > FLING) {
        if (v > 0) {
          // flung downward
          snapTo(cur < TY_MID ? TY_MID : TY_LOW);
          if (cur >= TY_MID) runOnJS(dismissKB)();
        } else {
          // flung upward
          snapTo(cur > TY_MID ? TY_MID : TY_HIGH);
        }
        return;
      }

      // slow release → nearest snap
      const snaps = [TY_HIGH, TY_MID, TY_LOW];
      let best = snaps[0];
      let bestD = Math.abs(cur - snaps[0]);
      for (const s of snaps) {
        const d = Math.abs(cur - s);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      snapTo(best);
      if (best === TY_LOW) runOnJS(dismissKB)();
    });

  /* ── Animated styles ── */
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Overscroll glow effect
  const glowStyle = useAnimatedStyle(() => ({
    opacity: overscrollGlow.value,
  }));

  // expanded content fades in as sheet rises above collapsed
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY_MID, TY_LOW],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    // pointer events are handled in JSX via the wrapper
  }));

  /* ── Render ── */
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.mapOverlay} />
      </TouchableWithoutFeedback>

      {/* Menu */}
      <MenuButton top={insets.top} onPress={() => console.log("Open menu")} />

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Title & Description */}
          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Find Your Bus</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Search for next available bus below
            </Text>
          </View>

          {/* Always‑visible search */}
          <View style={styles.searchWrap}>
            <Pressable onPress={expandToMid}>
              <View
                style={[
                  styles.searchRow,
                  searchFocused && styles.searchRowFocused,
                  originError && styles.searchRowError,
                ]}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={TEXT_SECONDARY}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder={originError || "Enter your location"}
                    placeholderTextColor={
                      originError ? "#ff6b6b" : "rgba(255,255,255,0.35)"
                    }
                    value={searchText}
                    onChangeText={handleOriginChange}
                    onFocus={() => {
                      setSearchFocused(true);
                      expandToMid();
                    }}
                    onBlur={() => setSearchFocused(false)}
                    selectionColor={ACCENT}
                  />
                </View>
              </View>
            </Pressable>
          </View>

          {/* Expanded content — fades in */}
          <Animated.View style={[styles.expandedWrap, expandedOpacity]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 32,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {/* Where to? + Quick Actions */}
              <View>
                <View style={styles.whereRow}>
                  <View
                    style={[
                      styles.whereBtn,
                      destinationError && styles.whereBtnError,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={18}
                      color={destinationError ? "#ff6b6b" : ACCENT}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.whereInput}
                      placeholder={destinationError || "Where to?"}
                      placeholderTextColor={
                        destinationError ? "#ff6b6b" : TEXT_SECONDARY
                      }
                      value={destination}
                      onChangeText={handleDestinationChange}
                      selectionColor={ACCENT}
                    />
                  </View>
                  <View style={styles.quickActions}>
                    <QuickActionButton
                      icon="home-outline"
                      active={activeQuick === "home"}
                      onPress={() =>
                        setActiveQuick(activeQuick === "home" ? null : "home")
                      }
                    />
                    <QuickActionButton
                      icon="briefcase-outline"
                      active={activeQuick === "work"}
                      onPress={() =>
                        setActiveQuick(activeQuick === "work" ? null : "work")
                      }
                    />
                  </View>
                </View>
              </View>

              {/* Find Bus */}
              <Pressable
                style={[
                  styles.findButton,
                  isButtonActive && styles.findButtonActive,
                ]}
                onPress={handleFindBus}
              >
                <Text
                  style={[
                    styles.findButtonText,
                    isButtonActive && styles.findButtonTextActive,
                  ]}
                >
                  Find Bus
                </Text>
              </Pressable>

              {/* Recent */}
              <Text style={styles.sectionHeading}>Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.placesScroll}
                decelerationRate="fast"
                snapToInterval={232}
              >
                {RECENT_PLACES.map((item) => (
                  <PlaceCard key={item.id} item={item} />
                ))}
              </ScrollView>
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

  /* The sheet is a full-height view that we translate downward.
     translateY pushes it off screen; lower value => more visible. */
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

  searchWrap: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 14,
    height: 50,
  },
  searchRowFocused: { borderColor: ACCENT },
  searchRowError: {
    borderColor: "#ff6b6b",
    backgroundColor: "rgba(255,107,107,0.05)",
  },
  searchInput: { flex: 1, color: TEXT_PRIMARY, fontSize: 15, padding: 0 },

  expandedWrap: { flex: 1, marginTop: 12 },

  whereRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  whereBtn: {
    flex: 1,
    maxWidth: "90%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 48,
  },
  whereBtnError: {
    borderColor: "#ff6b6b",
    backgroundColor: "rgba(255,107,107,0.05)",
  },
  whereInput: { flex: 1, color: TEXT_PRIMARY, fontSize: 15, padding: 0 },
  quickActions: { flexDirection: "row", gap: 8 },

  sectionHeading: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  placesScroll: { paddingRight: 20 },

  findButton: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#c1ec72",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  findButtonActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  findButtonText: { color: "#888888", fontSize: 16, fontWeight: "600" },
  findButtonTextActive: { color: BG },
});
