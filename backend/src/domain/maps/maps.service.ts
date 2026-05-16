import {
  googleComputeRoute,
  googleGeocode,
  googleNearbyPlaces,
  googlePlaceAutocomplete,
  googlePlaceDetails,
  googlePlacePhotoMedia,
  googleTextSearchPlaces,
} from '../../infrastructure/external-apis/googlemaps.service';
import { weatherApiForecast } from '../../infrastructure/external-apis/weather.service';
import { ComputeRouteParams, GeocodingResult, NearbyPlacesParams, PlaceResult, RouteResult, RouteStep, WeatherResult } from './maps.entity';

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
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    editorialSummary?: { text?: string };
    googleMapsUri?: string;
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
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
  googleMapsUri?: string;
}

interface GoogleTextSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
    photos?: GooglePhoto[];
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    regularOpeningHours?: { weekdayDescriptions?: string[] };
    editorialSummary?: { text?: string };
    googleMapsUri?: string;
  }>;
}

type TimedCacheEntry<T> = { expiresAt: number; value: T };

const MAPS_CACHE_TTL_MS = Number(process.env['MAPS_CACHE_TTL_MS'] ?? 10 * 60 * 1000);
const placeDetailsCache = new Map<string, TimedCacheEntry<PlaceResult | null>>();
const autocompleteCache = new Map<string, TimedCacheEntry<Array<{
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}>>>();
const textSearchCache = new Map<string, TimedCacheEntry<PlaceResult[]>>();
const routeCache = new Map<string, TimedCacheEntry<RouteResult | null>>();

function getCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T): T {
  cache.set(key, { value, expiresAt: Date.now() + MAPS_CACHE_TTL_MS });
  return value;
}

function roundedCoord(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(4) : '';
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
  const routeKey = [
    roundedCoord(params.originLat),
    roundedCoord(params.originLng),
    roundedCoord(params.destinationLat),
    roundedCoord(params.destinationLng),
    params.travelMode ?? 'DRIVE',
  ].join('|');
  const cachedRoute = getCache(routeCache, routeKey);
  if (cachedRoute !== null) return cachedRoute;

  const response = await googleComputeRoute<GoogleRoutesResponse>({
    origin: { location: { latLng: { latitude: params.originLat, longitude: params.originLng } } },
    destination: { location: { latLng: { latitude: params.destinationLat, longitude: params.destinationLng } } },
    travelMode: params.travelMode ?? 'DRIVE',
    languageCode: 'es-MX',
    units: 'METRIC',
  });

  const route = response.routes?.[0];
  const leg = route?.legs?.[0];

  if (!route || !leg) return setCache(routeCache, routeKey, null);

  const steps: RouteStep[] = (leg.steps ?? []).map((step) => ({
    distanceMeters: step.distanceMeters ?? null,
    staticDuration: step.staticDuration ?? null,
    maneuver: step.navigationInstruction?.maneuver ?? null,
    instructions: step.navigationInstruction?.instructions ?? null,
    travelMode: step.travelMode ?? null,
    distanceText: step.localizedValues?.distance?.text ?? null,
    durationText: step.localizedValues?.staticDuration?.text ?? null,
  }));

  return setCache(routeCache, routeKey, {
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
  });
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
        rating: place.rating ?? null,
        userRatingCount: place.userRatingCount ?? null,
        priceLevel: place.priceLevel ?? null,
        websiteUri: place.websiteUri ?? null,
        nationalPhoneNumber: place.nationalPhoneNumber ?? null,
        internationalPhoneNumber: place.internationalPhoneNumber ?? null,
        regularOpeningHours: place.regularOpeningHours ?? null,
        editorialSummary: place.editorialSummary?.text ?? null,
        googleMapsUri: place.googleMapsUri ?? null,
      };
    })
  );
}

