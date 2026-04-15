import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Map from "@/components/Map";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { loadAllStops, type NearbyStop } from "@/services/api/stops";

/* ───────────── theme constants ───────────── */
const ACCENT = "#c1ec72";
const BG = "#000000";
const SHEET_BG = "#000000";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";
const SUGGESTION_BG = "#1A1A1D";

/* ───────────── small sub-components ───────────── */

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
  const { height: screenHeight } = useWindowDimensions();

  /* ── Bottom sheet ── */
  const {
    translateY,
    sheetStyle,
    pan,
    snapTo,
    TY,
    glowStyle,
  } = useBottomSheet({
    screenHeight,
    //          collapsed  default  keyboard-safe
    snapPoints: [0.15,     0.5,    0.92],
    initialSnap: 1,          // opens at 55% visible — inputs shown
    maxSnapIndex: 1,          // user can only drag between collapsed ↔ default
                              // (92% snap is keyboard-only, not draggable)
    onKeyboardShow: true,
    keyboardSnapIndex: 2,     // lift to 92% so inputs clear the Android keyboard
  });

  /* ── expandedOpacity: fade content out as sheet collapses ── */
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY[1], TY[0]],  // default → collapsed
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

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

  /* ── Origin: focus expands sheet + loads stops ── */
  const handleOriginFocus = useCallback(() => {
    setOriginFocused(true);
    snapTo(1); // ensure sheet is at default (inputs visible)
    loadStops();
  }, [snapTo, loadStops]);

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

  /* ── Render ── */
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      {/* Background home content */}
      <View style={styles.homeBg}>
        {/* ── Top section (greeting + map card) ── */}
        <View style={[styles.homeTopSection, { marginTop: insets.top + 12, paddingTop: 16 }]}>
          {/* App name */}
          <Text style={styles.appName}>Alebus</Text>

          {/* Greeting */}
          <View style={styles.homeHeader}>
            <View>
              <Text style={styles.homeGreeting}>Good day</Text>
              <Text style={styles.homeGreetingSub}>Where are you heading?</Text>
            </View>
            <View style={styles.homeHeaderIcon}>
              <Image source={require("@/assets/images/indexpic.png")} style={{ width: 36, height: 44, resizeMode: "contain" }} />
            </View>
          </View>

          {/* Map preview card */}
          <View style={styles.mapCard}>
            <Map
              style={StyleSheet.absoluteFillObject}
              center={[57.55, -20.25]}
              zoom={12}
            />
            <View style={styles.mapCardOverlay} pointerEvents="none" />
            <Pressable
              style={styles.mapCardBadge}
              onPress={() => router.push("/(tabs)/journey")}
            >
              <MaterialCommunityIcons name="map-marker" size={14} color={ACCENT} />
              <Text style={styles.mapCardBadgeText}>Open map in Journey tab</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Bottom section (recent list) ── */}
        <View style={styles.homeBottomSection}>
          {/* Recent trips label */}
          <View style={styles.recentHeader}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.recentLabel}>Recent</Text>
          </View>

          {/* Recent trip rows */}
          {[
            { icon: "home-outline" as const, label: "Home", sub: "Saved stop" },
            { icon: "briefcase-outline" as const, label: "Work", sub: "Saved stop" },
          ].map((item) => (
            <View key={item.label} style={styles.recentRow}>
              <View style={styles.recentIconWrap}>
                <MaterialCommunityIcons name={item.icon} size={18} color={TEXT_SECONDARY} />
              </View>
              <View style={styles.recentText}>
                <Text style={styles.recentRowLabel}>{item.label}</Text>
                <Text style={styles.recentRowSub}>{item.sub}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.2)" />
            </View>
          ))}
        </View>
      </View>

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
                <View style={[styles.suggestionBox, { maxHeight: 116, marginBottom: 12 }]}>
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                    indicatorStyle="white"
                  >
                    {originSuggestions.map((stop) => (
                      <SuggestionRow
                        key={stop.id}
                        icon="bus-stop"
                        label={stop.name}
                        sublabel={`${Math.round(stop.distanceMeters)}m away`}
                        onPress={() => handleOriginSelect(stop)}
                      />
                    ))}
                  </ScrollView>
                  {originSuggestions.length > 2 && (
                    <LinearGradient
                      colors={["transparent", SUGGESTION_BG]}
                      style={styles.suggestionFade}
                      pointerEvents="none"
                    />
                  )}
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
                        snapTo(1);
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
                      { maxHeight: 116, marginTop: -8, marginBottom: 12 },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator
                      indicatorStyle="white"
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
                    </ScrollView>
                    {destSuggestions.length > 2 && (
                      <LinearGradient
                        colors={["transparent", SUGGESTION_BG]}
                        style={styles.suggestionFade}
                        pointerEvents="none"
                      />
                    )}
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

  sheetOuter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    backgroundColor: "#ffffff",
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
    paddingBottom: 12,
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

  suggestionFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  findButtonActive: { backgroundColor: "#ffffff", borderColor: "#ffffff" },
  findButtonText: { color: "rgba(255,255,255,0.35)", fontSize: 16, fontWeight: "600" },
  findButtonTextActive: { color: "#000000" },

  /* ── Home background ── */
  homeBg: {
    flex: 1,
  },
  homeTopSection: {
    backgroundColor: "rgb(255, 255, 255)",
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderRadius: 14,
  },
  homeBottomSection: {
    flex: 1,
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  appName: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 12,
    paddingBottom: 8,
  },
  homeGreeting: {
    color: "#000000",
    fontSize: 22,
    fontWeight: "700",
  },
  homeGreetingSub: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 13,
    marginTop: 2,
  },
  homeHeaderIcon: {
    width: 54,
    height: 44,
    borderRadius: 22,
   
    alignItems: "center",
    justifyContent: "center",
  },
  mapCard: {
    height: 200,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  mapCardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  mapCardBadgeText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  recentLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  recentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  recentText: { flex: 1 },
  recentRowLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  recentRowSub: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
});
