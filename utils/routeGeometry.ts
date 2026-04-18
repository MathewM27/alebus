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

/**
 * Build cumulative distances for each stop using cumulativeDistance from the API
 * when available, falling back to straight-line haversine between stops.
 * Returns an array of length stops.length where [i] = distance from route start to stop i.
 */
function buildCumDists(sorted: RouteStop[]): number[] {
  const cumDists: number[] = [0];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const segLen =
      a.cumulativeDistance != null && b.cumulativeDistance != null
        ? b.cumulativeDistance - a.cumulativeDistance
        : haversine(a, b);
    cumDists.push(cumDists[i] + Math.max(0, segLen));
  }
  return cumDists;
}

/**
 * Returns the road polyline from the bus's current segmentPct position forward
 * to the stop identified by toStopId.
 *
 * Used to draw the "ahead" route segment on the map (bus → user boarding stop).
 * Replaces the legacy FractionalIndex + pathAfterFraction approach.
 *
 * Returns null if segmentPct is 0 (not yet enriched), the destination stop is not
 * found, or the bus has already passed the destination.
 */
export function routeSegmentFromPct(
  stops: RouteStop[],
  segmentPct: number,
  toStopId: string,
): { lat: number; lon: number }[] | null {
  if (!stops || stops.length < 2 || segmentPct <= 0) return null;

  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  const toIdx = sorted.findIndex(s => s.id === toStopId);
  if (toIdx < 0) return null;

  const cumDists = buildCumDists(sorted);
  const totalLen = cumDists[cumDists.length - 1];
  if (totalLen === 0) return null;

  const busAbsDist = Math.min(segmentPct, 1) * totalLen;

  // Find which stop-to-stop segment the bus is currently on.
  let busSegIdx = sorted.length - 2; // default: last segment
  for (let i = 0; i < sorted.length - 1; i++) {
    if (busAbsDist <= cumDists[i + 1]) {
      busSegIdx = i;
      break;
    }
  }

  // Bus has already passed the destination stop.
  if (busSegIdx >= toIdx) return null;

  // Within-segment fraction along the current stop's pathToNext.
  const segLen = cumDists[busSegIdx + 1] - cumDists[busSegIdx];
  const withinFrac = segLen > 0 ? (busAbsDist - cumDists[busSegIdx]) / segLen : 0;

  const coords: { lat: number; lon: number }[] = [];

  // Remainder of the current segment (road polyline from bus position forward).
  const busPath = sorted[busSegIdx].pathToNext;
  const effectivePath =
    busPath && busPath.length >= 2
      ? busPath
      : [{ lat: sorted[busSegIdx].lat, lon: sorted[busSegIdx].lon },
         { lat: sorted[busSegIdx + 1].lat, lon: sorted[busSegIdx + 1].lon }];
  coords.push(...pathAfterFraction(effectivePath, withinFrac));

  // Remaining segments between current and destination.
  for (let i = busSegIdx + 1; i < toIdx; i++) {
    const path = sorted[i].pathToNext;
    if (path && path.length >= 2) {
      coords.push(...path.slice(1)); // skip first — already end of previous segment
    } else {
      coords.push({ lat: sorted[i].lat, lon: sorted[i].lon });
    }
  }

  // Destination stop coordinate.
  coords.push({ lat: sorted[toIdx].lat, lon: sorted[toIdx].lon });

  return coords.length >= 2 ? coords : null;
}

/**
 * Derives the current and next stop from segmentPct + cumulative distances.
 * Replaces the legacy StopIndex-based approach for nav banner labels.
 *
 * Returns { currentStop, nextStop, isAtStop } where:
 *   currentStop — the last stop the bus has reached or passed
 *   nextStop    — the stop immediately ahead (null if at the terminal)
 *   isAtStop    — true when the bus is within 2% of totalRouteLength of currentStop
 */
