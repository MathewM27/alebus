/**
 * Route geometry utilities — ported from ops dashboard lib/route-geometry.ts.
 *
 * The backend sends stopIndex + fractionalIndex per GPS update.
 * roadPosition() uses those + the route stop polylines to compute
 * the exact road coordinate to display on the map.
 */

export interface RouteStop {
  id: string;
  lat: number;
  lon: number;
  pathToNext?: { lat: number; lon: number }[];
}

export interface RouteGeometry {
  routeId: string;
  stops: RouteStop[];
}

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
 * stopIndex = N  → bus is in the segment from stop[N] to stop[N+1]
 * fractionalIndex = 0.0..1.0 → how far along that segment
 *
 * Returns null if geometry is missing or indices are out of range.
 */
export function roadPosition(
  geometry: RouteGeometry,
  stopIndex: number,
  fractionalIndex: number,
): { lat: number; lon: number } | null {
  const stops = geometry.stops;
  if (!stops || stops.length < 2) return null;

  const i = Math.max(0, Math.min(stopIndex, stops.length - 2));
  const from = stops[i];
  const to = stops[i + 1];
  const t = Math.max(0, Math.min(1, fractionalIndex));

  const path = from.pathToNext;
  if (!path || path.length < 2) {
    return {
      lat: from.lat + (to.lat - from.lat) * t,
      lon: from.lon + (to.lon - from.lon) * t,
    };
  }

  if (t === 0) return { lat: path[0].lat, lon: path[0].lon };
  if (t === 1) return { lat: path[path.length - 1].lat, lon: path[path.length - 1].lon };

  let totalLen = 0;
  const segLengths: number[] = [];
  for (let j = 0; j < path.length - 1; j++) {
    const d = haversine(path[j], path[j + 1]);
    segLengths.push(d);
    totalLen += d;
  }

  if (totalLen === 0) return { lat: path[0].lat, lon: path[0].lon };

  const target = t * totalLen;
  let traveled = 0;
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

  return { lat: path[path.length - 1].lat, lon: path[path.length - 1].lon };
}

/**
 * Road length in metres of the segment from stop[stopIndex] to stop[stopIndex+1].
 * Used for dead reckoning: convert speedKph → fractionalIndex advance per second.
 */
export function segmentLength(geometry: RouteGeometry, stopIndex: number): number {
  const stops = geometry.stops;
  if (!stops || stops.length < 2) return 0;
  const i = Math.max(0, Math.min(stopIndex, stops.length - 2));
  const path = stops[i].pathToNext;
  if (!path || path.length < 2) {
    return haversine(stops[i], stops[i + 1]);
  }
  let total = 0;
  for (let j = 0; j < path.length - 1; j++) {
    total += haversine(path[j], path[j + 1]);
  }
  return total;
}

/**
 * Distance in metres from the bus's current position to a target stop,
 * computed along the route geometry.
 */
export function distanceToStop(
  geometry: RouteGeometry,
  busStopIndex: number,
  busFractional: number,
  targetStopIndex: number,
): number {
  const segLen = segmentLength(geometry, busStopIndex);
  let dist = segLen * (1 - busFractional);
  for (let i = busStopIndex + 1; i < targetStopIndex; i++) {
    dist += segmentLength(geometry, i);
  }
  return dist;
}
