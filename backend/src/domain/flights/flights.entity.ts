export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type PassengerType = 'adult' | 'child' | 'infant_without_seat';

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infantsWithoutSeat?: number;
  cabinClass?: CabinClass;
  max?: number;
}

export interface FlightBaggage {
  type: string;
  quantity: number;
}

export interface FlightSegment {
  origin: string | null;
  originName: string | null;
  destination: string | null;
  destinationName: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  duration: string | null;
  airline: string | null;
  airlineCode: string | null;
  flightNumber: string | null;
  aircraft: string | null;
  stops: number;
}

export interface FlightSliceSummary {
  origin: string | null;
  originName: string | null;
  destination: string | null;
  destinationName: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  duration: string | null;
  stops: number;
  segments: FlightSegment[];
}

export interface FlightOffer {
  id: string;
  provider: 'duffel';
  liveMode: boolean;
  airline: string | null;
  airlineCode: string | null;
  flightNumber: string | null;
  origin: string | null;
  originName: string | null;
  destination: string | null;
  destinationName: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  duration: string | null;
  stops: number;
  price: number | null;
  currency: string | null;
  cabinClass: string | null;
  fareBrand: string | null;
  aircraft: string | null;
  baggage: FlightBaggage[];
  passengers: {
    adults: number;
    children: number;
    infantsWithoutSeat: number;
    total: number;
  };
  outboundSlice: FlightSliceSummary | null;
  returnSlice: FlightSliceSummary | null;
  slices: FlightSegment[][];
  raw: Record<string, unknown>;
}
