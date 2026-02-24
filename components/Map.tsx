import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// ─────────────────────────────────────────────────
// Feature flag: set to false to revert to WebView
// ─────────────────────────────────────────────────
const USE_MAPLIBRE = false; // Set to true after running: npx expo prebuild --clean && npx expo run:android

// Conditional import to avoid native module errors when not using MapLibre
const MapLibreGL = USE_MAPLIBRE ? require("@maplibre/maplibre-react-native").default : null;

// ─────────────────────────────────────────────────
// Hosted MapLibre style URL
// ─────────────────────────────────────────────────
const STYLE_URL =
  "https://alebus-maps-worker.mathewsmwangi6927.workers.dev/style.json";

// ─────────────────────────────────────────────────
// Mauritius coordinates (lon, lat for MapLibre)
// ─────────────────────────────────────────────────
const MAURITIUS_CENTER: [number, number] = [57.55, -20.25];
const DEFAULT_ZOOM = 10;

// ─────────────────────────────────────────────────
// Fallback Leaflet HTML generator
// ─────────────────────────────────────────────────
const generateLeafletHTML = (
  center: [number, number],
  zoom: number,
): string => {
  // Convert [lon, lat] to [lat, lon] for Leaflet
  const leafletCenter = [center[1], center[0]];
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #aadaff; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: ${JSON.stringify(leafletCenter)},
      zoom: ${zoom},
      zoomControl: false,
      attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, subdomains: 'abc'
    }).addTo(map);
  <\/script>
</body>
</html>
`;
};

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
// Map Component: Surgical wrapper for map rendering
// ─────────────────────────────────────────────────
export default function Map({
  style,
  center = MAURITIUS_CENTER,
  zoom = DEFAULT_ZOOM,
  onMapReady,
}: MapProps) {
  if (USE_MAPLIBRE) {
    return (
      <View style={[StyleSheet.absoluteFillObject, style]}>
        <MapLibreGL.MapView
          style={StyleSheet.absoluteFillObject}
          mapStyle={STYLE_URL}
          logoEnabled={false}
          attributionEnabled={false}
          onDidFinishLoadingMap={onMapReady}
        >
          <MapLibreGL.Camera
            zoomLevel={zoom}
            centerCoordinate={center}
          />
        </MapLibreGL.MapView>
      </View>
    );
  }

  // Fallback to WebView + Leaflet
  const leafletHTML = generateLeafletHTML(center, zoom);
  return (
    <WebView
      source={{ html: leafletHTML }}
      style={[StyleSheet.absoluteFillObject, style]}
      scrollEnabled={false}
      overScrollMode="never"
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      renderLoading={() => (
        <View style={[StyleSheet.absoluteFillObject, styles.loading]} />
      )}
      onLoad={onMapReady}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    backgroundColor: "#aadaff",
  },
});
