const GOOGLE_MAPS_API_KEY = process.env['GOOGLE_MAPS_API_KEY'];
const GOOGLE_MAPS_BASE_URL = process.env['GOOGLE_MAPS_BASE_URL'] ?? 'https://maps.googleapis.com';
const GOOGLE_ROUTES_BASE_URL = process.env['GOOGLE_ROUTES_BASE_URL'] ?? 'https://routes.googleapis.com';
const GOOGLE_PLACES_BASE_URL = process.env['GOOGLE_PLACES_BASE_URL'] ?? 'https://places.googleapis.com';

function ensureGoogleEnv(): void {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Falta la variable de entorno GOOGLE_MAPS_API_KEY');
  }
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida del servicio externo: ${text}`);
  }
}

export async function googleGeocode<T>(address: string): Promise<T> {
  ensureGoogleEnv();

  const url = new URL('/maps/api/geocode/json', GOOGLE_MAPS_BASE_URL);
  url.searchParams.set('address', address);
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Error de Google Geocoding (${response.status}): ${await response.text()}`);
  }
  return safeJson<T>(response);
}

export async function googleComputeRoute<T>(body: Record<string, unknown>): Promise<T> {
  ensureGoogleEnv();

  const response = await fetch(`${GOOGLE_ROUTES_BASE_URL}/directions/v2:computeRoutes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.polyline.encodedPolyline',
        'routes.legs.staticDuration',
        'routes.legs.startLocation.latLng',
        'routes.legs.endLocation.latLng',
        'routes.legs.localizedValues.distance.text',
        'routes.legs.localizedValues.duration.text',
        'routes.legs.localizedValues.staticDuration.text',
        'routes.legs.steps.distanceMeters',
        'routes.legs.steps.staticDuration',
        'routes.legs.steps.navigationInstruction.maneuver',
        'routes.legs.steps.navigationInstruction.instructions',
        'routes.legs.steps.travelMode',
        'routes.legs.steps.localizedValues.distance.text',
        'routes.legs.steps.localizedValues.staticDuration.text',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Error de Google Routes (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}

export async function googleNearbyPlaces<T>(body: Record<string, unknown>): Promise<T> {
  ensureGoogleEnv();

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/v1/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName.text',
        'places.formattedAddress',
        'places.location.latitude',
        'places.location.longitude',
        'places.types',
        'places.photos.name',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Error de Google Places (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}

export async function googlePlaceAutocomplete<T>(input: string): Promise<T> {
  ensureGoogleEnv();

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/v1/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': [
        'suggestions.placePrediction.placeId',
        'suggestions.placePrediction.text.text',
        'suggestions.placePrediction.structuredFormat.mainText.text',
        'suggestions.placePrediction.structuredFormat.secondaryText.text',
      ].join(','),
    },
    body: JSON.stringify({
      input,
      languageCode: 'es-MX',
      includedRegionCodes: ['mx'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Error de Google Places Autocomplete (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}

export async function googlePlaceDetails<T>(placeId: string): Promise<T> {
  ensureGoogleEnv();

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': [
        'id',
        'displayName.text',
        'formattedAddress',
        'location.latitude',
        'location.longitude',
        'types',
        'photos.name',
      ].join(','),
    },
  });

  if (!response.ok) {
    throw new Error(`Error de Google Place Details (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}

export async function googleTextSearchPlaces<T>(body: Record<string, unknown>): Promise<T> {
  ensureGoogleEnv();

  const response = await fetch(`${GOOGLE_PLACES_BASE_URL}/v1/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName.text',
        'places.formattedAddress',
        'places.location.latitude',
        'places.location.longitude',
        'places.types',
        'places.photos.name',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Error de Google Places Text Search (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}
export async function googlePlacePhotoMedia<T>(photoName: string, maxWidthPx = 900): Promise<T> {
  ensureGoogleEnv();

  const normalizedName = photoName.endsWith('/media') ? photoName : `${photoName}/media`;
  const url = new URL(`/v1/${normalizedName}`, GOOGLE_PLACES_BASE_URL);
  url.searchParams.set('maxWidthPx', String(maxWidthPx));
  url.searchParams.set('skipHttpRedirect', 'true');
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY!);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Error de Google Place Photo (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}
