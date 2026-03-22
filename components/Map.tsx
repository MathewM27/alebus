import {
  Camera,
  CameraRef,
  LineLayer,
  Logger,
  MapView,
  MarkerView,
  ShapeSource,
} from "@maplibre/maplibre-react-native";
import React, { useRef } from "react";
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
}

export default function Map({
  style,
  center = MAURITIUS_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  busPosition,
  userPosition,
}: MapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const { mapStyleUrl } = useMapTheme();

  // When both positions exist, center the camera between them
  const cameraCenter: [number, number] = busPosition && userPosition
    ? [
        (busPosition.lon + userPosition.lon) / 2,
        (busPosition.lat + userPosition.lat) / 2,
      ]
    : busPosition
      ? [busPosition.lon, busPosition.lat]
      : center;

  const cameraZoom = busPosition ? 14 : zoom;

  // GeoJSON line connecting bus → user
  const lineGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features:
      busPosition && userPosition
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [busPosition.lon, busPosition.lat],
                  [userPosition.lon, userPosition.lat],
                ],
              },
            },
          ]
        : [],
  };

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

        {/* Dashed line from bus to user */}
        {busPosition && userPosition && (
          <ShapeSource id="bus-line-source" shape={lineGeoJSON}>
            <LineLayer
              id="bus-line-layer"
              style={{
                lineColor: ACCENT,
                lineWidth: 2,
                lineDasharray: [4, 3],
                lineOpacity: 0.7,
              }}
            />
          </ShapeSource>
        )}

        {/* Bus marker */}
        {busPosition && (
          <MarkerView
            coordinate={[busPosition.lon, busPosition.lat]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.busMarker}>
              <MaterialCommunityIcons name="bus" size={16} color="#000" />
            </View>
          </MarkerView>
        )}

        {/* User / origin marker */}
        {userPosition && (
          <MarkerView
            coordinate={[userPosition.lon, userPosition.lat]}
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
});
