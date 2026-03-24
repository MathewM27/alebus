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
  busStopName: string;   // name of stop where bus currently is
  userStopName: string;  // name of user's boarding stop
  busPlateLabel: string;
  distanceText: string;
  etaText: string;
  proximityLabel: string;
  proximityColor: { bg: string; text: string };
  isActive: boolean;
};

export function toActiveJourneyCardModel(
  journey: JourneyTrackingDTO,
  busDetails: BusDetailsDTO | null,
  busStopName: string | null,
  userStopName: string | null,
  index: number = 0,
): ActiveJourneyCardModel {
  const activeRec = pickActiveRecommendation(journey);

  const busPlate = journey.activeBusId ?? activeRec?.busId ?? "—";

  return {
    busStopName: busStopName ?? (busDetails ? (busDetails.isAtTerminal ? "Terminal" : `Stop ${busDetails.stopIndex}`) : "—"),
    userStopName: userStopName ?? "—",
    busPlateLabel: busPlate !== "—" ? `Bus ${busPlate}` : "Bus —",
    distanceText: formatDistance(activeRec?.distanceMeters),
    etaText: formatEta(activeRec?.estimatedArrival),
    proximityLabel: formatProximityLabel(journey.proximityName),
    proximityColor: getProximityColor(journey.proximityName),
    isActive: index === 0,
  };
}

export function toJourneyCardModels(
  journeys: JourneyTrackingDTO[],
  busDetails: BusDetailsDTO | null,
  busStopName: string | null,
  userStopName: string | null,
): ActiveJourneyCardModel[] {
  return journeys.map((journey, index) =>
    toActiveJourneyCardModel(journey, busDetails, busStopName, userStopName, index),
  );
}
