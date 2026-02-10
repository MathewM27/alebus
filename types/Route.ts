export interface Route {
  id: string;
  name: string;
  shortName: string;
  description?: string;
}

export interface RouteVariant {
  id: string;
  routeId: string;
  name: string;
  direction: string;
}
