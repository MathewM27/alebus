import { Stop } from './Stop';

export enum JourneyStatus {
  Planned = 'PLANNED',
  Boarding = 'BOARDING',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED'
}

export interface JourneyLeg {
  routeId: string;
  boardStop: Stop;
  alightStop: Stop;
  estimatedDuration: number;
}

export interface Journey {
  id: string;
  status: JourneyStatus;
  origin: Stop;
  destination: Stop;
  legs: JourneyLeg[];
  createdAt: string;
}
