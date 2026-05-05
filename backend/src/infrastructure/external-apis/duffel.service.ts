import { env } from '../../config/env';
import { PassengerType, SearchFlightsParams } from '../../domain/flights/flights.entity';

export interface DuffelPassengerInput {
  type: PassengerType;
}

interface DuffelCreateOfferRequestBody {
  data: {
    slices: Array<{
      origin: string;
      destination: string;
      departure_date: string;
    }>;
    passengers: DuffelPassengerInput[];
    cabin_class?: string;
  };
}

export interface DuffelAirline {
  id?: string;
  name?: string;
  iata_code?: string | null;
  logo_symbol_url?: string | null;
  logo_lockup_url?: string | null;
  conditions_of_carriage_url?: string | null;
}

export interface DuffelAirport {
  id?: string;
  name?: string | null;
  city_name?: string | null;
  iata_code?: string | null;
  iata_city_code?: string | null;
  iata_country_code?: string | null;
  time_zone?: string | null;
  type?: string | null;
}

export interface DuffelOfferResponse {
  data: {
    id?: string;
    live_mode?: boolean;
    offers?: DuffelOffer[];
  };
}

export interface DuffelOffer {
  id?: string;
  live_mode?: boolean;
  total_amount?: string | null;
  total_currency?: string | null;
  base_amount?: string | null;
  base_currency?: string | null;
  tax_amount?: string | null;
  tax_currency?: string | null;
  expires_at?: string | null;
  owner?: DuffelAirline | null;
  slices?: DuffelSlice[];
  passengers?: Array<{
    id?: string;
    type?: string;
    age?: number | null;
  }>;
}

export interface DuffelSlice {
  id?: string;
  duration?: string | null;
  fare_brand_name?: string | null;
  origin?: DuffelAirport | null;
  destination?: DuffelAirport | null;
  segments?: DuffelSegment[];
}

export interface DuffelSegment {
  id?: string;
  origin?: DuffelAirport | null;
  destination?: DuffelAirport | null;
  departing_at?: string | null;
  arriving_at?: string | null;
  duration?: string | null;
  operating_carrier?: DuffelAirline | null;
  marketing_carrier?: DuffelAirline | null;
  operating_carrier_flight_number?: string | null;
  marketing_carrier_flight_number?: string | null;
  stops?: unknown[];
  aircraft?: {
    id?: string;
    iata_code?: string | null;
    name?: string | null;
  } | null;
  passengers?: Array<{
    passenger_id?: string;
    cabin_class?: string | null;
    cabin_class_marketing_name?: string | null;
    baggages?: Array<{
      type?: string;
      quantity?: number;
    }>;
  }>;
}

function ensureDuffelEnv(): { token: string; baseUrl: string; apiVersion: string } {
  const token = env.DUFFEL_ACCESS_TOKEN ?? process.env['DUFFEL_ACCESS_TOKEN'];
  if (!token) {
    throw new Error('Falta la variable de entorno DUFFEL_ACCESS_TOKEN');
  }

  return {
    token,
    baseUrl: env.DUFFEL_BASE_URL ?? process.env['DUFFEL_BASE_URL'] ?? 'https://api.duffel.com',
    apiVersion: env.DUFFEL_API_VERSION ?? process.env['DUFFEL_API_VERSION'] ?? 'v2',
  };
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error('La respuesta del servicio de Duffel está vacía');
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida del servicio externo: ${text}`);
  }
}

function buildPassengers(params: SearchFlightsParams): DuffelPassengerInput[] {
  const adults = Math.max(1, params.adults ?? 1);
  const children = Math.max(0, params.children ?? 0);
  const infantsWithoutSeat = Math.max(0, params.infantsWithoutSeat ?? 0);

  return [
    ...Array.from({ length: adults }, () => ({ type: 'adult' as const })),
    ...Array.from({ length: children }, () => ({ type: 'child' as const })),
    ...Array.from({ length: infantsWithoutSeat }, () => ({ type: 'infant_without_seat' as const })),
  ];
}

function buildOfferRequestBody(params: SearchFlightsParams): DuffelCreateOfferRequestBody {
  const slices = [
    {
      origin: params.origin,
      destination: params.destination,
      departure_date: params.departureDate,
    },
  ];

  if (params.returnDate) {
    slices.push({
      origin: params.destination,
      destination: params.origin,
      departure_date: params.returnDate,
    });
  }

  return {
    data: {
      slices,
      passengers: buildPassengers(params),
      cabin_class: params.cabinClass ?? 'economy',
    },
  };
}

export async function createOfferRequest(params: SearchFlightsParams): Promise<DuffelOfferResponse> {
  const { token, baseUrl, apiVersion } = ensureDuffelEnv();
  const url = new URL('/air/offer_requests', baseUrl);
  url.searchParams.set('return_offers', 'true');

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Duffel-Version': apiVersion,
    },
    body: JSON.stringify(buildOfferRequestBody(params)),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de Duffel (${response.status}): ${errorText}`);
  }

  return safeJson<DuffelOfferResponse>(response);
}
