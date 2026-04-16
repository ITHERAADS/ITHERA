export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  adults?: number;
  max?: number;
}

export interface FlightOffer {
  id: string;
  duration: string | null;
  origin: string | null;
  destination: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  airline: string | null;
  flightNumber: string | null;
  stops: number;
  price: number | null;
  currency: string | null;
}