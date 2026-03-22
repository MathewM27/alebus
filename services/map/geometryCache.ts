import { API_BASE_URL } from '@/services/api/client';
import type { RouteGeometry } from './routeGeometry';

const cache = new Map<string, RouteGeometry>();
const inFlight = new Set<string>();

/**
 * Fetch route geometry (stop positions + pathToNext polylines) by routeId.
 * Results are cached in memory for the session lifetime.
 *
 * Returns null if the routeId is already being fetched or on error.
 */
export async function getGeometry(routeId: string): Promise<RouteGeometry | null> {
  if (cache.has(routeId)) return cache.get(routeId)!;
  if (inFlight.has(routeId)) return null; // request in flight — caller will get it next update

  inFlight.add(routeId);
  try {
    const res = await fetch(`${API_BASE_URL}/routes/${routeId}`);
    if (!res.ok) {
      console.warn(`[geometryCache] GET /routes/${routeId} failed: ${res.status}`);
      return null;
    }
    const geo = await res.json() as RouteGeometry;
    cache.set(routeId, geo);
    return geo;
  } catch (err) {
    console.warn('[geometryCache] fetch error:', err);
    return null;
  } finally {
    inFlight.delete(routeId);
  }
}

export function clearGeometryCache(): void {
  cache.clear();
}
