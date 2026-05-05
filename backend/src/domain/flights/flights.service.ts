import { createOfferRequest, DuffelOffer, DuffelSegment, DuffelSlice } from '../../infrastructure/external-apis/duffel.service';
import { FlightBaggage, FlightOffer, FlightSegment, FlightSliceSummary, SearchFlightsParams } from './flights.entity';

const DEFAULT_MAX_RESULTS = 20;

function toNumber(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIata(value: string | null | undefined): string | null {
  return value ? value.toUpperCase() : null;
}

function buildFlightNumber(segment: DuffelSegment | undefined): string | null {
  if (!segment) return null;

  const carrierCode =
    segment.marketing_carrier?.iata_code ??
    segment.operating_carrier?.iata_code ??
    null;

  const flightNumber =
    segment.marketing_carrier_flight_number ??
    segment.operating_carrier_flight_number ??
    null;

  if (!carrierCode || !flightNumber) return null;
  return `${carrierCode}${flightNumber}`;
}

function collectBaggage(segment: DuffelSegment | undefined): FlightBaggage[] {
  const raw = segment?.passengers?.[0]?.baggages ?? [];
  return raw
    .filter((item) => item.type && typeof item.quantity === 'number')
    .map((item) => ({
      type: String(item.type),
      quantity: Number(item.quantity),
    }));
}

function normalizeSegment(segment: DuffelSegment): FlightSegment {
  const operatingCarrier = segment.operating_carrier ?? segment.marketing_carrier ?? null;

  return {
    origin: normalizeIata(segment.origin?.iata_code),
    originName: segment.origin?.name ?? segment.origin?.city_name ?? null,
    destination: normalizeIata(segment.destination?.iata_code),
    destinationName: segment.destination?.name ?? segment.destination?.city_name ?? null,
    departureAt: segment.departing_at ?? null,
    arrivalAt: segment.arriving_at ?? null,
    duration: segment.duration ?? null,
    airline: operatingCarrier?.name ?? null,
    airlineCode: normalizeIata(operatingCarrier?.iata_code),
    flightNumber: buildFlightNumber(segment),
    aircraft: segment.aircraft?.name ?? null,
    stops: Array.isArray(segment.stops) ? segment.stops.length : 0,
  };
}

function summarizeSlice(slice: DuffelSlice | undefined): FlightSliceSummary | null {
  if (!slice) return null;

  const segments = (slice.segments ?? []).map(normalizeSegment);
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1] ?? firstSegment;
  const connectionStops = Math.max(segments.length - 1, 0);
  const technicalStops = segments.reduce((sum, segment) => sum + segment.stops, 0);

  return {
    origin: firstSegment?.origin ?? normalizeIata(slice.origin?.iata_code),
    originName: firstSegment?.originName ?? slice.origin?.name ?? slice.origin?.city_name ?? null,
    destination: lastSegment?.destination ?? normalizeIata(slice.destination?.iata_code),
    destinationName: lastSegment?.destinationName ?? slice.destination?.name ?? slice.destination?.city_name ?? null,
    departureAt: firstSegment?.departureAt ?? null,
    arrivalAt: lastSegment?.arrivalAt ?? null,
    duration: slice.duration ?? firstSegment?.duration ?? null,
    stops: connectionStops + technicalStops,
    segments,
  };
}

function normalizeOffer(offer: DuffelOffer, params: SearchFlightsParams): FlightOffer {
  const slices = offer.slices ?? [];
  const outboundSlice = summarizeSlice(slices[0]);
  const returnSlice = summarizeSlice(slices[1]);
  const firstSegment = slices[0]?.segments?.[0];
  const owner = offer.owner ?? firstSegment?.operating_carrier ?? firstSegment?.marketing_carrier ?? null;

  const adults = Math.max(1, params.adults ?? 1);
  const children = Math.max(0, params.children ?? 0);
  const infantsWithoutSeat = Math.max(0, params.infantsWithoutSeat ?? 0);

  return {
    id: offer.id ?? '',
    provider: 'duffel',
    liveMode: Boolean(offer.live_mode),
    airline: owner?.name ?? null,
    airlineCode: normalizeIata(owner?.iata_code),
    flightNumber: buildFlightNumber(firstSegment),
    origin: outboundSlice?.origin ?? null,
    originName: outboundSlice?.originName ?? null,
    destination: outboundSlice?.destination ?? null,
    destinationName: outboundSlice?.destinationName ?? null,
    departureAt: outboundSlice?.departureAt ?? null,
    arrivalAt: outboundSlice?.arrivalAt ?? null,
    duration: outboundSlice?.duration ?? null,
    stops: outboundSlice?.stops ?? 0,
    price: toNumber(offer.total_amount),
    currency: offer.total_currency ?? null,
    cabinClass: firstSegment?.passengers?.[0]?.cabin_class ?? params.cabinClass ?? 'economy',
    fareBrand: slices[0]?.fare_brand_name ?? null,
    aircraft: firstSegment?.aircraft?.name ?? null,
    baggage: collectBaggage(firstSegment),
    passengers: {
      adults,
      children,
      infantsWithoutSeat,
      total: adults + children + infantsWithoutSeat,
    },
    outboundSlice,
    returnSlice,
    slices: slices.map((slice) => (slice.segments ?? []).map(normalizeSegment)),
    raw: offer as unknown as Record<string, unknown>,
  };
}

function validateParams(params: SearchFlightsParams): void {
  if (!params.origin || !params.destination || !params.departureDate) {
    throw Object.assign(new Error('origin, destination y departureDate son requeridos'), { statusCode: 400 });
  }

  if (params.origin === params.destination) {
    throw Object.assign(new Error('El origen y el destino no pueden ser iguales'), { statusCode: 400 });
  }

  if ((params.infantsWithoutSeat ?? 0) > (params.adults ?? 1)) {
    throw Object.assign(new Error('No puede haber más infantes sin asiento que adultos'), { statusCode: 400 });
  }
}

export async function searchFlights(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const normalizedParams: SearchFlightsParams = {
    ...params,
    origin: params.origin.toUpperCase().trim(),
    destination: params.destination.toUpperCase().trim(),
    adults: Math.max(1, params.adults ?? 1),
    children: Math.max(0, params.children ?? 0),
    infantsWithoutSeat: Math.max(0, params.infantsWithoutSeat ?? 0),
    cabinClass: params.cabinClass ?? 'economy',
    max: Math.max(1, params.max ?? DEFAULT_MAX_RESULTS),
  };

  validateParams(normalizedParams);

  const response = await createOfferRequest(normalizedParams);
  const offers = response.data?.offers ?? [];

  return offers
    .map((offer) => normalizeOffer(offer, normalizedParams))
    .filter((offer) => offer.id)
    .slice(0, normalizedParams.max);
}
