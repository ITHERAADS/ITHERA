import { env } from '../../config/env';

export interface LiteApiOccupancy {
  adults: number;
  children?: number[];
}

export interface LiteApiRatesRequest {
  checkin: string;
  checkout: string;
  currency: string;
  guestNationality: string;
  occupancies: LiteApiOccupancy[];
  hotelIds?: string[];
  cityName?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  placeId?: string;
  iataCode?: string;
  aiSearch?: string;
  limit?: number;
  timeout?: number;
  maxRatesPerHotel?: number;
  includeHotelData?: boolean;
  minRating?: number;
  starRating?: number[];
}

export interface LiteApiRateAmount {
  amount?: number;
  currency?: string;
  source?: string;
}

export interface LiteApiRate {
  rateId?: string;
  occupancyNumber?: number;
  name?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  childrenAges?: number[];
  boardType?: string;
  boardName?: string;
  remarks?: string;
  priceType?: string;
  commission?: LiteApiRateAmount[];
  retailRate?: {
    total?: LiteApiRateAmount[] | LiteApiRateAmount;
    suggestedSellingPrice?: LiteApiRateAmount[] | LiteApiRateAmount;
    initialPrice?: LiteApiRateAmount[] | LiteApiRateAmount | null;
    taxesAndFees?: Array<LiteApiRateAmount & { included?: boolean; description?: string }>;
  };
  cancellationPolicies?: {
    cancelPolicyInfos?: unknown[];
    hotelRemarks?: unknown[];
    refundableTag?: string;
  };
  mappedRoomId?: number;
  paymentTypes?: string[];
  perks?: unknown[];
  promotions?: unknown;
}

export interface LiteApiRoomType {
  roomTypeId?: string;
  offerId?: string;
  supplier?: string;
  supplierId?: number;
  rates?: LiteApiRate[];
  offerRetailRate?: LiteApiRateAmount;
  suggestedSellingPrice?: LiteApiRateAmount;
  offerInitialPrice?: LiteApiRateAmount;
  priceType?: string;
  rateType?: string;
  paymentTypes?: string[];
}

export interface LiteApiHotelData {
  hotelId?: string;
  name?: string;
  hotelName?: string;
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  stars?: number;
  starRating?: number;
  main_photo?: string;
  thumbnail?: string;
  images?: Array<string | { url?: string; uri?: string }>;
  photos?: Array<string | { url?: string; uri?: string }>;
}

export interface LiteApiHotelRatesItem extends LiteApiHotelData {
  roomTypes?: LiteApiRoomType[];
  hotel?: LiteApiHotelData;
  et?: number;
}

export interface LiteApiRatesResponse {
  data?: LiteApiHotelRatesItem[];
  guestLevel?: number;
  sandbox?: boolean;
}

export interface LiteApiPrebookRequest {
  offerId: string;
  usePaymentSdk?: boolean;
}

export interface LiteApiPrebookResponse {
  data?: Record<string, unknown>;
  guestLevel?: number;
  sandbox?: boolean;
}

function ensureLiteApiEnv(): { apiKey: string; baseUrl: string } {
  const apiKey = env.LITEAPI_API_KEY ?? process.env['LITEAPI_API_KEY'];
  if (!apiKey) {
    throw new Error('Falta la variable de entorno LITEAPI_API_KEY');
  }

  return {
    apiKey,
    baseUrl: env.LITEAPI_BASE_URL ?? process.env['LITEAPI_BASE_URL'] ?? 'https://api.liteapi.travel',
  };
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta no válida de LiteAPI: ${text}`);
  }
}

async function liteApiRequest<T>(path: string, body: Record<string, unknown>, timeoutMs = 20000): Promise<T> {
  const { apiKey, baseUrl } = ensureLiteApiEnv();

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Error de LiteAPI (${response.status}): ${await response.text()}`);
  }

  return safeJson<T>(response);
}

export async function retrieveHotelRates(body: LiteApiRatesRequest): Promise<LiteApiRatesResponse> {
  return liteApiRequest<LiteApiRatesResponse>(
    '/v3.0/hotels/rates',
    { ...body } as Record<string, unknown>,
    (body.timeout ?? 12) * 1000 + 4000
  );
}

export async function prebookHotelRate(body: LiteApiPrebookRequest): Promise<LiteApiPrebookResponse> {
  return liteApiRequest<LiteApiPrebookResponse>('/v3.0/rates/prebook', {
    usePaymentSdk: body.usePaymentSdk ?? false,
    offerId: body.offerId,
  });
}
