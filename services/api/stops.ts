import type { StopLookupResponse } from "@/types/JourneyTracking";
import { API_BASE_URL } from "./client";

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

  // If all stops are cached, return immediately
  if (idsToFetch.length === 0) {
    return cached;
  }

  try {
    const qs = encodeURIComponent(idsToFetch.join(","));
    const res = await fetch(`${API_BASE_URL}/stops/lookup?ids=${qs}`);

    if (!res.ok) {
      console.warn(`Stop lookup failed: ${res.status}, using mock data`);
      // Fallback to mock stops for development
      const mockResult: StopLookupResponse = {};
      for (const id of idsToFetch) {
        if (MOCK_STOPS[id]) {
          mockResult[id] = { id, ...MOCK_STOPS[id] };
          stopCache.set(id, MOCK_STOPS[id]);
        }
      }
      return { ...cached, ...mockResult };
    }

    const data = (await res.json()) as StopLookupResponse;

    // Update cache with new stops
    for (const [id, stop] of Object.entries(data)) {
      stopCache.set(id, { name: stop.name, lat: stop.lat, lon: stop.lon });
    }

    return { ...cached, ...data };
  } catch (error) {
    console.warn("Stop lookup error, using mock data:", error);
    // Fallback to mock stops for development
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
  const url = `${API_BASE_URL}/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Nearby stops failed: ${res.status}`);
      return [];
    }
    const data = await res.json() as { stops: NearbyStop[]; count: number };
    return data.stops ?? [];
  } catch (error) {
    console.warn('getNearbyStops error:', error);
    return [];
  }
}
