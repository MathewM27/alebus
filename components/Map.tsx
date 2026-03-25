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
  busPosition?: { lat: number; lon: number };
  busHeading?: number;        // compass bearing 0–360 for heading-up follow mode
  userPosition?: { lat: number; lon: number };
  routeSegment?: { lat: number; lon: number }[];
}

export default function Map({
  style,
  center = MAURITIUS_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  busPosition,
  busHeading = 0,
  userPosition,
  routeSegment,
}: MapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const { mapStyleUrl } = useMapTheme();

  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  // Track current map heading so the compass icon rotates correctly
  const [mapHeading, setMapHeading] = useState(0);
  const relockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapReadyRef = useRef(false);

  const hasBusPos = !!busPosition &&
    (Math.abs(busPosition.lat) > 0.001 || Math.abs(busPosition.lon) > 0.001);
  const hasUserPos = !!userPosition &&
    (Math.abs(userPosition.lat) > 0.001 || Math.abs(userPosition.lon) > 0.001);

  // ── Imperative camera updates ────────────────────────────────────────────
  const applyCamera = useCallback((mode: CameraMode) => {
    const cam = cameraRef.current;
    if (!cam || !mapReadyRef.current) return;

    if (mode === "free") return; // don't touch camera when user is panning

    if (mode === "follow") {
      if (hasBusPos) {
        cam.setCamera({
          centerCoordinate: [busPosition!.lon, busPosition!.lat],
          zoomLevel: 16,
          pitch: 45,
          heading: busHeading,
          animationDuration: 600,
          animationMode: "flyTo",
        });
      } else if (hasUserPos) {
        cam.setCamera({
          centerCoordinate: [userPosition!.lon, userPosition!.lat],
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
      if (hasBusPos && hasUserPos) {
        const minLon = Math.min(busPosition!.lon, userPosition!.lon);
        const maxLon = Math.max(busPosition!.lon, userPosition!.lon);
        const minLat = Math.min(busPosition!.lat, userPosition!.lat);
        const maxLat = Math.max(busPosition!.lat, userPosition!.lat);
        const pad = 0.008; // ~800m padding so markers aren't at the very edge
        cam.setCamera({
          bounds: {
            ne: [maxLon + pad, maxLat + pad] as [number, number],
            sw: [minLon - pad, minLat - pad] as [number, number],
            paddingTop: 80,
            paddingRight: 60,
            paddingBottom: 220, // leave room for bottom sheet
            paddingLeft: 60,
          },
          pitch: 0,
          heading: 0,
          animationDuration: 800,
          animationMode: "flyTo",
        });
      } else {
        // Can't show overview without both points — fall back to follow
        setCameraMode("follow");
      }
    }
  }, [hasBusPos, hasUserPos, busPosition, userPosition, busHeading]);

  // Re-apply camera whenever bus moves (but only when locked)
  useEffect(() => {
    applyCamera(cameraMode);
  }, [cameraMode, busPosition, busHeading, applyCamera]);

  // ── User interaction detection ───────────────────────────────────────────
  const handleRegionDidChange = useCallback((event: any) => {
    // MapLibre fires this with properties.isUserInteraction = true for gesture-driven changes
    if (!event?.properties?.isUserInteraction) return;

    // Track current heading for compass rotation
    const heading = event?.properties?.heading ?? 0;
    setMapHeading(heading);

    // Switch to free mode and schedule auto-relock
    setCameraMode("free");
    if (relockTimer.current) clearTimeout(relockTimer.current);
    relockTimer.current = setTimeout(() => {
      setCameraMode("follow");
    }, FREE_RELOCK_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (relockTimer.current) clearTimeout(relockTimer.current);
    };
  }, []);

  // ── Compass / mode button ────────────────────────────────────────────────
  const handleCompassPress = useCallback(() => {
    if (relockTimer.current) clearTimeout(relockTimer.current);

    if (cameraMode === "follow") {
      // Switch to overview so the user can see both bus and their stop
      setCameraMode("overview");
    } else {
      // Re-lock to follow (bus navigation mode)
      setCameraMode("follow");
    }
  }, [cameraMode]);

  // Compass icon + label based on mode
  const compassIcon = cameraMode === "follow" ? "compass" : "crosshairs-gps";
  const compassActive = cameraMode !== "follow";

  // ── Route line GeoJSON ───────────────────────────────────────────────────
  const lineCoords = useMemo<[number, number][]>(
    () =>
      routeSegment && routeSegment.length >= 2
        ? routeSegment.map((p) => [p.lon, p.lat])
        : [],
    [routeSegment],
  );

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
        compassEnabled={false}   // we render our own compass button
        onDidFinishLoadingMap={() => {
          mapReadyRef.current = true;
          applyCamera(cameraMode);
          onMapReady?.();
        }}
        onRegionDidChange={handleRegionDidChange}
      >
        {/* Camera — default settings only; all subsequent moves are imperative */}
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: hasBusPos
              ? [busPosition!.lon, busPosition!.lat]
              : hasUserPos
                ? [userPosition!.lon, userPosition!.lat]
                : center,
            zoomLevel: hasBusPos ? 16 : hasUserPos ? 15 : zoom,
            pitch: hasBusPos ? 45 : 0,
            heading: hasBusPos ? busHeading : 0,
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

        {/* Bus marker */}
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

      {/* Compass / mode button — top-right, clear of status bar */}
      <Pressable
        style={[styles.compassBtn, compassActive && styles.compassBtnActive]}
        onPress={handleCompassPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {/* Compass needle rotates to show current map north */}
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
