export interface StopLocation {
  lat: number;
  lng: number;
}

export interface Stop {
  id: string;
  name: string;
  code: string;
  location: StopLocation;
}
