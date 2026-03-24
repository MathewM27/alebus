import type { StopLookupResponse } from "@/types/JourneyTracking";
import { createAuthenticatedClient } from "./client";

// Simple in-memory cache for stop lookups
const stopCache: Map<string, { name: string; lat: number; lon: number }> =
  new Map();

// Mock stop data for development/preview
const MOCK_STOPS: Record<string, { name: string; lat: number; lon: number }> = {
  STOP_120: { name: "Port Louis Terminal", lat: -20.1609, lon: 57.5012 },
  STOP_240: { name: "Curepipe Central", lat: -20.3168, lon: 57.5225 },
  STOP_180: { name: "Rose Hill Hub", lat: -20.1989, lon: 57.4989 },
  STOP_210: { name: "Quatre Bornes", lat: -20.2309, lon: 57.4992 },
  STOP_300: { name: "Mahebourg Station", lat: -20.4398, lon: 57.6592 },
  STOP_150: { name: "Centre de Flacq", lat: -20.2631, lon: 57.5803 },
};

// Pre-populate cache with mock data
Object.entries(MOCK_STOPS).forEach(([id, data]) => {
  stopCache.set(id, data);
});

/**
 * Fetch stop details by IDs (batch lookup)
 * Returns a dictionary keyed by stopId
 */
export async function fetchStopLookup(
  ids: string[],
): Promise<StopLookupResponse> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};

  // Check cache for already fetched stops
  const cached: StopLookupResponse = {};
  const idsToFetch: string[] = [];

  for (const id of unique) {
    const cachedStop = stopCache.get(id);
    if (cachedStop) {
      cached[id] = { id, ...cachedStop };
    } else {
      idsToFetch.push(id);
    }
  }

  if (idsToFetch.length === 0) {
    return cached;
  }

  try {
    const qs = encodeURIComponent(idsToFetch.join(","));
    const client = createAuthenticatedClient();
    const data = await client.get<StopLookupResponse>(`/stops/lookup?ids=${qs}`);

    for (const [id, stop] of Object.entries(data)) {
      stopCache.set(id, { name: stop.name, lat: stop.lat, lon: stop.lon });
    }

    return { ...cached, ...data };
  } catch (error) {
    console.warn("Stop lookup error, using mock data:", error);
    const mockResult: StopLookupResponse = {};
    for (const id of idsToFetch) {
      if (MOCK_STOPS[id]) {
        mockResult[id] = { id, ...MOCK_STOPS[id] };
        stopCache.set(id, MOCK_STOPS[id]);
      }
    }
    return { ...cached, ...mockResult };
  }
}

export interface NearbyStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceMeters: number;
}

export async function getNearbyStops(
  lat: number,
  lon: number,
  radius = 500,
): Promise<NearbyStop[]> {
  try {
    const client = createAuthenticatedClient();
    const data = await client.get<{ stops: NearbyStop[]; count: number }>(
      `/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}`,
    );
    return data.stops ?? [];
  } catch (error: any) {
    console.warn('getNearbyStops error:', error?.status ?? '', error?.message ?? error);
    return [];
  }
}

/**
 * Load all stops on the island using a large radius from the given position
 * (or Mauritius center if no position provided).
 * Radius of 60_000m covers the entire island.
 */
export async function loadAllStops(
  lat = -20.2,
  lon = 57.55,
): Promise<NearbyStop[]> {
  return getNearbyStops(lat, lon, 60_000);
}

export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  seq: number;
  pathToNext?: { lat: number; lon: number }[];
}

const routeStopsCache: Map<string, RouteStop[]> = new Map();

/**
 * Fetch ordered stops for a route (with names + coordinates).
 * Cached per routeId for the session.
 */
export async function fetchRouteStops(routeId: string): Promise<RouteStop[]> {
  if (routeStopsCache.has(routeId)) return routeStopsCache.get(routeId)!;
  try {
    const client = createAuthenticatedClient();
    const data = await client.get<{ stops: RouteStop[] }>(`/routes/${encodeURIComponent(routeId)}`);
    const stops = (data.stops ?? []).filter(s => s.lat && s.lon);
    routeStopsCache.set(routeId, stops);
    return stops;
  } catch (e: any) {
    console.warn('[stops] fetchRouteStops failed:', e?.message ?? e);
    return [];
  }
}
