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
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView,
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
import { pathAfterFraction, roadPosition } from "@/utils/routeGeometry";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/* ───────────── theme ───────────── */
const { height: SCREEN_H } = Dimensions.get("window");
const ACCENT = "#c1ec72";
const BG = "#000000";
const SHEET_BG = "#000000";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

/* ── snap points ── */
const SNAP_LOW = 160;
const SNAP_MID = SCREEN_H * 0.46;
const SNAP_HIGH_EDIT = SCREEN_H * 0.9;   // shortcuts edit form
const SNAP_HIGH_JOURNEY = SCREEN_H * 0.72; // active journey recommendations


const TY_HIGH = SCREEN_H - SNAP_HIGH_EDIT;
const TY_HIGH_JOURNEY = SCREEN_H - SNAP_HIGH_JOURNEY;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;


const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

/* ── Proximity level (int) → name used by format.ts color/label helpers ── */
function proximityLevelToName(level: number): string {
  switch (level) {
    case 1:
      return "approaching"; // ≤500m
    case 2:
      return "near"; // ≤100m
    case 3:
      return "arriving"; // ≤50m
    default:
      return "none"; // >500m or unknown
  }
}

/* ─────────────────────────────────────────────────
   Map CreateJourneyResponse → JourneyTrackingDTO[]
   One card per bus recommendation (index 0 = active card)
   ───────────────────────────────────────────────── */
