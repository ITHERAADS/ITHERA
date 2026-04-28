export interface GeocodingResult {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
}

export interface ComputeRouteParams {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
}

export interface RouteStep {
  distanceMeters: number | null;
  staticDuration: string | null;
  maneuver: string | null;
  instructions: string | null;
  travelMode: string | null;
  distanceText: string | null;
  durationText: string | null;
}

export interface RouteResult {
  distanceMeters: number | null;
  duration: string | null;
  encodedPolyline: string | null;
  staticDuration: string | null;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  distanceText: string | null;
  durationText: string | null;
  staticDurationText: string | null;
  steps: RouteStep[];
}

export interface NearbyPlacesParams {
  latitude: number;
  longitude: number;
  radius: number;
  includedTypes: string[];
  maxResultCount?: number;
}

export interface PlaceResult {
  id: string | null;
  name: string | null;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryCategory: string | null;
}