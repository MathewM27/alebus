import { createAuthenticatedClient } from './client';
import type { BusRecommendationDTO, JourneyTrackingDTO } from '@/types/JourneyTracking';

// Active statuses (non-terminal): Searching=0, Tracking=1, BoardingPrompt=2, Boarded=3
const ACTIVE_STATUSES = new Set([0, 1, 2, 3]);

/** Minimal shape returned by GET /journeys */
interface JourneyListItem {
  journeyId: string;
  userId: string;
  status: number;
}

/**
 * Fetch all active journeys for the given user (domain userId).
 * Calls GET /journeys (returns all), filters to this user's non-terminal entries,
 * then loads full tracking state for each.
 */
export async function loadActiveJourneys(userId: string): Promise<JourneyTrackingDTO[]> {
  const client = createAuthenticatedClient();
  const all = await client.get<JourneyListItem[]>('/journeys');
  const mine = all.filter(j => j.userId === userId && ACTIVE_STATUSES.has(j.status));

  const results: JourneyTrackingDTO[] = [];
  for (const j of mine) {
    const tracking = await getJourneyTracking(j.journeyId);
    if (tracking) results.push(tracking);
  }
  return results;
}

// ---------- Request types (match backend requests.go) ----------

export interface CreateJourneyRequest {
  userId: string;
  originLat: number;
  originLon: number;
  destinationStopId: string;
  radiusMeters?: number;
  journeyId?: string; // optional — backend generates one if omitted
}

// ---------- Response types (match actual handler map[string]any) ----------

export interface CreateJourneyResponse {
  status: 'created';
  journeyId: string;
  routeId: string;
  originStopId: string;
  destinationStopId: string;
  requiredDirection: number;
  recommendations: BusRecommendationDTO[];
  estimatedDurationMs: number;
}

export interface RefreshJourneyResponse {
  status: 'refreshed';
  journeyId: string;
  journeyStatus: number;
  proximityLevel: number;
  recommendations: BusRecommendationDTO[];
}

// ---------- API calls ----------

export async function createJourney(req: CreateJourneyRequest): Promise<CreateJourneyResponse> {
  const client = createAuthenticatedClient();
  return client.post<CreateJourneyResponse>('/journeys/create', req);
}

export async function refreshJourney(journeyId: string): Promise<RefreshJourneyResponse> {
  const client = createAuthenticatedClient();
  return client.post<RefreshJourneyResponse>('/journeys/refresh', { journeyId });
}

export async function confirmBoarding(journeyId: string): Promise<void> {
  const client = createAuthenticatedClient();
  await client.post<{ status: string }>('/journeys/board', { journeyId });
}

export async function declineBoarding(journeyId: string): Promise<void> {
  const client = createAuthenticatedClient();
  await client.post<{ status: string }>('/journeys/decline', { journeyId });
}

export async function cancelJourney(journeyId: string): Promise<void> {
  const client = createAuthenticatedClient();
  await client.post<{ status: string }>('/journeys/cancel', { journeyId });
}

export async function completeJourney(journeyId: string): Promise<void> {
  const client = createAuthenticatedClient();
  await client.post<{ status: string }>('/journeys/complete', { journeyId });
}

export async function getJourneyTracking(journeyId: string): Promise<JourneyTrackingDTO | null> {
  const client = createAuthenticatedClient();
  try {
    return await client.get<JourneyTrackingDTO>(`/journeys/tracking?journeyId=${journeyId}`);
  } catch {
    return null;
  }
}
