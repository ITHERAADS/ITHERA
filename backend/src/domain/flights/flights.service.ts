import { amadeusGet } from '../../infrastructure/external-apis/amadeus.service';
import { FlightOffer, SearchFlightsParams } from './flights.entity';

interface AmadeusFlightResponse {
  data?: Array<{
    id?: string;
    itineraries?: Array<{
      duration?: string;
      segments?: Array<{
        departure?: { iataCode?: string; at?: string };
        arrival?: { iataCode?: string; at?: string };
        carrierCode?: string;
        number?: string;
        numberOfStops?: number;
      }>;
    }>;
    price?: { total?: string; currency?: string };
  }>;
  dictionaries?: { carriers?: Record<string, string> };
}

export async function searchFlights(params: SearchFlightsParams): Promise<FlightOffer[]> {
  const response = await amadeusGet<AmadeusFlightResponse>('/v2/shopping/flight-offers', {
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departureDate,
    adults: params.adults ?? 1,
    max: params.max ?? 5,
  });

  const carriers = response.dictionaries?.carriers ?? {};

  return (response.data ?? []).map((offer) => {
    const itinerary = offer.itineraries?.[0];
    const segments = itinerary?.segments ?? [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    const connectionStops = segments.length > 1 ? segments.length - 1 : 0;
    const segmentStops = segments.reduce((sum, segment) => sum + (segment.numberOfStops ?? 0), 0);

    return {
      id: offer.id ?? '',
      duration: itinerary?.duration ?? null,
      origin: firstSegment?.departure?.iataCode ?? null,
      destination: lastSegment?.arrival?.iataCode ?? null,
      departureAt: firstSegment?.departure?.at ?? null,
      arrivalAt: lastSegment?.arrival?.at ?? null,
      airline: carriers[firstSegment?.carrierCode ?? ''] ?? firstSegment?.carrierCode ?? null,
      flightNumber: firstSegment?.carrierCode && firstSegment?.number
        ? `${firstSegment.carrierCode}${firstSegment.number}`
        : null,
      stops: connectionStops + segmentStops,
      price: offer.price?.total ? Number(offer.price.total) : null,
      currency: offer.price?.currency ?? null,
    };
  });
}