export async function autocompletePlaces(input: string, options?: { latitude?: number; longitude?: number; radius?: number }) {
  const normalizedInput = input.trim().toLowerCase();
  const cacheKey = [
    normalizedInput,
    roundedCoord(options?.latitude),
    roundedCoord(options?.longitude),
    options?.radius ?? '',
  ].join('|');
  const cached = getCache(autocompleteCache, cacheKey);
  if (cached !== null) return cached;

  const response = await googlePlaceAutocomplete<GoogleAutocompleteResponse>(input, options);

  const value = (response.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      description: prediction?.text?.text ?? '',
      placeId: prediction?.placeId ?? '',
      mainText: prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text ?? '',
      secondaryText: prediction?.structuredFormat?.secondaryText?.text ?? '',
    }))
    .filter((item) => item.placeId && item.description);

  return setCache(autocompleteCache, cacheKey, value);
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const cacheKey = placeId.trim();
  const cached = getCache(placeDetailsCache, cacheKey);
  if (cached !== null) return cached;

  const place = await googlePlaceDetails<GooglePlaceDetailsResponse>(placeId);

  if (!place) return setCache(placeDetailsCache, cacheKey, null);

  const photoName = place.photos?.[0]?.name ?? null;

  return setCache(placeDetailsCache, cacheKey, {
    id: place.id ?? placeId,
    name: place.displayName?.text ?? null,
    formattedAddress: place.formattedAddress ?? place.displayName?.text ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    primaryCategory: place.types?.[0] ?? null,
    photoName,
    photoUrl: await resolvePhotoUrl(photoName),
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    priceLevel: place.priceLevel ?? null,
    websiteUri: place.websiteUri ?? null,
    nationalPhoneNumber: place.nationalPhoneNumber ?? null,
    internationalPhoneNumber: place.internationalPhoneNumber ?? null,
    regularOpeningHours: place.regularOpeningHours ?? null,
    editorialSummary: place.editorialSummary?.text ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
  });
}

function mapGooglePlacesResponse(response: GoogleTextSearchResponse): Promise<PlaceResult[]> {
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
        rating: place.rating ?? null,
        userRatingCount: place.userRatingCount ?? null,
        priceLevel: place.priceLevel ?? null,
        websiteUri: place.websiteUri ?? null,
        nationalPhoneNumber: place.nationalPhoneNumber ?? null,
        internationalPhoneNumber: place.internationalPhoneNumber ?? null,
        regularOpeningHours: place.regularOpeningHours ?? null,
        editorialSummary: place.editorialSummary?.text ?? null,
        googleMapsUri: place.googleMapsUri ?? null,
      };
    })
  );
}

function buildTextSearchBody(params: {
  textQuery: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  maxResultCount?: number;
}, useLocationBias: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
    languageCode: 'es-MX',
    regionCode: 'MX',
    maxResultCount: params.maxResultCount ?? 10,
  };

  if (useLocationBias && params.latitude !== undefined && params.longitude !== undefined) {
    body.locationBias = {
      circle: {
        center: {
          latitude: params.latitude,
          longitude: params.longitude,
        },
        radius: Math.min(Math.max(params.radius ?? 50000, 1000), 50000),
      },
    };
  }

  return body;
}

export async function searchPlacesByText(params: {
  textQuery: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  maxResultCount?: number;
}): Promise<PlaceResult[]> {
  const normalizedQuery = params.textQuery.trim();
  const cacheKey = [
    normalizedQuery.toLowerCase(),
    roundedCoord(params.latitude),
    roundedCoord(params.longitude),
    params.radius ?? '',
    params.maxResultCount ?? '',
  ].join('|');
  const cached = getCache(textSearchCache, cacheKey);
  if (cached !== null) return cached;

  const localizedQuery = params.latitude !== undefined && params.longitude !== undefined
    ? `${normalizedQuery} cerca del destino`
    : normalizedQuery;

  try {
    const response = await googleTextSearchPlaces<GoogleTextSearchResponse>(
      buildTextSearchBody({ ...params, textQuery: localizedQuery }, true)
    );
    const places = await mapGooglePlacesResponse(response);
    if (places.length > 0) return setCache(textSearchCache, cacheKey, places);
  } catch {
    // Si Google rechaza el sesgo por ubicación o la consulta genérica falla, hacemos un segundo intento sin filtro.
  }

  const fallbackResponse = await googleTextSearchPlaces<GoogleTextSearchResponse>(
    buildTextSearchBody({ ...params, textQuery: normalizedQuery }, false)
  );

  return setCache(textSearchCache, cacheKey, await mapGooglePlacesResponse(fallbackResponse));
}


type WeatherApiForecastDay = {
  date?: string;
  day?: {
    maxtemp_c?: number;
    mintemp_c?: number;
    daily_chance_of_rain?: number;
    condition?: {
      text?: string;
      icon?: string;
      code?: number;
    };
  };
};