export function findStopAtPct(
  stops: RouteStop[],
  segmentPct: number,
): { currentStop: RouteStop | null; nextStop: RouteStop | null; isAtStop: boolean } {
  const none = { currentStop: null, nextStop: null, isAtStop: false };
  if (!stops || stops.length === 0 || segmentPct <= 0) return none;

  const sorted = [...stops].sort((a, b) => a.seq - b.seq);
  const cumDists = buildCumDists(sorted);
  const totalLen = cumDists[cumDists.length - 1];
  if (totalLen === 0) return none;

  const busAbsDist = Math.min(segmentPct, 1) * totalLen;

  // Find the last stop the bus has reached (cumDist <= busAbsDist).
  let currentIdx = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (cumDists[i] <= busAbsDist) {
      currentIdx = i;
      break;
    }
  }

  const currentStop = sorted[currentIdx];
  const nextStop = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

  // "At stop" when within 2% of totalLen of the stop's position.
  const distToStop = Math.abs(busAbsDist - cumDists[currentIdx]);
  const isAtStop = distToStop / totalLen < 0.02;

  return { currentStop, nextStop, isAtStop };
}

/**
 * Build a cross-route polyline when the bus is on the paired route.
 *
 * Path: [bus position → busRouteStops terminal] + [userRouteStops start → user's boarding stop]
 *
 * busRouteStops  — ordered stops for the route the bus is currently on
 * userRouteStops — ordered stops for the route the user's journey is on
 * segmentPct     — bus's current fractional position on busRouteStops
 * toStopId       — user's boarding stop ID (must exist in userRouteStops)
 *
 * Returns null if geometry is insufficient or toStopId is not in userRouteStops.
 */
export function crossRouteSegmentFromPct(
  busRouteStops: RouteStop[],
  userRouteStops: RouteStop[],
  segmentPct: number,
  toStopId: string,
): { lat: number; lon: number }[] | null {
  if (!busRouteStops || busRouteStops.length < 2 || segmentPct <= 0) return null;
  if (!userRouteStops || userRouteStops.length < 2) return null;

  const busSorted  = [...busRouteStops].sort((a, b) => a.seq - b.seq);
  const userSorted = [...userRouteStops].sort((a, b) => a.seq - b.seq);

  const toIdx = userSorted.findIndex(s => s.id === toStopId);
  if (toIdx < 0) return null;

  const busCumDists  = buildCumDists(busSorted);
  const busTotalLen  = busCumDists[busCumDists.length - 1];
  if (busTotalLen === 0) return null;

  const busAbsDist = Math.min(segmentPct, 1) * busTotalLen;

  // Find which segment the bus is currently on.
  let busSegIdx = busSorted.length - 2;
  for (let i = 0; i < busSorted.length - 1; i++) {
    if (busAbsDist <= busCumDists[i + 1]) {
      busSegIdx = i;
      break;
    }
  }

  const segLen    = busCumDists[busSegIdx + 1] - busCumDists[busSegIdx];
  const withinFrac = segLen > 0 ? (busAbsDist - busCumDists[busSegIdx]) / segLen : 0;

  const coords: { lat: number; lon: number }[] = [];

  // Part 1: bus position → bus route terminal
  const busPath = busSorted[busSegIdx].pathToNext;
  const effectiveBusPath =
    busPath && busPath.length >= 2
      ? busPath
      : [{ lat: busSorted[busSegIdx].lat, lon: busSorted[busSegIdx].lon },
         { lat: busSorted[busSegIdx + 1].lat, lon: busSorted[busSegIdx + 1].lon }];
  coords.push(...pathAfterFraction(effectiveBusPath, withinFrac));

  for (let i = busSegIdx + 1; i < busSorted.length - 1; i++) {
    const path = busSorted[i].pathToNext;
    if (path && path.length >= 2) {
      coords.push(...path.slice(1));
    } else {
      coords.push({ lat: busSorted[i].lat, lon: busSorted[i].lon });
    }
  }
  coords.push({ lat: busSorted[busSorted.length - 1].lat, lon: busSorted[busSorted.length - 1].lon });

  // Part 2: user route start → user's boarding stop
  const firstUser = userSorted[0];
  coords.push({ lat: firstUser.lat, lon: firstUser.lon });
  for (let i = 0; i < toIdx; i++) {
    const path = userSorted[i].pathToNext;
    if (path && path.length >= 2) {
      coords.push(...path.slice(1));
    } else {
      coords.push({ lat: userSorted[i + 1].lat, lon: userSorted[i + 1].lon });
    }
  }
  coords.push({ lat: userSorted[toIdx].lat, lon: userSorted[toIdx].lon });

  return coords.length >= 2 ? coords : null;
}

