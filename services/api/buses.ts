import { createAuthenticatedClient } from './client';

export interface BusDetailsDTO {
  busId: string;
  operatorId: string;
  routeId: string;
  direction: string;
  status: string;
  stopIndex: number;
  isAtTerminal: boolean;
  position: {
    lat: number;
    lon: number;
    speedKmh: number;
  };
  updatedAt: string;
}

export async function getBusDetails(busId: string): Promise<BusDetailsDTO> {
  const client = createAuthenticatedClient();
  return client.get<BusDetailsDTO>(`/buses/${encodeURIComponent(busId)}`);
}
