export type ProximityName =
  | "far"
  | "medium"
  | "near"
  | "approaching"
  | "arriving"
  | string;

export type JourneyTrackingDTO = {
  journeyId: string;
  userId?: string;

  status: number;
  statusName: string;

  originLat?: number;
  originLon?: number;

  routeId?: string;
  originStopId: string;
  destinationStopId: string;

  requiredDirection?: number;

  activeBusId?: string; // Bus plate string

  proximityLevel?: number;
  proximityName: ProximityName;

  recommendations: BusRecommendationDTO[];

  boardingWindowStart?: string | null;
  boardedAt?: string | null;

  declineCount?: number;

  estimatedDuration?: number; // ms
  expiresAt?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type BusRecommendationDTO = {
  busId: string; // bus plate string
  operatorId: string;

  estimatedArrival: number; // ms until arrival (relative)
  distanceMeters: number;

  direction: number;
  isWrongDirection: boolean;

  confidenceLevel?: number; // 0..1
  displayText?: string;
};

// Stop lookup types
export type StopDTO = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export type StopLookupResponse = Record<string, StopDTO>;
