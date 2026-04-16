import { amadeusGet } from '../../infrastructure/external-apis/amadeus.service';
import { GetHotelOffersParams, HotelOffer, SearchHotelsByCityParams } from './hotels.entity';

interface AmadeusHotelListResponse {
  data?: Array<{ hotelId?: string }>;
}

interface AmadeusHotelOffersResponse {
  data?: Array<{
    hotel?: {
      hotelId?: string;
      name?: string;
      cityCode?: string;
      latitude?: number;
      longitude?: number;
    };
    offers?: Array<{
      checkInDate?: string;
      checkOutDate?: string;
      price?: { total?: string; currency?: string };
    }>;
  }>;
}

export async function searchHotelsByCity(params: SearchHotelsByCityParams): Promise<HotelOffer[]> {
  const hotelList = await amadeusGet<AmadeusHotelListResponse>('/v1/reference-data/locations/hotels/by-city', {
    cityCode: params.cityCode,
  });

  const hotelIds = (hotelList.data ?? [])
    .map((hotel) => hotel.hotelId)
    .filter((id): id is string => Boolean(id))
    .slice(0, 5)
    .join(',');

  if (!hotelIds) {
    return [];
  }

  return getHotelOffers({ hotelIds, adults: 1 });
}

export async function getHotelOffers(params: GetHotelOffersParams): Promise<HotelOffer[]> {
  const response = await amadeusGet<AmadeusHotelOffersResponse>('/v3/shopping/hotel-offers', {
    hotelIds: params.hotelIds,
    checkInDate: params.checkIn,
    checkOutDate: params.checkOut,
    adults: params.adults ?? 1,
  });

  return (response.data ?? []).map((item) => {
    const firstOffer = item.offers?.[0];
    return {
      hotelId: item.hotel?.hotelId ?? null,
      hotelName: item.hotel?.name ?? null,
      cityCode: item.hotel?.cityCode ?? null,
      latitude: item.hotel?.latitude ?? null,
      longitude: item.hotel?.longitude ?? null,
      checkInDate: firstOffer?.checkInDate ?? null,
      checkOutDate: firstOffer?.checkOutDate ?? null,
      priceTotal: firstOffer?.price?.total ? Number(firstOffer.price.total) : null,
      currency: firstOffer?.price?.currency ?? null,
    };
  });
}