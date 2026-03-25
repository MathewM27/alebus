import {
  Camera,
  CameraRef,
  LineLayer,
  Logger,
  MapView,
  MarkerView,
  ShapeSource,
} from "@maplibre/maplibre-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useMapTheme } from "@/contexts/MapThemeContext";

Logger.setLogCallback((log) => {
  if (log.message.includes("Request failed due to a permanent error: Canceled")) return true;
  return false;
});

const MAURITIUS_CENTER: [number, number] = [57.55, -20.25];

const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 9;
const MAX_ZOOM = 16;

const ACCENT = "#c1ec72";
// Duration for the dot to travel the full line once (ms)
const DOT_DURATION_MS = 3500;

export interface MapProps {
  style?: object;
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  onMapReady?: () => void;
  busPosition?: { lat: number; lon: number };
  userPosition?: { lat: number; lon: number };
  routeSegment?: { lat: number; lon: number }[]; // ordered road geometry bus→user
}

export default function Map({
  style,
  center = MAURITIUS_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  busPosition,
  userPosition,
  routeSegment,
}: MapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const { mapStyleUrl } = useMapTheme();

  // Guard against uninitialized GPS (0,0 = null island)
  const hasBusPos = !!busPosition && (Math.abs(busPosition.lat) > 0.001 || Math.abs(busPosition.lon) > 0.001);
  const hasUserPos = !!userPosition && (Math.abs(userPosition.lat) > 0.001 || Math.abs(userPosition.lon) > 0.001);

  // Camera follows bus when available (navigation mode), else fallback
  const cameraCenter: [number, number] = hasBusPos
    ? [busPosition!.lon, busPosition!.lat]
    : hasUserPos
      ? [userPosition!.lon, userPosition!.lat]
      : center;

  const cameraZoom = hasBusPos ? 15 : zoom;

  // Memoise so lineCoords reference is stable — animation effect only re-fires when
  // the actual segment changes, not on unrelated re-renders.
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
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: lineCoords,
                },
              },
            ]
          : [],
    }),
    [lineCoords],
  );

  // ── Animated dot ──────────────────────────────────────────────────────────
  // Pre-compute cumulative arc lengths (in degree space — good enough for
  // interpolation; we only need relative proportions).
  const segmentData = useMemo(() => {
    if (lineCoords.length < 2) return null;
    let total = 0;
    const cum: number[] = [0];
    for (let i = 1; i < lineCoords.length; i++) {
      const dx = lineCoords[i][0] - lineCoords[i - 1][0];
      const dy = lineCoords[i][1] - lineCoords[i - 1][1];
      total += Math.sqrt(dx * dx + dy * dy);
      cum.push(total);
    }
    return { total, cum };
  }, [lineCoords]);

  const dotProgress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [dotCoord, setDotCoord] = useState<[number, number] | null>(null);

  useEffect(() => {
    // Stop any running animation and clear the dot when the line is gone or too short.
    if (!segmentData || lineCoords.length < 2) {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
      setDotCoord(null);
      return;
    }

    const { total, cum } = segmentData;
    dotProgress.setValue(0);

    // On every animation tick, interpolate position along the polyline.
    const listenerId = dotProgress.addListener(({ value }) => {
      const dist = value * total;
      let i = 0;
      while (i < cum.length - 2 && dist > cum[i + 1]) i++;
      const segLen = cum[i + 1] - cum[i];
      const t = segLen === 0 ? 0 : (dist - cum[i]) / segLen;
      const lon = lineCoords[i][0] + t * (lineCoords[i + 1][0] - lineCoords[i][0]);
      const lat = lineCoords[i][1] + t * (lineCoords[i + 1][1] - lineCoords[i][1]);
      setDotCoord([lon, lat]);
    });

    const anim = Animated.loop(
      Animated.timing(dotProgress, {
        toValue: 1,
        duration: DOT_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false, // must be false — drives JS-side interpolation
      }),
    );
    animRef.current = anim;
    anim.start();

    return () => {
      anim.stop();
      dotProgress.removeListener(listenerId);
      animRef.current = null;
    };
  }, [segmentData]);

  return (
    <View style={[StyleSheet.absoluteFillObject, style]}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        key={mapStyleUrl}
        mapStyle={mapStyleUrl}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={onMapReady}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: cameraCenter,
            zoomLevel: cameraZoom,
          }}
          centerCoordinate={cameraCenter}
          zoomLevel={cameraZoom}
          animationMode="flyTo"
          animationDuration={800}
          minZoomLevel={MIN_ZOOM}
          maxZoomLevel={MAX_ZOOM}
        />

        {/* Route line: glow layer + solid layer */}
        {lineCoords.length >= 2 && (
          <ShapeSource id="bus-line-source" shape={lineGeoJSON}>
            {/* Wide blurred layer gives the glow halo */}
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
            {/* Solid crisp line on top */}
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

        {/* Animated dot travelling along the route line */}
        {dotCoord && lineCoords.length >= 2 && (
          <MarkerView
            coordinate={dotCoord}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.routeDot} />
          </MarkerView>
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

        {/* User / origin marker */}
        {hasUserPos && (
          <MarkerView
            coordinate={[userPosition!.lon, userPosition!.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarker}>
              <View style={styles.userDot} />
            </View>
          </MarkerView>
        )}
      </MapView>
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  // Animated travelling dot — dark fill with accent border so it reads clearly
  // against the glowing line underneath.
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0d0d0d",
    borderWidth: 2.5,
    borderColor: ACCENT,
  },
});
