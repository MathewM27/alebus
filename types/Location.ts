export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  northEast: Coordinates;
  southWest: Coordinates;
}
