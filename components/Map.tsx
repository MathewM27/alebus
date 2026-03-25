import {
  Camera,
  CameraRef,
  LineLayer,
  Logger,
  MapView,
  MarkerView,
  ShapeSource,
} from "@maplibre/maplibre-react-native";
import React, { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
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

        {/* User / origin marker — flag milestone */}
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
});
