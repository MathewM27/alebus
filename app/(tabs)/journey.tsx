import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  type Shortcut,
} from "@/components/journey/ShortcutsSection";
import { useAuth } from "@/contexts/AuthContext";
import { getBusDetails, type BusDetailsDTO } from "@/services/api/buses";
import { cancelJourney, createJourney, getJourneyTracking, loadActiveJourneys, type CreateJourneyResponse } from "@/services/api/journey";
import { fetchRouteStops } from "@/services/api/stops";
import type { JourneyTrackingDTO } from "@/types/JourneyTracking";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/* ───────────── theme ───────────── */
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
const SNAP_MID = SCREEN_H * 0.46;
const SNAP_HIGH = SCREEN_H * 0.75;

const TY_HIGH = SCREEN_H - SNAP_HIGH;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;

const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

/* ─────────────────────────────────────────────────
   Map CreateJourneyResponse → JourneyTrackingDTO[]
   One card per bus recommendation (index 0 = active card)
   ───────────────────────────────────────────────── */
function responseToCards(resp: CreateJourneyResponse): JourneyTrackingDTO[] {
  console.log("[journey] mapping response → cards, recs:", resp.recommendations.length);
  return resp.recommendations.map((rec, i) => ({
    journeyId: i === 0 ? resp.journeyId : `${resp.journeyId}-alt-${i}`,
    status: 2,
    statusName: "tracking",
    originStopId: resp.originStopId,
    destinationStopId: resp.destinationStopId,
    activeBusId: rec.busId,
    proximityName: "—",
    recommendations: [rec],
    estimatedDuration: resp.estimatedDurationMs,
  }));
}

/* ─────────────────────────────────────────────────
   JourneyScreen
   ───────────────────────────────────────────────── */
