import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Map from "@/components/Map";
import { loadAllStops, type NearbyStop } from "@/services/api/stops";

/* ───────────── constants ───────────── */
const { height: SCREEN_H } = Dimensions.get("window");
const ACCENT = "#c1ec72";
const BG = "#000000";
const SHEET_BG = "#0E0E10";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";
const SUGGESTION_BG = "#1A1A1D";

/* snap points – heights measured from the bottom of the screen */
const SNAP_LOW = 140;
const SNAP_MID = SCREEN_H * 0.5;
const SNAP_HIGH = SCREEN_H * 0.55;

const TY_HIGH = SCREEN_H - SNAP_HIGH;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;

const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

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

/* ─────────────────────────────────────────────────
   Suggestion row (shared between origin & dest lists)
   ───────────────────────────────────────────────── */
function SuggestionRow({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={sugStyles.row}>
      <View style={sugStyles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={16} color={TEXT_SECONDARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sugStyles.label} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={sugStyles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
const sugStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  label: { color: TEXT_PRIMARY, fontSize: 14 },
  sublabel: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 1 },
});

/* ─────────────────────────────────────────────────
   HomeScreen — draggable bottom sheet with 3 snaps
   ───────────────────────────────────────────────── */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  /* ── origin field ── */
  const [originText, setOriginText] = useState("");
  const [originFocused, setOriginFocused] = useState(false);
  const [originLoading, setOriginLoading] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<{
    label: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [originError, setOriginError] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<NearbyStop[]>([]);

  /* ── destination field ── */
  const [destText, setDestText] = useState("");
  const [destFocused, setDestFocused] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState<NearbyStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<NearbyStop | null>(null);
  const [destinationError, setDestinationError] = useState("");
  const [allStops, setAllStops] = useState<NearbyStop[]>([]);
  const [stopsLoaded, setStopsLoaded] = useState(false);
  const [stopsLoading, setStopsLoading] = useState(false);

  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  const isButtonActive = selectedOrigin !== null && selectedStop !== null;

  /* ── Load all stops using Mauritius center (no GPS needed) ── */
  const loadStops = useCallback(async () => {
    if (stopsLoaded || stopsLoading) return;
    setStopsLoading(true);
    try {
      const stops = await loadAllStops(-20.2, 57.55);
      setAllStops(stops);
      setStopsLoaded(true);
    } catch {
      // Don't mark as loaded on failure — allow retry on next focus
    } finally {
      setStopsLoading(false);
    }
  }, [stopsLoaded, stopsLoading]);

  /* ── Origin: focus just expands + loads stops ── */
  const handleOriginFocus = useCallback(() => {
    setOriginFocused(true);
    expandToHigh();
    loadStops();
  }, [loadStops]);

  /* ── Origin: filter stops as user types ── */
  const handleOriginTextChange = (text: string) => {
    setOriginText(text);
    setSelectedOrigin(null);
    if (originError) setOriginError("");

    if (!text.trim()) {
      setOriginSuggestions([]);
      return;
    }

    const q = text.toLowerCase();
    setOriginSuggestions(
      allStops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6),
    );
  };

  /* ── Origin: select a stop from suggestions ── */
  const handleOriginSelect = (stop: NearbyStop) => {
    setSelectedOrigin({ label: stop.name, lat: stop.lat, lon: stop.lon });
    setOriginText(stop.name);
    setOriginSuggestions([]);
    setOriginError("");
    Keyboard.dismiss();
  };

  /* ── Origin: GPS pin button — fetch current location ── */
  const handleGetCurrentLocation = useCallback(async () => {
    setOriginLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setSelectedOrigin({
        label: "My Location",
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      });
      setOriginText("My Location");
      setOriginSuggestions([]);
      setOriginError("");
      Keyboard.dismiss();
    } catch {
      // silent — user can still type manually
    } finally {
      setOriginLoading(false);
    }
  }, []);

  /* ── Destination text change → filter loaded stops ── */
  const handleDestChange = (text: string) => {
    setDestText(text);
    setSelectedStop(null);
    if (destinationError) setDestinationError("");

    if (text.trim().length === 0) {
      setDestSuggestions([]);
      return;
    }

    const q = text.toLowerCase();
    const filtered = allStops
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 6);
    setDestSuggestions(filtered);
  };

  const handleDestSelect = (stop: NearbyStop) => {
    setSelectedStop(stop);
    setDestText(stop.name);
    setDestSuggestions([]);
    setDestinationError("");
    Keyboard.dismiss();
  };

  /* ── Find Bus ── */
  const handleFindBus = () => {
    if (!selectedOrigin) {
      setOriginError("Please select your starting location");
      setDestinationError("");
      return;
    }
    if (!selectedStop) {
      setOriginError("");
      setDestinationError("Please select your destination stop");
      return;
    }
    setOriginError("");
    setDestinationError("");

    // Navigate to journey tab; full API wiring in journey.tsx
    // ts ensures params always change even on repeat Find Bus taps with the same data,
    // so journey.tsx's useEffect dependency array fires on every new request.
    router.push({
      pathname: "/(tabs)/journey",
      params: {
        originLat: selectedOrigin.lat,
        originLon: selectedOrigin.lon,
        destStopId: selectedStop.id,
        destStopName: selectedStop.name,
        ts: Date.now(),
      },
    });
  };

  /* ── shared values ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);
  const overscrollGlow = useSharedValue(0);

  const dismissKB = useCallback(() => Keyboard.dismiss(), []);

  const snapTo = useCallback((target: number) => {
    "worklet";
    translateY.value = withSpring(target, SPRING_CFG);
  }, []);

  const expandToHigh = useCallback(() => {
    translateY.value = withSpring(TY_HIGH, SPRING_CFG);
  }, []);

  /* ── Pan gesture ── */
  const pan = Gesture.Pan()
    .activeOffsetY([-25, 25])
    .failOffsetX([-10, 10])
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      const rawY = ctx.value + e.translationY;
      if (rawY < TY_HIGH) {
        const overAmount = Math.min((TY_HIGH - rawY) / 80, 1);
        overscrollGlow.value = overAmount;
      } else {
        overscrollGlow.value = withTiming(0, { duration: 150 });
      }
      translateY.value = Math.max(TY_HIGH, Math.min(rawY, TY_LOW));
    })
    .onEnd((e) => {
      overscrollGlow.value = withTiming(0, { duration: 200 });
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;

      if (Math.abs(v) > FLING) {
        if (v > 0) {
          snapTo(cur < TY_MID ? TY_MID : TY_LOW);
          if (cur >= TY_MID) scheduleOnRN(dismissKB);
        } else {
          snapTo(cur > TY_MID ? TY_MID : TY_HIGH);
        }
        return;
      }

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
      if (best === TY_LOW) scheduleOnRN(dismissKB);
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

  /* ── Render ── */
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      {/* Map */}
      <Map />
      <View style={styles.mapOverlay} pointerEvents="none" />

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

          {/* Origin search */}
          <View
            style={[
              styles.searchWrap,
              { flexDirection: "row", alignItems: "center", gap: 10 },
            ]}
          >
            <View
              style={[
                styles.searchRow,
                { flex: 1 },
                originFocused && styles.searchRowFocused,
                originError ? styles.searchRowError : null,
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
                  placeholder={originError || "Search stop or address"}
                  placeholderTextColor={
                    originError ? "#ff6b6b" : "rgba(255,255,255,0.35)"
                  }
                  value={originText}
                  onChangeText={handleOriginTextChange}
                  onFocus={handleOriginFocus}
                  onBlur={() => setOriginFocused(false)}
                  selectionColor={ACCENT}
                  returnKeyType="search"
                />
              </View>
              {originLoading && (
                <ActivityIndicator
                  size="small"
                  color={ACCENT}
                  style={{ marginLeft: 6 }}
                />
              )}
              {selectedOrigin && !originLoading && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color={ACCENT}
                  style={{ marginLeft: 6 }}
                />
              )}
            </View>
            <QuickActionButton
              icon="crosshairs-gps"
              active={selectedOrigin?.label === "My Location"}
              onPress={handleGetCurrentLocation}
            />
          </View>

          {/* Expanded content */}
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
              {/* Origin suggestions */}
              {originSuggestions.length > 0 && (
                <View style={[styles.suggestionBox, { marginBottom: 12 }]}>
                  {originSuggestions.map((stop) => (
                    <SuggestionRow
                      key={stop.id}
                      icon="bus-stop"
                      label={stop.name}
                      sublabel={`${Math.round(stop.distanceMeters)}m away`}
                      onPress={() => handleOriginSelect(stop)}
                    />
                  ))}
                </View>
              )}
              {originFocused &&
                originText.length > 1 &&
                originSuggestions.length === 0 &&
                !stopsLoading &&
                stopsLoaded && (
                  <View style={styles.emptyHint}>
                    <Text style={styles.emptyHintText}>
                      No stops found for "{originText}"
                    </Text>
                  </View>
                )}

              {/* Where to? + Quick Actions */}
              <View>
                <View style={styles.whereRow}>
                  <View
                    style={[
                      styles.whereBtn,
                      destFocused && styles.whereBtnFocused,
                      destinationError ? styles.whereBtnError : null,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={18}
                      color={
                        destinationError
                          ? "#ff6b6b"
                          : selectedStop
                            ? ACCENT
                            : ACCENT
                      }
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.whereInput}
                      placeholder={destinationError || "Where to?"}
                      placeholderTextColor={
                        destinationError ? "#ff6b6b" : TEXT_SECONDARY
                      }
                      value={destText}
                      onChangeText={handleDestChange}
                      onFocus={() => {
                        setDestFocused(true);
                        expandToHigh();
                        loadStops();
                      }}
                      onBlur={() => setDestFocused(false)}
                      selectionColor={ACCENT}
                      returnKeyType="search"
                    />
                    {stopsLoading && (
                      <ActivityIndicator
                        size="small"
                        color={ACCENT}
                        style={{ marginLeft: 4 }}
                      />
                    )}
                    {selectedStop && !destFocused && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color={ACCENT}
                        style={{ marginLeft: 4 }}
                      />
                    )}
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

                {/* Destination suggestions */}
                {destSuggestions.length > 0 && (
                  <View
                    style={[
                      styles.suggestionBox,
                      { marginTop: -8, marginBottom: 12 },
                    ]}
                  >
                    {destSuggestions.map((stop) => (
                      <SuggestionRow
                        key={stop.id}
                        icon="bus-stop"
                        label={stop.name}
                        sublabel={`${Math.round(stop.distanceMeters)}m away`}
                        onPress={() => handleDestSelect(stop)}
                      />
                    ))}
                  </View>
                )}

                {/* Empty state when dest focused but no results yet */}
                {destFocused &&
                  destText.length > 1 &&
                  destSuggestions.length === 0 &&
                  !stopsLoading &&
                  stopsLoaded && (
                    <View style={styles.emptyHint}>
                      <Text style={styles.emptyHintText}>
                        No stops found for "{destText}"
                      </Text>
                    </View>
                  )}
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
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Overscroll glow */}
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

  suggestionBox: {
    backgroundColor: SUGGESTION_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    overflow: "hidden",
  },

  whereRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  whereBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 48,
  },
  whereBtnFocused: { borderColor: ACCENT },
  whereBtnError: {
    borderColor: "#ff6b6b",
    backgroundColor: "rgba(255,107,107,0.05)",
  },
  whereInput: { flex: 1, color: TEXT_PRIMARY, fontSize: 15, padding: 0 },
  quickActions: { flexDirection: "row", gap: 8 },

  emptyHint: { marginBottom: 12, paddingHorizontal: 4 },
  emptyHintText: { color: TEXT_SECONDARY, fontSize: 13 },

  findButton: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#c1ec72",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  findButtonActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  findButtonText: { color: "#888888", fontSize: 16, fontWeight: "600" },
  findButtonTextActive: { color: BG },
});
