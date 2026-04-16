export interface SearchHotelsByCityParams {
  cityCode: string;
}

export interface GetHotelOffersParams {
  hotelIds: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
}

export interface HotelOffer {
  hotelId: string | null;
  hotelName: string | null;
  cityCode: string | null;
  latitude: number | null;
  longitude: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  priceTotal: number | null;
  currency: string | null;
}