/**
 * Road-snapped position using segmentPct (v2 architecture).
 *
 * segmentPct is the bus's fractional position [0.0–1.0] along the full
 * route polyline, as computed by the backend's ComputeSegmentPct function.
 * It replaces the legacy stopIndex + fractionalIndex approach.
 *
 * Strategy:
 *   1. Build a flat polyline by concatenating each stop's pathToNext geometry.
 *      If pathToNext is missing for a segment, fall back to straight stop-to-stop.
 *   2. Walk along that polyline to segmentPct × totalLength.
 *
 * Returns null if stops are missing or segmentPct is 0 (not yet enriched).
 */
export function segmentPctToPosition(
  stops: RouteStop[],
  segmentPct: number,
): { lat: number; lon: number } | null {
  if (!stops || stops.length < 2 || segmentPct <= 0) return null;

  const sorted = [...stops].sort((a, b) => a.seq - b.seq);

  // Build the full route polyline by concatenating pathToNext segments.
  const polyline: { lat: number; lon: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const path = from.pathToNext;
    if (path && path.length >= 2) {
      // Include all points except the last (it equals the next stop's first point).
      for (let j = 0; j < path.length - 1; j++) {
        polyline.push(path[j]);
      }
    } else {
      polyline.push({ lat: from.lat, lon: from.lon });
    }
  }
  // Add the final stop.
  polyline.push({ lat: sorted[sorted.length - 1].lat, lon: sorted[sorted.length - 1].lon });

  if (polyline.length < 2) return null;

  // Compute cumulative segment lengths.
  let totalLen = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = haversine(polyline[i], polyline[i + 1]);
    segLengths.push(d);
    totalLen += d;
  }
  if (totalLen === 0) return polyline[0];

  const target = Math.min(segmentPct, 1) * totalLen;
  let traveled = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (traveled + segLen >= target) {
      const segT = segLen > 0 ? (target - traveled) / segLen : 0;
      return {
        lat: polyline[i].lat + (polyline[i + 1].lat - polyline[i].lat) * segT,
        lon: polyline[i].lon + (polyline[i + 1].lon - polyline[i].lon) * segT,
      };
    }
    traveled += segLen;
  }
  return polyline[polyline.length - 1];
}

/**
 * Returns the portion of a polyline STARTING at fraction t (0–1).
 * The first point is the interpolated position at t; subsequent points
 * are the original path vertices from that segment onward.
 *
 * Used to draw only the "ahead" portion of a road segment for the route
 * overlay (bus snapped position → user stop), avoiding backward kinks.
 */
export function pathAfterFraction(
  path: { lat: number; lon: number }[],
  t: number,
): { lat: number; lon: number }[] {
  if (!path || path.length === 0) return [];
  if (t <= 0) return [...path];
  if (t >= 1) return [path[path.length - 1]];

  let totalLen = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const d = haversine(path[i], path[i + 1]);
    segLengths.push(d);
    totalLen += d;
  }
  if (totalLen === 0) return [path[0]];

  const target = t * totalLen;
  let traveled = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (traveled + segLen >= target) {
      const segT = segLen > 0 ? (target - traveled) / segLen : 0;
      const interpolated = {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * segT,
        lon: path[i].lon + (path[i + 1].lon - path[i].lon) * segT,
      };
      return [interpolated, ...path.slice(i + 1)];
    }
    traveled += segLen;
  }
  return [path[path.length - 1]];
}
