import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
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
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useBusPosition } from "@/hooks/useBusPosition";
import { getBusDetails, type BusDetailsDTO } from "@/services/api/buses";
import {
  cancelJourney,
  createJourney,
  getJourneyTracking,
  loadActiveJourneys,
  type CreateJourneyResponse,
} from "@/services/api/journey";
import {
  getMeProfile,
  setShortcuts as saveShortcutsToBackend,
  savedLocationsToShortcuts,
} from "@/services/api/users";
import { fetchRouteStops, type RouteStop } from "@/services/api/stops";
import { busMuxClient } from "@/services/ws/busMuxClient";
import type { JourneyTrackingDTO } from "@/types/JourneyTracking";
// LEGACY DISABLED: roadPosition, pathAfterFraction (with FractionalIndex) commented out.
// Re-enable if restoring stopIndex+fractionalIndex fallback.
// import { pathAfterFraction, roadPosition, segmentPctToPosition } from "@/utils/routeGeometry";
import { crossRouteSegmentFromPct, findStopAtPct, routeSegmentFromPct, segmentPctToPosition } from "@/utils/routeGeometry";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/* ───────────── theme ───────────── */
const ACCENT = "#c1ec72";
const BG = "#000000";
const SHEET_BG = "#000000";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

/* ── Proximity level (int) → name ── */
function proximityLevelToName(level: number): string {
  switch (level) {
    case 1: return "approaching"; // ≤500m
    case 2: return "near";        // ≤100m
    case 3: return "arriving";    // ≤50m
    default: return "none";
  }
}

