/**
 * Road-accurate bus position snapping.
 *
 * The backend sends StopIndex + FractionalIndex per GPS update.
 * roadPosition() uses those values + the route's pathToNext polylines to
 * compute the exact road position — matching the ops dashboard approach.
 */

import type { RouteStop } from '@/services/api/stops';

/** Haversine distance in metres between two lat/lon points. */
function haversine(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLon * sinDLon;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Compute road-snapped display position from stopIndex + fractionalIndex.
 *
 * stopIndex   = seq of the stop the bus has most recently passed
 * fractional  = 0.0–1.0 how far along the segment to the next stop
 *
 * If the segment has a pathToNext polyline the position is interpolated
 * along the road geometry; otherwise falls back to linear stop-to-stop.
 *
 * Returns null if geometry is missing or stopIndex is out of range.
 */
export function roadPosition(
  stops: RouteStop[],
  stopIndex: number,
  fractionalIndex: number,
): { lat: number; lon: number } | null {
  if (!stops || stops.length < 2) return null;

  // Stops from the API are ordered by seq but may not start at 0 — find by seq value.
  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  const idx = sorted.findIndex((s) => s.seq === stopIndex);
  if (idx < 0 || idx >= sorted.length - 1) return null;

  const from = sorted[idx];
  const to   = sorted[idx + 1];
  const t    = Math.max(0, Math.min(1, fractionalIndex));

  const path = from.pathToNext;
  if (!path || path.length < 2) {
    // No road geometry — straight line between stop coords
    return {
      lat: from.lat + (to.lat - from.lat) * t,
      lon: from.lon + (to.lon - from.lon) * t,
    };
  }

  if (t === 0) return { lat: path[0].lat,                    lon: path[0].lon };
  if (t === 1) return { lat: path[path.length - 1].lat,      lon: path[path.length - 1].lon };

  // Compute cumulative lengths along the polyline
  let totalLen = 0;
  const segLengths: number[] = [];
  for (let j = 0; j < path.length - 1; j++) {
    const d = haversine(path[j], path[j + 1]);
    segLengths.push(d);
    totalLen += d;
  }

  if (totalLen === 0) return { lat: path[0].lat, lon: path[0].lon };

  // Walk along polyline until we reach t * totalLen
  const target  = t * totalLen;
  let   traveled = 0;
  for (let j = 0; j < segLengths.length; j++) {
    const segLen = segLengths[j];
    if (traveled + segLen >= target) {
      const segT = segLen > 0 ? (target - traveled) / segLen : 0;
      return {
        lat: path[j].lat + (path[j + 1].lat - path[j].lat) * segT,
        lon: path[j].lon + (path[j + 1].lon - path[j].lon) * segT,
      };
    }
    traveled += segLen;
  }

  // Past the end — return last polyline point
  return { lat: path[path.length - 1].lat, lon: path[path.length - 1].lon };
}
