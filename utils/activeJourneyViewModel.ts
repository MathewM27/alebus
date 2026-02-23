import { getOperatorName } from "@/constants/operators";
import type {
    JourneyTrackingDTO,
    StopLookupResponse,
} from "@/types/JourneyTracking";
import {
    formatDistance,
    formatEta,
    formatProximityLabel,
    getProximityColor,
} from "@/utils/format";
import { pickActiveRecommendation } from "@/utils/journeyTracking";

export type ActiveJourneyCardModel = {
  destinationName: string;
  busPlateLabel: string;
  operatorName: string;
  distanceText: string;
  etaText: string;
  proximityLabel: string;
  proximityColor: { bg: string; text: string };
  isActive: boolean;
};

/**
 * Transform JourneyTrackingDTO to display model for the active journey card
 */
export function toActiveJourneyCardModel(
  journey: JourneyTrackingDTO,
  stopLookup: StopLookupResponse | undefined,
  index: number = 0,
): ActiveJourneyCardModel {
  const activeRec = pickActiveRecommendation(journey);

  const destinationName =
    stopLookup?.[journey.destinationStopId]?.name ?? "Destination";

  const busPlate = journey.activeBusId ?? activeRec?.busId ?? "—";

  return {
    destinationName,
    busPlateLabel: busPlate !== "—" ? `Bus ${busPlate}` : "Bus —",
    operatorName: getOperatorName(activeRec?.operatorId),
    distanceText: formatDistance(activeRec?.distanceMeters),
    etaText: formatEta(activeRec?.estimatedArrival),
    proximityLabel: formatProximityLabel(journey.proximityName),
    proximityColor: getProximityColor(journey.proximityName),
    isActive: index === 0,
  };
}

/**
 * Transform array of journey recommendations to card models
 * First one is active, rest are inactive alternatives
 */
export function toJourneyCardModels(
  journeys: JourneyTrackingDTO[],
  stopLookup: StopLookupResponse | undefined,
): ActiveJourneyCardModel[] {
  return journeys.map((journey, index) =>
    toActiveJourneyCardModel(journey, stopLookup, index),
  );
}