/* ── Map CreateJourneyResponse → JourneyTrackingDTO[] ── */
function responseToCards(resp: CreateJourneyResponse): JourneyTrackingDTO[] {
  console.log("[journey] mapping response → cards, recs:", resp.recommendations.length);
  return resp.recommendations.map((rec, i) => ({
    journeyId: i === 0 ? resp.journeyId : `${resp.journeyId}-alt-${i}`,
    status: 2,
    statusName: "tracking",
    routeId: resp.routeId,
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
  const { height: screenHeight } = useWindowDimensions();

  /* ── navigation params from "Find Bus" ── */
  const params = useLocalSearchParams<{
    originLat?: string;
    originLon?: string;
    destStopId?: string;
    destStopName?: string;
    ts?: string;
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
  const [routeSegment, setRouteSegment] = useState<
    { lat: number; lon: number }[] | undefined
  >(undefined);
  const [routeStops, setRouteStops] = useState<RouteStop[] | null>(null);
  const [userRouteStops, setUserRouteStops] = useState<RouteStop[] | null>(null);

  /* ── Shortcuts state ── */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [isEditingShortcut, setIsEditingShortcut] = useState(false);

  const hasRecommendations = recommendations.length > 0;

  /* ── Bottom sheet ──
   * Snap points:
   *   0 → 15% visible  (collapsed)
   *   1 → 50% visible  (default idle)
   *   2 → 75% visible  (active journey)
   *   3 → 92% visible  (shortcut edit form)
   *
   * maxSnapIndex is controlled by state so the drag ceiling adjusts dynamically.
   * Programmatic snapTo() bypasses the ceiling (edit form, recommendations).
   */
  const maxSnapIndex = isEditingShortcut ? 3 : 2;

  const {
    translateY,
    sheetStyle,
    pan,
    snapTo,
    TY,
    glowStyle,
    setSectionExpanded,
  } = useBottomSheet({
    screenHeight,
    snapPoints: [0.15, 0.20, 0.55, 0.92],
    initialSnap: 1,
    maxSnapIndex,
    onKeyboardShow: true,  // lift to index 3 when keyboard appears (shortcut edit inputs)
    keyboardSnapIndex: 3,
  });

  /* ── Title opacity — fades out when recommendations arrive ── */
  const titleOpacity = useSharedValue(1);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  /* ── expandedOpacity: fade content when sheet collapses ── */
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY[1], TY[0]],   // default → collapsed
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /* ── When recommendations arrive, snap to active journey height ── */
  useEffect(() => {
    if (hasRecommendations) {
      snapTo(2); // 75% visible
      titleOpacity.value = withTiming(0, { duration: 300 });
    } else {
      snapTo(1); // 50% visible
      titleOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [hasRecommendations]);

  /* ── Load shortcuts from backend on mount ── */
  useEffect(() => {
    if (!authUserId) return;
    getMeProfile()
      .then((profile) => {
        const loaded = savedLocationsToShortcuts(profile.savedLocations);
        if (loaded.length > 0) setShortcuts(loaded);
      })
      .catch(() => {
        // Network failure — keep defaults, will retry on next mount
      });
  }, [authUserId]);

  const handleShortcutsChange = useCallback((updated: Shortcut[]) => {
    setShortcuts(updated);
    saveShortcutsToBackend(updated).catch(() => {
      // Fire-and-forget — local state is already updated
    });
  }, []);

  /* ── Track last param set to avoid duplicate calls ── */
  const lastCallKey = useRef<string | null>(null);

  /* ── On mount: load any existing active journeys if no nav params provided ── */
  useEffect(() => {
    if (!authUserId) return;
    if (params.originLat || params.originLon || params.destStopId) return;

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

    const callKey = `${originLat}|${originLon}|${destStopId}|${params.ts ?? ""}`;
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
  }, [params.originLat, params.originLon, params.destStopId, params.ts]);

  /* ── WebSocket: connect/disconnect lifecycle tied to journeyId ── */
  useEffect(() => {
    if (!journeyId) return;

    busMuxClient
      .connect()
      .then(() => {
        console.log("[journey] WS connected OK, subscribing to journeyId:", journeyId);
        return busMuxClient.subscribeJourney(journeyId);
      })
      .then((subId) => console.log("[journey] WS subscribed, subId:", subId))
      .catch((e: any) =>
        console.warn("[journey] WS connect/subscribe failed:", e?.message ?? e),
      );

    return () => {
      busMuxClient.disconnect();
    };
  }, [journeyId]);

  /* ── WebSocket: journey.update → proximity + recommendations ── */
  useEffect(() => {
    if (!journeyId) return;

    const off = busMuxClient.onJourneyUpdate((frame) => {
      if (frame.journey.journeyId !== journeyId) return;
      const j = frame.journey;
      const proximityName =
        j.proximityName || proximityLevelToName(j.proximityLevel ?? 0);
      setRecommendations((prev) => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        next[0] = {
          ...next[0],
          proximityName,
          proximityLevel: j.proximityLevel,
          recommendations:
            j.recommendations?.length > 0
              ? j.recommendations
              : next[0].recommendations,
          activeBusId: j.activeBusId ?? next[0].activeBusId,
        };
        return next;
      });
    });

    return off;
  }, [journeyId]);

  /* ── Smooth bus position via WS ── */
  const activeBusId = recommendations[0]?.activeBusId ?? null;
  const { displayPos, latestBus } = useBusPosition(activeBusId, routeStops);

  const latestBusRef = useRef(latestBus);
  useEffect(() => {
    latestBusRef.current = latestBus;
  }, [latestBus]);

  /* ── One-time initial HTTP fetch ── */
  useEffect(() => {
    if (!activeBusId) return;
    getBusDetails(activeBusId)
      .then((details) => {
        setBusDetails((prev) => prev ?? details);
      })
      .catch((e: any) =>
        console.warn("[journey] initial bus fetch:", e?.message ?? e),
      );
  }, [activeBusId]);

  /* ── Sync latestBus → busDetails ── */
  useEffect(() => {
    if (!latestBus) return;
    setBusDetails((prev) => ({
      ...(prev ?? {}),
      busId: latestBus.BusID,
      operatorId: latestBus.OperatorID,
      routeId: latestBus.RouteID,
      direction: latestBus.Direction === 0 ? "outbound" : "inbound",
      status: latestBus.Status === 0 ? "active" : "inactive",
      stopIndex: latestBus.StopIndex,
      isAtTerminal: latestBus.IsAtTerminal,
      position: {
        lat: latestBus.Position.Lat,
        lon: latestBus.Position.Lon,
        speedKmh: latestBus.Position.SpeedKmh,
      },
      updatedAt: latestBus.UpdatedAt,
    } as BusDetailsDTO));
  }, [latestBus]);

  /* ── Fetch route stops for the bus's current route ── */
  useEffect(() => {
    if (!busDetails?.routeId) {
      console.log("[journey:stops] busDetails.routeId not set yet — skipping fetch");
      return;
    }
    console.log("[journey:stops] fetching bus route stops for routeId:", busDetails.routeId);
    fetchRouteStops(busDetails.routeId).then((stops) => {
      const hasPathToNext = stops.filter(s => s.pathToNext && s.pathToNext.length >= 2).length;
      console.log(
        `[journey:stops] bus route loaded — count=${stops.length} withPathToNext=${hasPathToNext} routeId=${busDetails.routeId}`,
      );
      setRouteStops(stops);
    });
  }, [busDetails?.routeId]);

  /* ── Fetch route stops for the user's journey route (may differ from bus route) ── */
  const journeyRouteId = recommendations[0]?.routeId;
  useEffect(() => {
    if (!journeyRouteId) return;
    fetchRouteStops(journeyRouteId).then((stops) => {
      console.log(
        "[journey] setUserRouteStops — count:", stops.length, "routeId:", journeyRouteId,
      );
      setUserRouteStops(stops);
    });
  }, [journeyRouteId]);

  /* ── Rebuild road polyline whenever bus position or route changes ── */
  useEffect(() => {
    const segPct = latestBus?.SegmentPct ?? 0;
    const originStopId = recommendations[0]?.originStopId;
    console.log(
      `[journey:polyline] trigger — segPct=${segPct.toFixed(4)}`,
      `routeStops=${routeStops?.length ?? 'null'}`,
      `userRouteStops=${userRouteStops?.length ?? 'null'}`,
      `originStopId=${originStopId ?? 'null'}`,
      `busRouteId=${busDetails?.routeId ?? 'null'}`,
      `journeyRouteId=${journeyRouteId ?? 'null'}`,
      `isCrossRoute=${journeyRouteId && busDetails?.routeId && journeyRouteId !== busDetails.routeId}`,
    );
    if (!routeStops || routeStops.length < 2 || segPct <= 0) {
      setRouteSegment(undefined);
      return;
    }

    // Derive current stop from segmentPct for name labels.
    const { currentStop } = findStopAtPct(routeStops, segPct);
    setBusStopName(currentStop?.name ?? null);

    if (!originStopId) return;

    const isCrossRoute =
      journeyRouteId &&
      busDetails?.routeId &&
      journeyRouteId !== busDetails.routeId;

    if (isCrossRoute && userRouteStops && userRouteStops.length >= 2) {
      // Bus is on the paired route — build combined polyline: bus→terminal + user route start→boarding stop
      const userStop = userRouteStops.find((s) => s.id === originStopId);
      setUserStopName(userStop?.name ?? null);
      const coords = crossRouteSegmentFromPct(routeStops, userRouteStops, segPct, originStopId, latestBus?.Position.Lat, latestBus?.Position.Lon);
      console.log("[journey] cross-route polyline coords:", coords?.length ?? 0);
      setRouteSegment(coords ?? undefined);
    } else {
      // Same route — normal case
      const userStop = routeStops.find((s) => s.id === originStopId);
      setUserStopName(userStop?.name ?? null);
      console.log(
        `[journey:polyline] same-route — stopFound=${!!userStop} stopName=${userStop?.name ?? 'NOT_FOUND'}`,
        `stopId=${originStopId}`,
      );
      const coords = routeSegmentFromPct(routeStops, segPct, originStopId, latestBus?.Position.Lat, latestBus?.Position.Lon);
      console.log(`[journey:polyline] routeSegmentFromPct → coords=${coords?.length ?? 'null'}`);
      setRouteSegment(coords ?? undefined);
    }
  }, [routeStops, userRouteStops, latestBus?.SegmentPct, recommendations[0]?.originStopId, journeyRouteId, busDetails?.routeId]);

  /* ── Edit shortcut handlers ── */
  const handleEditStart = useCallback(() => {
    setIsEditingShortcut(true);
    setSectionExpanded(true);
    snapTo(2); // expand to edit form height
  }, [snapTo, setSectionExpanded]);

  const handleEditClose = useCallback(() => {
    setIsEditingShortcut(false);
    setSectionExpanded(false);
    snapTo(2); // return to default height
  }, [snapTo, setSectionExpanded]);

  /* ── Handlers ── */
  const handleEndTracking = useCallback(() => {
    console.log("[journey] end tracking, journeyId:", journeyId);

    const realIds = recommendations
      .map((r) => r.journeyId)
      .filter((id) => !id.includes("-alt-"));
    if (realIds.length > 0) {
      Promise.allSettled(realIds.map((id) => cancelJourney(id))).then(
        (results) => {
          results.forEach((r, i) => {
            if (r.status === "rejected") {
              console.warn("[journey] cancel failed for", realIds[i], r.reason);
            } else {
              console.log("[journey] cancelled journey:", realIds[i]);
            }
          });
        },
      );
    }

    setRecommendations([]);
    setJourneyId(null);
    setBusDetails(null);
    setBusStopName(null);
    setUserStopName(null);
    setRouteSegment(undefined);
    setError(null);
    lastCallKey.current = null;
    snapTo(1);
  }, [journeyId, recommendations, snapTo]);

  const handleStartJourney = useCallback(async (sc: Shortcut) => {
    if (!sc.originLat || !sc.originLon || !sc.destStopId) {
      console.warn("[journey] shortcut missing stop data — please edit and reselect stops");
      return;
    }
    if (!authUserId) return;
    try {
      setError(null);
      const res = await createJourney({
        userId: authUserId,
        originLat: sc.originLat,
        originLon: sc.originLon,
        destinationStopId: sc.destStopId,
      });
      setJourneyId(res.journeyId);
      const tracking = await getJourneyTracking(res.journeyId);
      if (tracking) setRecommendations([tracking]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start journey");
    }
  }, [authUserId]);

  /* ── Map positions ── */
  const originStopId = recommendations[0]?.originStopId;
  const userPosition = useMemo(() => {
    if (!hasRecommendations) return undefined;
    if (params.originLat && params.originLon) {
      return {
        lat: parseFloat(params.originLat),
        lon: parseFloat(params.originLon),
      };
    }
    if (originStopId && routeStops) {
      const stop = routeStops.find((s) => s.id === originStopId);
      if (stop) return { lat: stop.lat, lon: stop.lon };
    }
    return undefined;
  }, [hasRecommendations, params.originLat, params.originLon, originStopId, routeStops]);

  const busPosition = displayPos ?? undefined;

  const cameraTarget = useMemo(() => {
    if (!latestBus) return undefined;
    // LEGACY DISABLED: roadPosition(routeStops, latestBus.StopIndex, ...) commented out.
    // Re-enable if restoring stopIndex+fractionalIndex fallback.
    const snapped =
      routeStops && routeStops.length >= 2
        ? segmentPctToPosition(routeStops, latestBus.SegmentPct)
        : null;
    return snapped ?? { lat: latestBus.Position.Lat, lon: latestBus.Position.Lon };
  }, [latestBus, routeStops]);

  /* ── Navigation banner data ── */
  const navBanner = useMemo(() => {
    if (!latestBus || !routeStops || routeStops.length === 0) return null;

    const { currentStop, nextStop, isAtStop } = findStopAtPct(routeStops, latestBus.SegmentPct);

    let statusText: string;
    if (latestBus.IsAtTerminal) {
      statusText = `At ${currentStop?.name ?? "Terminal"}`;
    } else if (isAtStop && currentStop) {
      statusText = `At ${currentStop.name}`;
    } else if (nextStop) {
      statusText = `Towards ${nextStop.name}`;
    } else {
      statusText = currentStop ? `From ${currentStop.name}` : "In transit";
    }

    const distM = recommendations[0]?.recommendations?.[0]?.distanceMeters;
    let distText = "";
    if (distM != null && !Number.isNaN(distM) && distM > 0) {
      const m = Math.max(0, distM);
      distText =
        m < 1000
          ? `${Math.round(m / 10) * 10} m`
          : `${Math.round((m / 1000) * 10) / 10} km`;
    }

    return { statusText, distText, isAtStop };
  }, [latestBus, routeStops]);

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
        {!isEditingShortcut && (
          <>
            <ActiveJourneySection
              journeyRecommendations={null}
              busDetails={null}
              busStopName={null}
              userStopName={null}
              onEndTracking={handleEndTracking}
            />
            <View style={{ height: 20 }} />
          </>
        )}
        <ShortcutsSection
          shortcuts={shortcuts}
          onShortcutsChange={handleShortcutsChange}
          onStartJourney={handleStartJourney}
          onEditStart={handleEditStart}
          onEditEnd={handleEditClose}
          onFieldFocus={() => snapTo(3)}
          onFieldBlur={() => snapTo(1)}
        />
      </>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      <Map
        busPosition={busPosition}
        cameraTarget={cameraTarget}
        userPosition={userPosition}
        routeSegment={routeSegment}
      />
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* Route loading indicator */}
      {(busDetails || latestBus) && !routeSegment && (
        <View style={styles.routeLoadingBadge} pointerEvents="none">
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={styles.routeLoadingText}>Loading route…</Text>
        </View>
      )}

      {/* ── Navigation banner ── */}
      {navBanner && (
        <View
          style={[styles.navBanner, { top: insets.top + 8 }]}
          pointerEvents="none"
        >
          <View style={styles.navBannerLeft}>
            <MaterialCommunityIcons
              name={navBanner.isAtStop ? "map-marker" : "bus"}
              size={20}
              color={ACCENT}
            />
            <Text style={styles.navBannerText} numberOfLines={1}>
              {navBanner.statusText}
            </Text>
          </View>
          {navBanner.distText ? (
            <View style={styles.navBannerDistBadge}>
              <Text style={styles.navBannerDistText}>{navBanner.distText}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Animated.Text
                style={[styles.headerTitle, titleStyle]}
                pointerEvents={hasRecommendations ? "none" : "auto"}
              >
                Journeys
              </Animated.Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {hasRecommendations
                ? `${recommendations.length} bus${recommendations.length !== 1 ? "es" : ""} found`
                : "Track and manage your trips"}
            </Text>
          </View>

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
  routeLoadingBadge: {
    position: "absolute",
    top: 80,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  routeLoadingText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },

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
    backgroundColor: "rgb(255, 250, 250)",
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerRow: {
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
  expandedWrap: { flex: 1 },

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

  navBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(13,13,13,0.92)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  navBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  navBannerText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  navBannerDistBadge: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 12,
  },
  navBannerDistText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
