import type { BusDetailsDTO } from "@/services/api/buses";
import type { JourneyTrackingDTO } from "@/types/JourneyTracking";
import {
  formatDistance,
  formatEta,
  formatProximityLabel,
  getProximityColor,
} from "@/utils/format";
import { pickActiveRecommendation } from "@/utils/journeyTracking";

export type ActiveJourneyCardModel = {
  busLastStop: string;   // stop index from server (e.g. "Stop 5" or "Terminal")
  busPlateLabel: string;
  operatorName: string;
  distanceText: string;
  etaText: string;
  proximityLabel: string;
  proximityColor: { bg: string; text: string };
  isActive: boolean;
};

/**
 * Transform JourneyTrackingDTO to display model for the active journey card.
 * All display data comes from server — no client-side computation.
 */
export function toActiveJourneyCardModel(
  journey: JourneyTrackingDTO,
  busDetails: BusDetailsDTO | null,
  operatorName: string | null,
  index: number = 0,
): ActiveJourneyCardModel {
  const activeRec = pickActiveRecommendation(journey);

  // Bus's last stop from server — shown in place of destination name
  let busLastStop = "—";
  if (busDetails) {
    busLastStop = busDetails.isAtTerminal
      ? "Terminal"
      : `Stop ${busDetails.stopIndex}`;
  }

  const busPlate = journey.activeBusId ?? activeRec?.busId ?? "—";

  return {
    busLastStop,
    busPlateLabel: busPlate !== "—" ? `Bus ${busPlate}` : "Bus —",
    operatorName: operatorName ?? "—",
    distanceText: formatDistance(activeRec?.distanceMeters),
    etaText: formatEta(activeRec?.estimatedArrival),
    proximityLabel: formatProximityLabel(journey.proximityName),
    proximityColor: getProximityColor(journey.proximityName),
    isActive: index === 0,
  };
}

/**
 * Transform array of journey recommendations to card models
 */
export function toJourneyCardModels(
  journeys: JourneyTrackingDTO[],
  busDetails: BusDetailsDTO | null,
  operatorName: string | null,
): ActiveJourneyCardModel[] {
  return journeys.map((journey, index) =>
    toActiveJourneyCardModel(journey, busDetails, operatorName, index),
  );
}
