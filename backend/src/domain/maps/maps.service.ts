import { googleComputeRoute, googleGeocode, googleNearbyPlaces } from '../../infrastructure/external-apis/googlemaps.service';
import { ComputeRouteParams, GeocodingResult, NearbyPlacesParams, PlaceResult, RouteResult, RouteStep } from './maps.entity';

interface GoogleGeocodingResponse {
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
}

interface GoogleRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
    legs?: Array<{
      staticDuration?: string;
      startLocation?: { latLng?: { latitude?: number; longitude?: number } };
      endLocation?: { latLng?: { latitude?: number; longitude?: number } };
      localizedValues?: {
        distance?: { text?: string };
        duration?: { text?: string };
        staticDuration?: { text?: string };
      };
      steps?: Array<{
        distanceMeters?: number;
        staticDuration?: string;
        travelMode?: string;
        navigationInstruction?: { maneuver?: string; instructions?: string };
        localizedValues?: {
          distance?: { text?: string };
          staticDuration?: { text?: string };
        };
      }>;
    }>;
  }>;
}

interface GooglePlacesResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
  }>;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const response = await googleGeocode<GoogleGeocodingResponse>(address);
  const first = response.results?.[0];

  if (!first) return null;

  return {
    formattedAddress: first.formatted_address ?? null,
    latitude: first.geometry?.location?.lat ?? null,
    longitude: first.geometry?.location?.lng ?? null,
    placeId: first.place_id ?? null,
  };
}

export async function computeRoute(params: ComputeRouteParams): Promise<RouteResult | null> {
  const response = await googleComputeRoute<GoogleRoutesResponse>({
    origin: { location: { latLng: { latitude: params.originLat, longitude: params.originLng } } },
    destination: { location: { latLng: { latitude: params.destinationLat, longitude: params.destinationLng } } },
    travelMode: params.travelMode ?? 'DRIVE',
    languageCode: 'es-MX',
    units: 'METRIC',
  });

  const route = response.routes?.[0];
  const leg = route?.legs?.[0];

  if (!route || !leg) return null;

  const steps: RouteStep[] = (leg.steps ?? []).map((step) => ({
    distanceMeters: step.distanceMeters ?? null,
    staticDuration: step.staticDuration ?? null,
    maneuver: step.navigationInstruction?.maneuver ?? null,
    instructions: step.navigationInstruction?.instructions ?? null,
    travelMode: step.travelMode ?? null,
    distanceText: step.localizedValues?.distance?.text ?? null,
    durationText: step.localizedValues?.staticDuration?.text ?? null,
  }));

  return {
    distanceMeters: route.distanceMeters ?? null,
    duration: route.duration ?? null,
    encodedPolyline: route.polyline?.encodedPolyline ?? null,
    staticDuration: leg.staticDuration ?? null,
    startLat: leg.startLocation?.latLng?.latitude ?? null,
    startLng: leg.startLocation?.latLng?.longitude ?? null,
    endLat: leg.endLocation?.latLng?.latitude ?? null,
    endLng: leg.endLocation?.latLng?.longitude ?? null,
    distanceText: leg.localizedValues?.distance?.text ?? null,
    durationText: leg.localizedValues?.duration?.text ?? null,
    staticDurationText: leg.localizedValues?.staticDuration?.text ?? null,
    steps,
  };
}

export async function searchNearbyPlaces(params: NearbyPlacesParams): Promise<PlaceResult[]> {
  const response = await googleNearbyPlaces<GooglePlacesResponse>({
    includedTypes: params.includedTypes,
    maxResultCount: params.maxResultCount ?? 5,
    locationRestriction: {
      circle: {
        center: { latitude: params.latitude, longitude: params.longitude },
        radius: params.radius,
      },
    },
  });

  return (response.places ?? []).map((place) => ({
    id: place.id ?? null,
    name: place.displayName?.text ?? null,
    formattedAddress: place.formattedAddress ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    primaryCategory: place.types?.[0] ?? null,
  }));
}