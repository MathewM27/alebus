import MapLibreGL, { Logger } from "@maplibre/maplibre-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

// ─────────────────────────────────────────────────
// Suppress noisy MapLibre logs (Canceled requests are normal)
// ─────────────────────────────────────────────────
Logger.setLogCallback((log) => {
  const { message } = log;
  // Ignore "Canceled" logs - these are normal during navigation/zoom
  if (message.includes("Request failed due to a permanent error: Canceled")) {
    return true; // Suppress this log
  }
  return false; // Let other logs through
});

// ─────────────────────────────────────────────────
// Feature flag: Enable MapLibre native maps
// ─────────────────────────────────────────────────
const USE_MAPLIBRE = true;

// ─────────────────────────────────────────────────
// Hosted MapLibre style URL
// ─────────────────────────────────────────────────
const STYLE_URL =
  "https://alebus-maps-worker.mathewsmwangi6927.workers.dev/style.json?v=20260224-compat1";

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
          key={STYLE_URL}
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
