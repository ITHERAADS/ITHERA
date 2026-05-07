export interface PlaceOpeningHours {
  weekdayDescriptions?: string[];
}

export interface PlaceDetailsFields {
  rating?: number | null;
  userRatingCount?: number | null;
  priceLevel?: string | null;
  websiteUri?: string | null;
  nationalPhoneNumber?: string | null;
  internationalPhoneNumber?: string | null;
  regularOpeningHours?: PlaceOpeningHours | null;
  editorialSummary?: string | null;
  googleMapsUri?: string | null;
}

export interface GeocodingResult {
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  photoName?: string | null;
  photoUrl?: string | null;
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

export interface PlaceResult extends PlaceDetailsFields {
  id: string | null;
  name: string | null;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  primaryCategory: string | null;
  photoName?: string | null;
  photoUrl?: string | null;
}

export interface PlaceAutocompleteResult {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface TextSearchPlacesParams {
  textQuery: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  maxResultCount?: number;
}

export interface WeatherForecastDay {
  date: string;
  day: string;
  weatherCode: number;
  icon: string;
  iconUrl?: string | null;
  description: string;
  min: number | null;
  max: number | null;
  precipitationProbability: number | null;
}

export interface WeatherResult {
  current: {
    temperature: number | null;
    weatherCode: number | null;
    windSpeed: number | null;
    relativeHumidity: number | null;
    precipitationProbability: number | null;
    icon: string;
    iconUrl?: string | null;
    description: string;
  };
  forecast: WeatherForecastDay[];
}
