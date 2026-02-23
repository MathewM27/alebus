import type {
    BusRecommendationDTO,
    JourneyTrackingDTO,
} from "@/types/JourneyTracking";

/**
 * Pick the active recommendation from journey tracking data.
 *
 * Selection rule:
 * 1. Match busId === activeBusId
 * 2. Fallback: first correct-direction (isWrongDirection === false)
 * 3. Fallback: first item
 */
export function pickActiveRecommendation(
  journey: JourneyTrackingDTO,
): BusRecommendationDTO | null {
  const recs = journey.recommendations ?? [];
  if (recs.length === 0) return null;

  const activeBusId = journey.activeBusId;

  // 1) Match busId === activeBusId
  if (activeBusId) {
    const match = recs.find((r) => r.busId === activeBusId);
    if (match) return match;
  }

  // 2) Fallback: first correct-direction
  const correct = recs.find((r) => r.isWrongDirection === false);
  if (correct) return correct;

  // 3) Fallback: first item
  return recs[0];
}

/**
 * Check if a journey tracking is in an active state
 */
export function isJourneyActive(journey: JourneyTrackingDTO): boolean {
  const activeStatuses = ["active", "tracking", "boarding", "in_progress"];
  return activeStatuses.includes(journey.statusName?.toLowerCase() ?? "");
}