export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const { userId: authUserId } = useAuth();

  /* ── navigation params from "Find Bus" ── */
  const params = useLocalSearchParams<{
    originLat?: string;
    originLon?: string;
    destStopId?: string;
    destStopName?: string;
  }>();

  /* ── API state ── */
  const [recommendations, setRecommendations] = useState<JourneyTrackingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  /* ── Bus / stop enrichment ── */
  const [busDetails, setBusDetails] = useState<BusDetailsDTO | null>(null);
  const [busStopName, setBusStopName] = useState<string | null>(null);
  const [userStopName, setUserStopName] = useState<string | null>(null);
  const [routeSegment, setRouteSegment] = useState<{ lat: number; lon: number }[] | undefined>(undefined);

  /* ── Shortcuts state ── */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);

  /* ── shared values ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);
  const maxSnapY = useSharedValue(TY_MID);
  const overscrollGlow = useSharedValue(0);

  const hasRecommendations = recommendations.length > 0;

  // Update max snap when recommendations change
  useEffect(() => {
    maxSnapY.value = hasRecommendations ? TY_HIGH : TY_MID;
    if (hasRecommendations) {
      translateY.value = withSpring(TY_MID, SPRING_CFG);
    }
  }, [hasRecommendations]);

  /* ── Track last param set to avoid duplicate calls ── */
  const lastCallKey = useRef<string | null>(null);

  /* ── On mount: load any existing active journeys if no nav params provided ── */
  useEffect(() => {
    if (!authUserId) return;
    if (params.originLat || params.originLon || params.destStopId) return; // params will trigger createJourney instead

    const load = async () => {
      console.log("[journey] no nav params — checking for existing active journeys");
      try {
        const existing = await loadActiveJourneys(authUserId);
        if (existing.length > 0) {
          console.log("[journey] restored", existing.length, "active journey(s)");
          setJourneyId(existing[0].journeyId);
          setRecommendations(existing);
        } else {
          console.log("[journey] no active journeys found");
        }
      } catch (e: any) {
        console.warn("[journey] failed to load active journeys on mount:", e?.message ?? e);
      }
    };

    load();
  }, [authUserId]);

  /* ── Call API when params arrive ── */
  useEffect(() => {
    const { originLat, originLon, destStopId, destStopName } = params;

    if (!originLat || !originLon || !destStopId) {
      console.log("[journey] no params, skipping API call");
      return;
    }

    const callKey = `${originLat}|${originLon}|${destStopId}`;
    if (callKey === lastCallKey.current) {
      console.log("[journey] duplicate param set, skipping:", callKey);
      return;
    }
    lastCallKey.current = callKey;

    console.log("[journey] params received →", { originLat, originLon, destStopId, destStopName });

    const run = async () => {
      setLoading(true);
      setError(null);
      setRecommendations([]);
      setBusDetails(null);
      setBusStopName(null);
      setUserStopName(null);
      setRouteSegment(undefined);

      if (!authUserId) {
        console.warn("[journey] no authUserId — user not registered yet");
        setError("Session error: not authenticated");
        setLoading(false);
        return;
      }

      console.log("[journey] calling createJourney for user:", authUserId);

      try {
        const resp = await createJourney({
          userId: authUserId,
          originLat: parseFloat(originLat),
          originLon: parseFloat(originLon),
          destinationStopId: destStopId,
          radiusMeters: 500,
        });

        console.log("[journey] createJourney response:", {
          journeyId: resp.journeyId,
          originStopId: resp.originStopId,
          destinationStopId: resp.destinationStopId,
          requiredDirection: resp.requiredDirection,
          recommendationCount: resp.recommendations.length,
          estimatedDurationMs: resp.estimatedDurationMs,
        });

        if (resp.recommendations.length === 0) {
          console.warn("[journey] 0 recommendations returned");
          setError("No buses found for this route right now. Try again shortly.");
          setLoading(false);
          return;
        }

        const cards = responseToCards(resp);
        console.log("[journey] setting", cards.length, "recommendation cards");
        setJourneyId(resp.journeyId);
        setRecommendations(cards);
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        const status = err?.status;
        console.warn("[journey] createJourney error — status:", status, "msg:", msg);

        if (status === 409) {
          // User already has active journeys — load and display them
          console.log("[journey] 409 conflict — loading existing active journeys");
          try {
            const existing = await loadActiveJourneys(authUserId);
            if (existing.length > 0) {
              console.log("[journey] found", existing.length, "existing active journey(s)");
              setJourneyId(existing[0].journeyId);
              setRecommendations(existing);
            } else {
              setError("You have a journey in progress but it could not be loaded. Please try again.");
            }
          } catch (loadErr: any) {
            console.warn("[journey] failed to load existing journeys:", loadErr?.message ?? loadErr);
            setError("You already have an active journey. Please wait or try again shortly.");
          }
        } else {
          setError(msg || "Failed to find a journey. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [params.originLat, params.originLon, params.destStopId]);

  /* ── Poll journey tracking for server-side proximityName (every 15s) ── */
  useEffect(() => {
    if (!journeyId) return;

    const poll = async () => {
      const tracking = await getJourneyTracking(journeyId);
      if (!tracking) return;
      console.log("[journey] tracking poll — proximity:", tracking.proximityName, "level:", tracking.proximityLevel);
      setRecommendations((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        next[0] = {
          ...next[0],
          proximityName: tracking.proximityName,
          proximityLevel: tracking.proximityLevel,
          recommendations: tracking.recommendations.length > 0
            ? tracking.recommendations
            : next[0].recommendations,
        };
        return next;
      });
    };

    poll(); // immediate first fetch
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [journeyId]);

  /* ── Poll bus details for position + stopIndex + operatorId (every 10s) ── */
  useEffect(() => {
    const activeBusId = recommendations[0]?.activeBusId;
    if (!activeBusId) return;

    const poll = async () => {
      try {
        const details = await getBusDetails(activeBusId);
        console.log("[journey] bus poll — stopIndex:", details.stopIndex, "pos:", details.position.lat, details.position.lon);
        setBusDetails(details);
      } catch (e: any) {
        console.warn("[journey] bus details fetch failed:", e?.message ?? e);
      }
    };

    poll(); // immediate first fetch
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, [recommendations[0]?.activeBusId]);

  /* ── Resolve stop names + road polyline from route stops ── */
  useEffect(() => {
    if (!busDetails?.routeId || busDetails.stopIndex == null) return;
    const originStopId = recommendations[0]?.originStopId;

    fetchRouteStops(busDetails.routeId).then((stops) => {
      // Bus current stop name
      const busStop = stops.find((s) => s.seq === busDetails.stopIndex);
      setBusStopName(busStop?.name ?? null);
      console.log("[journey] bus stop name:", busStop?.name, "seq:", busDetails.stopIndex);

      // User boarding stop name (look up by stop id in route stops)
      if (originStopId) {
        const userStop = stops.find((s) => s.id === originStopId);
        setUserStopName(userStop?.name ?? null);
        console.log("[journey] user stop name:", userStop?.name, "id:", originStopId);

        // Build road-following polyline: bus GPS → pathToNext segments → user boarding stop
        const pos = busDetails.position;
        if (busStop && userStop && pos && (Math.abs(pos.lat) > 0.001 || Math.abs(pos.lon) > 0.001)) {
          const coords: { lat: number; lon: number }[] = [{ lat: pos.lat, lon: pos.lon }];
          for (let seq = busStop.seq; seq < userStop.seq; seq++) {
            const seg = stops.find((s) => s.seq === seq);
            if (seg?.pathToNext?.length) {
              coords.push(...seg.pathToNext);
            } else {
              const next = stops.find((s) => s.seq === seq + 1);
              if (next) coords.push({ lat: next.lat, lon: next.lon });
            }
          }
          coords.push({ lat: userStop.lat, lon: userStop.lon });
          setRouteSegment(coords.length >= 2 ? coords : undefined);
        }
      }
    });
  }, [busDetails?.routeId, busDetails?.stopIndex, busDetails?.position?.lat, busDetails?.position?.lon, recommendations[0]?.originStopId]);

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
  const handleEndTracking = useCallback(() => {
    console.log("[journey] end tracking, journeyId:", journeyId);

    // Cancel all real journey IDs on the backend (skip synthetic alt-IDs)
    const realIds = recommendations
      .map((r) => r.journeyId)
      .filter((id) => !id.includes("-alt-"));
    if (realIds.length > 0) {
      Promise.allSettled(realIds.map((id) => cancelJourney(id))).then((results) => {
        results.forEach((r, i) => {
          if (r.status === "rejected") {
            console.warn("[journey] cancel failed for", realIds[i], r.reason);
          } else {
            console.log("[journey] cancelled journey:", realIds[i]);
          }
        });
      });
    }

    setRecommendations([]);
    setJourneyId(null);
    setBusDetails(null);
    setBusStopName(null);
    setUserStopName(null);
    setRouteSegment(undefined);
    setError(null);
    lastCallKey.current = null;
    translateY.value = withSpring(TY_MID, SPRING_CFG);
  }, [journeyId, recommendations]);

  const handleStartJourney = (sc: Shortcut) => {
    console.log("[journey] shortcut tapped:", sc.origin, "→", sc.destination);
  };

  const handleEditStart = () => {
    translateY.value = withSpring(TY_MID, SPRING_CFG);
  };

  /* ── Origin coords for map (from nav params) ── */
  const userPosition = params.originLat && params.originLon
    ? { lat: parseFloat(params.originLat), lon: parseFloat(params.originLon) }
    : undefined;

  const busPosition = busDetails?.position
    ? { lat: busDetails.position.lat, lon: busDetails.position.lon }
    : undefined;

  /* ── Sheet content ── */
  const renderSheetContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.stateText}>Finding buses…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centeredState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              lastCallKey.current = null;
              setError(null);
            }}
          >
            <Text style={styles.retryText}>Dismiss</Text>
          </Pressable>
        </View>
      );
    }

    if (hasRecommendations) {
      return (
        <ActiveJourneySection
          journeyRecommendations={recommendations}
          busDetails={busDetails}
          busStopName={busStopName}
          userStopName={userStopName}
          onEndTracking={handleEndTracking}
        />
      );
    }

    return (
      <>
        <ShortcutsSection
          shortcuts={shortcuts}
          onShortcutsChange={setShortcuts}
          onStartJourney={handleStartJourney}
          onEditStart={handleEditStart}
        />
        <View style={{ height: 40 }} />
        <ActiveJourneySection
          journeyRecommendations={null}
          busDetails={null}
          busStopName={null}
          userStopName={null}
          onEndTracking={handleEndTracking}
        />
      </>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      <Map busPosition={busPosition} userPosition={userPosition} routeSegment={routeSegment} />
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerWrap}>
            <Text style={styles.headerTitle}>Journeys</Text>
            <Text style={styles.headerSubtitle}>
              {hasRecommendations
                ? `${recommendations.length} bus${recommendations.length !== 1 ? "es" : ""} found`
                : "Track and manage your trips"}
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
              {renderSheetContent()}
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
  expandedWrap: { flex: 1, marginTop: 8 },

  centeredState: {
    marginTop: 40,
    alignItems: "center",
    gap: 12,
  },
  stateText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  retryText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "600",
  },
});