function responseToCards(resp: CreateJourneyResponse): JourneyTrackingDTO[] {
  console.log(
    "[journey] mapping response → cards, recs:",
    resp.recommendations.length,
  );
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
    ts?: string; // nonce: ensures same-params repeat navigations re-trigger the effect
  }>();

  /* ── API state ── */
  const [recommendations, setRecommendations] = useState<JourneyTrackingDTO[]>(
    [],
  );
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

  /* ── Shortcuts state ── */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [isEditingShortcut, setIsEditingShortcut] = useState(false);

  // Load shortcuts from backend on mount (once user is authenticated)
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

  /* ── shared values ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);
  const maxSnapY = useSharedValue(TY_MID);
  const overscrollGlow = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const isSectionExpanded = useSharedValue(false);

  const hasRecommendations = recommendations.length > 0;

  // Update max snap when recommendations change
  const TY_ACTIVE = SCREEN_H * 0.5; // 50% height when journey active
  useEffect(() => {
    maxSnapY.value = hasRecommendations ? TY_HIGH_JOURNEY : TY_MID;
    if (hasRecommendations) {
      translateY.value = withSpring(TY_ACTIVE, SPRING_CFG);
      titleOpacity.value = withTiming(0, { duration: 300 });
    } else {
      translateY.value = withSpring(TY_MID, SPRING_CFG);
      titleOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [hasRecommendations]);

  /* ── Track last param set to avoid duplicate calls ── */
  const lastCallKey = useRef<string | null>(null);

  /* ── On mount: load any existing active journeys if no nav params provided ── */
  useEffect(() => {
    if (!authUserId) return;
    if (params.originLat || params.originLon || params.destStopId) return; // params will trigger createJourney instead

    const load = async () => {
      console.log(
        "[journey] no nav params — checking for existing active journeys",
      );
      try {
        const existing = await loadActiveJourneys(authUserId);
        if (existing.length > 0) {
          console.log(
            "[journey] restored",
            existing.length,
            "active journey(s)",
          );
          setJourneyId(existing[0].journeyId);
          setRecommendations(existing);
        } else {
          console.log("[journey] no active journeys found");
        }
      } catch (e: any) {
        console.warn(
          "[journey] failed to load active journeys on mount:",
          e?.message ?? e,
        );
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

    console.log("[journey] params received →", {
      originLat,
      originLon,
      destStopId,
      destStopName,
    });

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
          setError(
            "No buses found for this route right now. Try again shortly.",
          );
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
        console.warn(
          "[journey] createJourney error — status:",
          status,
          "msg:",
          msg,
        );

        if (status === 409) {
          // User already has active journeys — load and display them
          console.log(
            "[journey] 409 conflict — loading existing active journeys",
          );
          try {
            const existing = await loadActiveJourneys(authUserId);
            if (existing.length > 0) {
              console.log(
                "[journey] found",
                existing.length,
                "existing active journey(s)",
              );
              setJourneyId(existing[0].journeyId);
              setRecommendations(existing);
            } else {
              setError(
                "You have a journey in progress but it could not be loaded. Please try again.",
              );
            }
          } catch (loadErr: any) {
            console.warn(
              "[journey] failed to load existing journeys:",
              loadErr?.message ?? loadErr,
            );
            setError(
              "You already have an active journey. Please wait or try again shortly.",
            );
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
        console.log(
          "[journey] WS connected OK, subscribing to journeyId:",
          journeyId,
        );
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

  /* ── Smooth bus position via WS (replaces 10s HTTP poll) ── */
  const activeBusId = recommendations[0]?.activeBusId ?? null;
  const { displayPos, latestBus } = useBusPosition(activeBusId, routeStops);

  // Keep latestBus in a ref so the routeSegment effect can read fractionalIndex
  // without being in its dependency array (avoids rebuilding polyline every WS frame)
  const latestBusRef = useRef(latestBus);
  useEffect(() => {
    latestBusRef.current = latestBus;
  }, [latestBus]);

  /* ── One-time initial HTTP fetch so map/stops render before first WS frame ── */
  useEffect(() => {
    if (!activeBusId) return;
    getBusDetails(activeBusId)
      .then((details) => {
        // Only apply if WS hasn't already delivered a frame (latestBus takes precedence)
        setBusDetails((prev) => prev ?? details);
      })
      .catch((e: any) =>
        console.warn("[journey] initial bus fetch:", e?.message ?? e),
      );
  }, [activeBusId]);

  /* ── Sync latestBus → busDetails for route segment computation ── */
  useEffect(() => {
    if (!latestBus) return;
    // Bug #5 fix: merge WS fields onto existing busDetails instead of replacing.
    // A full replace wipes HTTP-loaded fields (e.g. routeId from the initial fetch)
    // that aren't present in the WS DTO, causing routeStops to fail to load.
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

  /* ── Fetch route stops whenever the active route changes ── */
  useEffect(() => {
    if (!busDetails?.routeId) return;
    fetchRouteStops(busDetails.routeId).then((stops) => {
      console.log(
        "[journey] setRouteStops — count:",
        stops.length,
        "routeId:",
        busDetails.routeId,
      );
      setRouteStops(stops);
    });
  }, [busDetails?.routeId]);

  /* ── Rebuild road polyline whenever bus advances to a new stop ──
   *
   * Bug #1 fix: use latestBus?.StopIndex directly (not busDetails?.stopIndex)
   * so the polyline rebuilds in the same render cycle as the WS frame, not one
   * cycle later after the busDetails sync effect has also run.
   *
   * Bug #4 fix: FractionalIndex is no longer in the dep array. The heavy
   * rebuild (finding stops, building the full segment path) runs only when the
   * bus changes stop index. Within-segment fractional changes only affect the
   * marker position (handled by the LERP in useBusPosition) and the polyline
   * start point (handled by the light effect below). This prevents the full
   * route geometry rebuild from firing at the WS frame rate (~1 fps).
   */
  useEffect(() => {
    const stopIndex = latestBus?.StopIndex ?? busDetails?.stopIndex;
    if (
      !routeStops ||
      routeStops.length < 2 ||
      stopIndex == null
    )
      return;
    const originStopId = recommendations[0]?.originStopId;

    const busStop = routeStops.find((s) => s.seq === stopIndex);
    setBusStopName(busStop?.name ?? null);
    console.log(
      "[journey] bus stop name:",
      busStop?.name,
      "seq:",
      stopIndex,
    );

    if (!originStopId) return;
    const userStop = routeStops.find((s) => s.id === originStopId);
    setUserStopName(userStop?.name ?? null);
    console.log(
      "[journey] user stop name:",
      userStop?.name,
      "id:",
      originStopId,
    );

    if (!busStop || !userStop) return;

    const busHasPassed = busStop.seq > userStop.seq;
    const busIsAtUserStop = busStop.seq === userStop.seq;
    if (busHasPassed || busIsAtUserStop) {
      setRouteSegment(undefined);
      return;
    }

    const frac = Math.max(0, Math.min(1, latestBusRef.current?.FractionalIndex ?? 0));

    const busPathToNext = busStop.pathToNext ?? [];
    if (busPathToNext.length === 0) {
      setRouteSegment(undefined);
      return;
    }

    const snappedStart = roadPosition(routeStops, busStop.seq, frac);
    if (!snappedStart) {
      setRouteSegment(undefined);
      return;
    }

    const coords: { lat: number; lon: number }[] = [snappedStart];
    const remaining = pathAfterFraction(busPathToNext, frac);
    coords.push(...remaining.slice(1));

    for (let seq = busStop.seq + 1; seq < userStop.seq; seq++) {
      const seg = routeStops.find((s) => s.seq === seq);
      if (seg?.pathToNext?.length) {
        coords.push(...seg.pathToNext);
      }
    }
    coords.push({ lat: userStop.lat, lon: userStop.lon });
    setRouteSegment(coords.length >= 2 ? coords : undefined);
  }, [
    routeStops,
    latestBus?.StopIndex,
    recommendations[0]?.originStopId,
  ]);

  const snapTo = useCallback(
    (target: number) => {
      "worklet";
      translateY.value = withSpring(target, SPRING_CFG);
    },
    [translateY],
  );

  /* ── Snap back when keyboard hides ── */
  const isEditingShortcutRef = useRef(false);
  useEffect(() => { isEditingShortcutRef.current = isEditingShortcut; }, [isEditingShortcut]);

  useEffect(() => {
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      const target = isEditingShortcutRef.current ? TY_HIGH : TY_MID;
      translateY.value = withSpring(target, SPRING_CFG);
    });
    return () => { hide.remove(); };
  }, []);

  /* ── Edit shortcut handlers ── */
  const handleEditStart = useCallback(() => {
    isSectionExpanded.value = true;
    setIsEditingShortcut(true);
    snapTo(TY_MID);
  }, [snapTo]);

  const handleEditClose = useCallback(() => {
    isSectionExpanded.value = false;
    setIsEditingShortcut(false);
    snapTo(TY_MID);
  }, [snapTo]);

  /* ── Pan gesture ── */
  /* ── Pan gesture ── */
  const pan = Gesture.Pan()
    .enabled(!isEditingShortcut)
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      const rawY = ctx.value + e.translationY;
      const currentMax = maxSnapY.value;
      // Restrict minimum based on whether shortcut editor is expanded
      const minY = isSectionExpanded.value ? TY_HIGH : currentMax;
      if (rawY < minY) {
        const overAmount = Math.min((minY - rawY) / 80, 1);
        overscrollGlow.value = overAmount;
      } else {
        overscrollGlow.value = withTiming(0, { duration: 150 });
      }
      translateY.value = Math.max(minY, Math.min(rawY, TY_LOW));
    })
    .onEnd((e) => {
      overscrollGlow.value = withTiming(0, { duration: 200 });
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;
      const maxSnap = maxSnapY.value;

      // Choose snap points based on whether shortcut editor is expanded
      const snaps = isSectionExpanded.value
        ? [TY_HIGH, TY_MID, TY_LOW]
        : [maxSnap, TY_MID, TY_LOW];

      if (Math.abs(v) > FLING) {
        if (v > 0) {
          // Fling down
          if (isSectionExpanded.value) {
            snapTo(cur < TY_MID ? TY_MID : TY_LOW);
          } else {
            snapTo(cur < TY_MID ? TY_MID : TY_LOW);
          }
        } else {
          // Fling up - only allow HIGH if shortcut editor is expanded
          if (isSectionExpanded.value) {
            snapTo(cur > TY_MID ? TY_MID : TY_HIGH);
          } else {
            snapTo(cur > TY_MID ? TY_MID : maxSnap);
          }
        }
        return;
      }

      // Find closest snap point
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

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  /* ── Handlers ── */
  const handleEndTracking = useCallback(() => {
    console.log("[journey] end tracking, journeyId:", journeyId);

    // Cancel all real journey IDs on the backend (skip synthetic alt-IDs)
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
    translateY.value = withSpring(TY_MID, SPRING_CFG);
  }, [journeyId, recommendations]);

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
  // userPosition: prefer nav params (new journey); fall back to route stop coords
  // (restored journey where params are absent) so overview/compass always works.
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
  }, [
    hasRecommendations,
    params.originLat,
    params.originLon,
    originStopId,
    routeStops,
  ]);

  // Only use the LERP-interpolated WS position for the marker.
  // No HTTP pre-fetch fallback — marker stays hidden until the first WS frame
  // arrives so the user never sees the bus jump from a stale HTTP position.
  const busPosition = displayPos ?? undefined;

  // Camera target: snapped road position from the latest WS frame (~every 2–3 s).
  // Intentionally NOT the LERP position — camera follows at GPS rate so it never
  // fights user pinch/pan gestures (which fire much faster than GPS updates).
  const cameraTarget = useMemo(() => {
    if (!latestBus) return undefined;
    const frac = Math.max(0, Math.min(1, latestBus.FractionalIndex));
    const snapped =
      routeStops && routeStops.length >= 2
        ? roadPosition(routeStops, latestBus.StopIndex, frac)
        : null;
    return (
      snapped ?? { lat: latestBus.Position.Lat, lon: latestBus.Position.Lon }
    );
  }, [latestBus, routeStops]);

  /* ── Navigation banner data ── */
  const navBanner = useMemo(() => {
    if (!latestBus || !routeStops || routeStops.length === 0) return null;

    const sorted = [...routeStops].sort((a, b) => a.seq - b.seq);
    const currentStop = sorted.find((s) => s.seq === latestBus.StopIndex);
    const nextStop = sorted.find((s) => s.seq === latestBus.StopIndex + 1);

    // "At stop" when fractional is very low (just arrived / dwelling)
    const isAtStop = latestBus.FractionalIndex < 0.08;

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

    // Compact distance to user's boarding stop (no "away" suffix)
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
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={32}
            color="#ff6b6b"
          />
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
          onFieldFocus={() => { translateY.value = withSpring(TY_HIGH, SPRING_CFG); }}
          onFieldBlur={() => { translateY.value = withSpring(TY_MID, SPRING_CFG); }}
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

      {/* Route loading indicator — shown while bus is known but road geometry not yet ready */}
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

  // ── Navigation banner ──────────────────────────────────────────────────────
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
