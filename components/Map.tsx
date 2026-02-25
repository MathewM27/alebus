import { Camera, CameraRef, Logger, MapView } from "@maplibre/maplibre-react-native";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";

// ─────────────────────────────────────────────────
// Suppress noisy MapLibre logs (Canceled requests are normal)
// ─────────────────────────────────────────────────
Logger.setLogCallback((log) => {
  const { message } = log;
  if (message.includes("Request failed due to a permanent error: Canceled")) return true;
  return false;
});

// ─────────────────────────────────────────────────
// Hosted MapLibre style URL
// ─────────────────────────────────────────────────
const STYLE_URL =
  "https://alebus-maps-worker.mathewsmwangi6927.workers.dev/style.json?v=20260224-compat1";

// ─────────────────────────────────────────────────
// Mauritius coordinates and bounds (lon, lat for MapLibre)
// ─────────────────────────────────────────────────
const MAURITIUS_CENTER: [number, number] = [57.55, -20.25];
const MAURITIUS_BOUNDS = {
  sw: [57.10, -20.75] as [number, number],
  ne: [57.95, -19.85] as [number, number],
};

// ─────────────────────────────────────────────────
// Zoom constraints (prevents ocean roaming & Rodrigues visibility)
// ─────────────────────────────────────────────────
const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 9; // Mauritius-only zoom-out limit
const MAX_ZOOM = 14; // Matches PMTiles maxzoom

// ─────────────────────────────────────────────────
// Props interface
// ─────────────────────────────────────────────────
export interface MapProps {
  style?: object;
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  onMapReady?: () => void;
}

// ─────────────────────────────────────────────────
// Map Component: MapLibre native map with Mauritius bounds
// ─────────────────────────────────────────────────
export default function Map({
  style,
  center = MAURITIUS_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
}: MapProps) {
  const cameraRef = useRef<CameraRef>(null);

  return (
    <View style={[StyleSheet.absoluteFillObject, style]}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        key={STYLE_URL}
        mapStyle={STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        
        compassEnabled={false}
        onDidFinishLoadingMap={onMapReady}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: center,
            zoomLevel: zoom,
          }}
          minZoomLevel={MIN_ZOOM}
          maxZoomLevel={MAX_ZOOM}
          bounds={{
            sw: MAURITIUS_BOUNDS.sw,
            ne: MAURITIUS_BOUNDS.ne,
            paddingTop: 40,
            paddingBottom: 40,
            paddingLeft: 40,
            paddingRight: 40,
          }}
        />
      </MapView>
    </View>
  );
}
