import { createAuthenticatedClient } from './client';
import type { BusRecommendationDTO, JourneyTrackingDTO } from '@/types/JourneyTracking';

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
