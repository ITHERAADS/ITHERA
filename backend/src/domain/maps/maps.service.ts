import {
  googleComputeRoute,
  googleGeocode,
  googleNearbyPlaces,
  googlePlaceAutocomplete,
  googlePlaceDetails,
  googlePlacePhotoMedia,
  googleTextSearchPlaces,
} from '../../infrastructure/external-apis/googlemaps.service';
import { ComputeRouteParams, GeocodingResult, NearbyPlacesParams, PlaceResult, RouteResult, RouteStep } from './maps.entity';

interface GooglePhoto {
  name?: string;
}

interface GooglePhotoMediaResponse {
  photoUri?: string;
}

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
    photos?: GooglePhoto[];
  }>;
}

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

interface GooglePlaceDetailsResponse {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  types?: string[];
  photos?: GooglePhoto[];
}

interface GoogleTextSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
    photos?: GooglePhoto[];
  }>;
}

async function resolvePhotoUrl(photoName?: string | null): Promise<string | null> {
  if (!photoName) return null;

  try {
    const media = await googlePlacePhotoMedia<GooglePhotoMediaResponse>(photoName, 900);
    return media.photoUri ?? null;
  } catch {
    return null;
  }
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

  return Promise.all(
    (response.places ?? []).map(async (place) => {
      const photoName = place.photos?.[0]?.name ?? null;

      return {
        id: place.id ?? null,
        name: place.displayName?.text ?? null,
        formattedAddress: place.formattedAddress ?? null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        primaryCategory: place.types?.[0] ?? null,
        photoName,
        photoUrl: await resolvePhotoUrl(photoName),
      };
    })
  );
}

export async function autocompletePlaces(input: string) {
  const response = await googlePlaceAutocomplete<GoogleAutocompleteResponse>(input);

  return (response.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      description: prediction?.text?.text ?? '',
      placeId: prediction?.placeId ?? '',
      mainText: prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text ?? '',
      secondaryText: prediction?.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((item) => item.placeId && item.description);
}

export async function getPlaceDetails(placeId: string): Promise<GeocodingResult | null> {
  const place = await googlePlaceDetails<GooglePlaceDetailsResponse>(placeId);

  if (!place) return null;

  return {
    formattedAddress: place.formattedAddress ?? place.displayName?.text ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    placeId: place.id ?? placeId,
  };
}

export async function searchPlacesByText(params: {
  textQuery: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  maxResultCount?: number;
}): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
    languageCode: 'es-MX',
    maxResultCount: params.maxResultCount ?? 8,
  };

  if (params.latitude !== undefined && params.longitude !== undefined) {
    body.locationBias = {
      circle: {
        center: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        radius: params.radius ?? 5000,
      },
    };
  }

  const response = await googleTextSearchPlaces<GoogleTextSearchResponse>(body);

  return Promise.all(
    (response.places ?? []).map(async (place) => {
      const photoName = place.photos?.[0]?.name ?? null;

      return {
        id: place.id ?? null,
        name: place.displayName?.text ?? null,
        formattedAddress: place.formattedAddress ?? null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        primaryCategory: place.types?.[0] ?? null,
        photoName,
        photoUrl: await resolvePhotoUrl(photoName),
      };
    })
  );
}
