import {
  Camera,
  CameraRef,
  LineLayer,
  Logger,
  MapView,
  MarkerView,
  ShapeSource,
} from "@maplibre/maplibre-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useMapTheme } from "@/contexts/MapThemeContext";

Logger.setLogCallback((log) => {
  if (log.message.includes("Request failed due to a permanent error: Canceled")) return true;
  return false;
});

const MAURITIUS_CENTER: [number, number] = [57.55, -20.25];
const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 9;
const MAX_ZOOM = 18;
const ACCENT = "#c1ec72";

// How long (ms) after the user stops panning before we re-lock to follow mode
const FREE_RELOCK_MS = 5_000;

type CameraMode = "follow" | "overview" | "free";

export interface MapProps {
  style?: object;
  center?: [number, number];
  zoom?: number;
  onMapReady?: () => void;
  /** LERP-interpolated position — used only to render the bus marker (20 fps). */
  busPosition?: { lat: number; lon: number };
  /**
   * GPS-rate position — used for camera following (~1 update per 2–3 s).
   * Kept separate from busPosition so the camera never races with LERP ticks.
   */
  cameraTarget?: { lat: number; lon: number };
  userPosition?: { lat: number; lon: number };
  routeSegment?: { lat: number; lon: number }[];
}

export default function Map({
  style,
  center = MAURITIUS_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  busPosition,
  cameraTarget,
  userPosition,
  routeSegment,
}: MapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const { mapStyleUrl } = useMapTheme();

  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  // Ref mirrors state — written synchronously so camera callbacks always see
  // the current intent without waiting for a React re-render cycle.
  const cameraModeRef = useRef<CameraMode>("follow");

  const [mapHeading, setMapHeading] = useState(0);
  const relockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapReadyRef = useRef(false);

  // Keep latest values in refs so stable callbacks can read them without
  // being re-created (and without triggering unwanted effect re-runs).
  const cameraTargetRef = useRef(cameraTarget);
  const userPositionRef = useRef(userPosition);
  useEffect(() => { cameraTargetRef.current = cameraTarget; }, [cameraTarget]);
  useEffect(() => { userPositionRef.current = userPosition; }, [userPosition]);

  const hasBusPos = !!busPosition &&
    (Math.abs(busPosition.lat) > 0.001 || Math.abs(busPosition.lon) > 0.001);
  const hasUserPos = !!userPosition &&
    (Math.abs(userPosition.lat) > 0.001 || Math.abs(userPosition.lon) > 0.001);

  // ── Mode-transition camera (stable, reads from refs) ─────────────────────
  // Called ONLY when the camera mode changes (follow ↔ overview ↔ free),
  // NOT on every position update.  Sets zoom, pitch, heading once per transition.
  const initializeCamera = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam || !mapReadyRef.current) return;
    const mode = cameraModeRef.current;
    if (mode === "free") return;

    const ct = cameraTargetRef.current;
    const up = userPositionRef.current;
    const hasCT = !!ct && (Math.abs(ct.lat) > 0.001 || Math.abs(ct.lon) > 0.001);
    const hasUP = !!up && (Math.abs(up.lat) > 0.001 || Math.abs(up.lon) > 0.001);

    if (mode === "follow") {
      if (hasCT) {
        cam.setCamera({
          centerCoordinate: [ct!.lon, ct!.lat],
          zoomLevel: 16,
          pitch: 0,
          heading: 0,
          animationDuration: 600,
          animationMode: "flyTo",
        });
      } else if (hasUP) {
        cam.setCamera({
          centerCoordinate: [up!.lon, up!.lat],
          zoomLevel: 15,
          pitch: 0,
          heading: 0,
          animationDuration: 600,
          animationMode: "flyTo",
        });
      }
      return;
    }

    if (mode === "overview") {
      if (hasCT && hasUP) {
        const minLon = Math.min(ct!.lon, up!.lon);
        const maxLon = Math.max(ct!.lon, up!.lon);
        const minLat = Math.min(ct!.lat, up!.lat);
        const maxLat = Math.max(ct!.lat, up!.lat);
        const pad = 0.008;
        cam.setCamera({
          bounds: {
            ne: [maxLon + pad, maxLat + pad] as [number, number],
            sw: [minLon - pad, minLat - pad] as [number, number],
            paddingTop: 80,
            paddingRight: 60,
            paddingBottom: 220,
            paddingLeft: 60,
          },
          pitch: 0,
          heading: 0,
          animationDuration: 800,
          animationMode: "flyTo",
        });
      } else {
        // No user position yet — fall back to follow
        cameraModeRef.current = "follow";
        setCameraMode("follow");
      }
    }
  }, []); // stable

  // Mode-change effect
  useEffect(() => {
    initializeCamera();
  }, [cameraMode, initializeCamera]);

  // ── GPS-rate position follow ──────────────────────────────────────────────
  // Fires only when a new GPS frame arrives from the backend (~every 2–3 s).
  // Uses linearTo so the camera smoothly traverses between GPS positions.
  // Because this runs at GPS rate (not LERP rate), it never fights gestures.
  useEffect(() => {
    if (cameraModeRef.current !== "follow") return;
    const cam = cameraRef.current;
    if (!cam || !mapReadyRef.current || !cameraTarget) return;
    cam.setCamera({
      centerCoordinate: [cameraTarget.lon, cameraTarget.lat],
      animationDuration: 2000,
      animationMode: "linearTo",
    });
  }, [cameraTarget]);

  // ── Gesture detection ─────────────────────────────────────────────────────
  // onRegionWillChange fires at gesture START — we set free mode here so the
  // next GPS-rate camera update (up to 2–3 s away) won't interrupt the gesture.
  const handleRegionWillChange = useCallback((event: any) => {
    if (!event?.properties?.isUserInteraction) return;
    cameraModeRef.current = "free";
    setCameraMode("free");
    if (relockTimer.current) clearTimeout(relockTimer.current);
  }, []);

  // onRegionDidChange fires when camera stops — track heading + start relock.
  const handleRegionDidChange = useCallback((event: any) => {
    const heading = event?.properties?.heading ?? 0;
    setMapHeading(heading);
    if (!event?.properties?.isUserInteraction) return;
    if (relockTimer.current) clearTimeout(relockTimer.current);
    relockTimer.current = setTimeout(() => {
      cameraModeRef.current = "follow";
      setCameraMode("follow");
    }, FREE_RELOCK_MS);
  }, []);

  useEffect(() => {
    return () => { if (relockTimer.current) clearTimeout(relockTimer.current); };
  }, []);

  // ── Compass / mode toggle ────────────────────────────────────────────────
  const handleCompassPress = useCallback(() => {
    if (relockTimer.current) clearTimeout(relockTimer.current);
    const next: CameraMode = cameraModeRef.current === "follow" ? "overview" : "follow";
    cameraModeRef.current = next;
    setCameraMode(next);
    initializeCamera();
  }, [initializeCamera]);

  const compassIcon = cameraMode === "follow" ? "compass" : "crosshairs-gps";
  const compassActive = cameraMode !== "follow";

  // ── Route line GeoJSON ───────────────────────────────────────────────────
  const lineCoords = useMemo<[number, number][]>(() => {
    const coords =
      routeSegment && routeSegment.length >= 2
        ? routeSegment.map((p): [number, number] => [p.lon, p.lat])
        : [];
    console.log("[Map] lineCoords updated — points:", coords.length, "first:", coords[0], "last:", coords[coords.length - 1]);
    return coords;
  }, [routeSegment]);

  const lineGeoJSON: GeoJSON.FeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection",
      features:
        lineCoords.length >= 2
          ? [{
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: lineCoords },
            }]
          : [],
    }),
    [lineCoords],
  );

  return (
    <View style={[StyleSheet.absoluteFillObject, style]}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        key={mapStyleUrl}
        mapStyle={mapStyleUrl}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={() => {
          mapReadyRef.current = true;
          initializeCamera();
          onMapReady?.();
        }}
        onRegionWillChange={handleRegionWillChange}
        onRegionDidChange={handleRegionDidChange}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: cameraTarget
              ? [cameraTarget.lon, cameraTarget.lat]
              : hasUserPos
                ? [userPosition!.lon, userPosition!.lat]
                : center,
            zoomLevel: cameraTarget ? 16 : hasUserPos ? 15 : zoom,
            pitch: 0,
            heading: 0,
          }}
          minZoomLevel={MIN_ZOOM}
          maxZoomLevel={MAX_ZOOM}
        />

        {/* Route line: glow + solid */}
        {lineCoords.length >= 2 && (
          <ShapeSource id="bus-line-source" shape={lineGeoJSON}>
            <LineLayer
              id="bus-line-glow"
              style={{
                lineColor: ACCENT,
                lineWidth: 10,
                lineOpacity: 0.18,
                lineBlur: 6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <LineLayer
              id="bus-line-layer"
              style={{
                lineColor: ACCENT,
                lineWidth: 3,
                lineOpacity: 0.92,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </ShapeSource>
        )}

        {/* Bus marker — rendered at LERP position for smooth animation */}
        {hasBusPos && (
          <MarkerView
            coordinate={[busPosition!.lon, busPosition!.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.busMarker}>
              <MaterialCommunityIcons name="bus" size={16} color="#000" />
            </View>
          </MarkerView>
        )}

        {/* User boarding stop — flag milestone */}
        {hasUserPos && (
          <MarkerView
            coordinate={[userPosition!.lon, userPosition!.lat]}
            anchor={{ x: 0.15, y: 1.0 }}
          >
            <View style={styles.userMarker}>
              <MaterialCommunityIcons name="flag-variant" size={22} color={ACCENT} />
            </View>
          </MarkerView>
        )}
      </MapView>

      {/* Compass / mode button */}
      <Pressable
        style={[styles.compassBtn, compassActive && styles.compassBtnActive]}
        onPress={handleCompassPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={{ transform: [{ rotate: `${-mapHeading}deg` }] }}>
          <MaterialCommunityIcons
            name={compassIcon}
            size={24}
            color={compassActive ? ACCENT : "#fff"}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  busMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  userMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  compassBtn: {
    position: "absolute",
    bottom: 160,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(13,13,13,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  compassBtnActive: {
    borderColor: ACCENT,
    backgroundColor: "rgba(13,13,13,0.95)",
  },
});