interface WeatherApiResponse {
  current?: {
    temp_c?: number;
    humidity?: number;
    wind_kph?: number;
    precip_mm?: number;
    condition?: {
      text?: string;
      icon?: string;
      code?: number;
    };
  };
  forecast?: {
    forecastday?: WeatherApiForecastDay[];
  };
}

const weatherCache = new Map<string, { expiresAt: number; value: WeatherResult }>();
const WEATHER_CACHE_TTL_MS = Number(process.env['WEATHER_CACHE_TTL_MS'] ?? 15 * 60 * 1000);

const WEATHER_CODE_ICONS: Record<number, string> = {
  1000: '☀️',
  1003: '🌤️',
  1006: '⛅',
  1009: '☁️',
  1030: '🌫️',
  1063: '🌦️',
  1066: '🌨️',
  1069: '🌨️',
  1072: '🌧️',
  1087: '⛈️',
  1135: '🌫️',
  1147: '🌫️',
  1150: '🌦️',
  1153: '🌦️',
  1168: '🌧️',
  1171: '🌧️',
  1180: '🌦️',
  1183: '🌧️',
  1186: '🌧️',
  1189: '🌧️',
  1192: '⛈️',
  1195: '⛈️',
  1198: '🌧️',
  1201: '🌧️',
  1204: '🌨️',
  1207: '🌨️',
  1210: '🌨️',
  1213: '🌨️',
  1216: '🌨️',
  1219: '🌨️',
  1222: '🌨️',
  1225: '🌨️',
  1237: '🌨️',
  1240: '🌦️',
  1243: '🌧️',
  1246: '⛈️',
  1249: '🌨️',
  1252: '🌨️',
  1255: '🌨️',
  1258: '🌨️',
  1261: '🌨️',
  1264: '🌨️',
  1273: '⛈️',
  1276: '⛈️',
  1279: '⛈️',
  1282: '⛈️',
};

function normalizeWeatherIconUrl(icon?: string | null): string | null {
  if (!icon) return null;
  return icon.startsWith('//') ? `https:${icon}` : icon;
}

function describeWeatherApiCondition(condition?: { text?: string; code?: number } | null) {
  const code = condition?.code ?? null;
  const description = condition?.text?.trim() || 'Sin dato';
  return {
    icon: code !== null ? WEATHER_CODE_ICONS[code] ?? '🌤️' : '🌤️',
    description,
  };
}

function dayLabel(dateString: string, index: number): string {
  if (index === 0) return 'Hoy';
  if (index === 1) return 'Mañana';
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(date).replace(/^./, (c) => c.toUpperCase());
}

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function hasForecastDate(item: WeatherApiForecastDay): item is WeatherApiForecastDay & { date: string } {
  return typeof item.date === 'string' && item.date.trim().length > 0;
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherResult> {
  const key = cacheKey(latitude, longitude);
  const cached = weatherCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const response = await weatherApiForecast<WeatherApiResponse>(latitude, longitude, 6);
  const currentCondition = response.current?.condition ?? null;
  const currentMeta = describeWeatherApiCondition(currentCondition);
  const forecastDays = response.forecast?.forecastday ?? [];

  const value: WeatherResult = {
    current: {
      temperature: response.current?.temp_c ?? null,
      weatherCode: currentCondition?.code ?? null,
      windSpeed: response.current?.wind_kph ?? null,
      relativeHumidity: response.current?.humidity ?? null,
      precipitationProbability: forecastDays[0]?.day?.daily_chance_of_rain ?? null,
      icon: currentMeta.icon,
      iconUrl: normalizeWeatherIconUrl(currentCondition?.icon),
      description: currentMeta.description,
    },
    forecast: forecastDays
      .filter(hasForecastDate)
      .map((item, index) => {
        const condition = item.day?.condition ?? null;
        const meta = describeWeatherApiCondition(condition);
        const date = item.date ?? '';
        return {
          date,
          day: dayLabel(date, index),
          weatherCode: condition?.code ?? 0,
          icon: meta.icon,
          iconUrl: normalizeWeatherIconUrl(condition?.icon),
          description: meta.description,
          min: item.day?.mintemp_c ?? null,
          max: item.day?.maxtemp_c ?? null,
          precipitationProbability: item.day?.daily_chance_of_rain ?? null,
        };
      }),
  };

  weatherCache.set(key, { expiresAt: Date.now() + WEATHER_CACHE_TTL_MS, value });
  return value;
}
