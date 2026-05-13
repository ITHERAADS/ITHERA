import { googlePlacePhotoMedia, googleTextSearchPlaces } from '../../infrastructure/external-apis/googlemaps.service';
import {
  LiteApiHotelRatesItem,
  LiteApiRateAmount,
  LiteApiRoomType,
  prebookHotelRate,
  retrieveHotelRates,
} from '../../infrastructure/external-apis/liteapi.service';
import { HotelOffer, HotelRoomRate, HotelSearchParams } from './hotels.entity';

const DEFAULT_LIMIT = 12;
const MAX_TRIP_PEOPLE = 50;
const MAX_HOTEL_ROOMS = 50;
const MAX_SEARCH_RANGE_DAYS = 7;
const DEFAULT_RADIUS_METERS = 15000;

function textLimit(value: string | null | undefined, max = 190): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstAmount(value: LiteApiRateAmount[] | LiteApiRateAmount | null | undefined): LiteApiRateAmount | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getFirstImageUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const first = value[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    const item = first as { url?: string; uri?: string };
    return item.url ?? item.uri ?? null;
  }
  return null;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateNights(checkIn: string, checkOut: string): number {
  const startDate = parseIsoDate(checkIn);
  const endDate = parseIsoDate(checkOut);
  if (!startDate || !endDate || endDate <= startDate) return 1;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
}

function splitDestination(destination: string | undefined): { cityName?: string; countryCode?: string } {
  if (!destination) return {};
  const parts = destination.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return {};

  const cityName = parts[0];
  const last = parts[parts.length - 1]?.toLowerCase();
  const countryCode = last === 'méxico' || last === 'mexico' || last === 'mx' ? 'MX' : undefined;
  return { cityName, countryCode };
}

function buildOccupancies(params: HotelSearchParams) {
  const rooms = Math.max(1, Math.min(MAX_HOTEL_ROOMS, Math.trunc(params.rooms ?? 1)));
  const adults = Math.max(1, Math.min(MAX_TRIP_PEOPLE, Math.trunc(params.adults ?? 1)));
  const children = (params.childrenAges ?? []).filter((age) => Number.isFinite(age) && age >= 0 && age <= 17);

  if (adults + children.length > MAX_TRIP_PEOPLE) {
    throw Object.assign(new Error(`La búsqueda permite máximo ${MAX_TRIP_PEOPLE} huéspedes en total`), { statusCode: 400 });
  }

  if (rooms > adults) {
    throw Object.assign(new Error('El número de habitaciones no puede ser mayor que el número de adultos'), { statusCode: 400 });
  }

  const occupancies = Array.from({ length: rooms }, () => ({ adults: 0, children: [] as number[] }));

  for (let i = 0; i < adults; i += 1) {
    occupancies[i % rooms].adults += 1;
  }

  children.forEach((age, index) => {
    occupancies[index % rooms].children.push(age);
  });

  return occupancies.map((occupancy) => ({
    adults: Math.max(1, occupancy.adults),
    children: occupancy.children,
  }));
}

interface GooglePlaceSummary {
  id: string | null;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  userRatingCount: number | null;
  photoName: string | null;
  photoUrl: string | null;
}

async function tryResolveGooglePlace(hotelName: string, destination?: string): Promise<GooglePlaceSummary | null> {
  try {
    const response = await googleTextSearchPlaces<{
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
        photos?: Array<{ name?: string }>;
      }>;
    }>({
      textQuery: [hotelName, destination].filter(Boolean).join(' '),
      languageCode: 'es-MX',
      maxResultCount: 1,
    });

    const place = response.places?.[0];
    if (!place) return null;

    const photoName = place.photos?.[0]?.name ?? null;
    let photoUrl: string | null = null;

    if (photoName) {
      try {
        const photo = await googlePlacePhotoMedia<{ photoUri?: string }>(photoName, 900);
        photoUrl = photo.photoUri ?? null;
      } catch {
        photoUrl = null;
      }
    }

    return {
      id: place.id ?? null,
      name: place.displayName?.text ?? null,
      address: place.formattedAddress ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      rating: toNumber(place.rating),
      userRatingCount: toNumber(place.userRatingCount),
      photoName,
      photoUrl,
    };
  } catch {
    return null;
  }
}

function normalizeRoom(room: LiteApiRoomType): HotelRoomRate | null {
  const rate = room.rates?.[0];
  if (!rate && !room.offerId) return null;

  const total = firstAmount(rate?.retailRate?.total) ?? room.offerRetailRate ?? null;
  const suggested = firstAmount(rate?.retailRate?.suggestedSellingPrice) ?? room.suggestedSellingPrice ?? null;

  return {
    rateId: rate?.rateId ?? null,
    roomTypeId: room.roomTypeId ?? null,
    offerId: room.offerId ?? null,
    name: rate?.name ?? null,
    boardName: rate?.boardName ?? null,
    boardType: rate?.boardType ?? null,
    refundableTag: rate?.cancellationPolicies?.refundableTag ?? null,
    maxOccupancy: toNumber(rate?.maxOccupancy),
    adultCount: toNumber(rate?.adultCount),
    childCount: toNumber(rate?.childCount),
    price: toNumber(total?.amount),
    currency: total?.currency ?? null,
    suggestedSellingPrice: toNumber(suggested?.amount),
    taxesAndFees: rate?.retailRate?.taxesAndFees ?? [],
    cancellationPolicies: rate?.cancellationPolicies ?? null,
    paymentTypes: room.paymentTypes ?? rate?.paymentTypes ?? [],
  };
}

function extractHotelBase(item: LiteApiHotelRatesItem) {
  const hotel = item.hotel ?? item;
  const hotelId = item.hotelId ?? hotel.hotelId ?? '';
  const name = hotel.name ?? hotel.hotelName ?? item.name ?? item.hotelName ?? `Hotel ${hotelId}`;
  const address = hotel.address ?? item.address ?? null;
  const latitude = toNumber(hotel.latitude ?? item.latitude);
  const longitude = toNumber(hotel.longitude ?? item.longitude);
  const rating = toNumber(hotel.rating ?? hotel.stars ?? hotel.starRating ?? item.rating ?? item.stars ?? item.starRating);
  const photoUrl = hotel.main_photo ?? hotel.thumbnail ?? getFirstImageUrl(hotel.images) ?? getFirstImageUrl(hotel.photos) ?? null;

  return {
    hotelId,
    name,
    address,
    city: hotel.city ?? item.city ?? null,
    country: hotel.country ?? item.country ?? hotel.countryCode ?? item.countryCode ?? null,
    latitude,
    longitude,
    rating,
    photoUrl,
  };
}

function validateSearchParams(params: HotelSearchParams): void {
  if (!params.checkIn || !params.checkOut) {
    throw Object.assign(new Error('checkIn y checkOut son requeridos'), { statusCode: 400 });
  }

  if (!parseIsoDate(params.checkIn) || !parseIsoDate(params.checkOut)) {
    throw Object.assign(new Error('checkIn y checkOut deben tener formato YYYY-MM-DD'), { statusCode: 400 });
  }

  const nights = calculateNights(params.checkIn, params.checkOut);

  if (nights < 1) {
    throw Object.assign(new Error('checkOut debe ser posterior a checkIn'), { statusCode: 400 });
  }

  if (nights > MAX_SEARCH_RANGE_DAYS) {
    throw Object.assign(new Error(`La búsqueda de hospedaje permite máximo ${MAX_SEARCH_RANGE_DAYS} noche(s)`), { statusCode: 400 });
  }

  const hasLocation = Boolean(params.destination || params.placeId || (typeof params.latitude === 'number' && typeof params.longitude === 'number'));
  if (!hasLocation) {
    throw Object.assign(new Error('Debes enviar destino, placeId o coordenadas'), { statusCode: 400 });
  }
}

export async function searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
  validateSearchParams(params);

  const destinationParts = splitDestination(params.destination);
  const countryCode = params.countryCode ?? params.guestNationality ?? destinationParts.countryCode ?? 'MX';
  const body: Record<string, unknown> = {
    checkin: params.checkIn,
    checkout: params.checkOut,
    currency: params.currency ?? 'MXN',
    guestNationality: params.guestNationality ?? 'MX',
    occupancies: buildOccupancies(params),
    timeout: 12,
    limit: Math.max(1, Math.min((params.limit ?? DEFAULT_LIMIT) * 4, 50)),
    maxRatesPerHotel: 5,
    includeHotelData: true,
    roomMapping: true,
  };

  if (typeof params.latitude === 'number' && typeof params.longitude === 'number') {
    body.latitude = params.latitude;
    body.longitude = params.longitude;
    body.radius = params.radius ?? DEFAULT_RADIUS_METERS;
  } else if (params.placeId) {
    body.placeId = params.placeId;
  } else if (params.destination) {
    body.cityName = destinationParts.cityName ?? params.destination;
    body.countryCode = countryCode;
    body.aiSearch = `hoteles en ${params.destination}`;
  }

  if (params.minRating) body.minRating = params.minRating;

  const response = await retrieveHotelRates(body as any);
  const items = response.data ?? [];
  const nights = calculateNights(params.checkIn, params.checkOut);
  const limit = Math.max(1, Math.min(params.limit ?? DEFAULT_LIMIT, 50));

  const normalized = await Promise.all(
    items.map(async (item, index): Promise<HotelOffer | null> => {
      const base = extractHotelBase(item);
      if (!base.hotelId) return null;

      const rooms = (item.roomTypes ?? []).map(normalizeRoom).filter((room): room is HotelRoomRate => Boolean(room));
      const cheapest = rooms
        .filter((room) => typeof room.price === 'number')
        .sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))[0] ?? rooms[0] ?? null;

      const google = await tryResolveGooglePlace(base.name, params.destination);
      const photoUrl = google?.photoUrl ?? base.photoUrl;

      return {
        id: `${base.hotelId}-${cheapest?.offerId ?? index}`,
        hotelId: textLimit(base.hotelId, 190) ?? base.hotelId,
        provider: 'liteapi',
        supplier: item.roomTypes?.[0]?.supplier ?? null,
        supplierId: item.roomTypes?.[0]?.supplierId ?? null,
        name: textLimit(google?.name ?? base.name, 190) ?? base.name,
        address: google?.address ?? base.address,
        city: base.city,
        country: base.country,
        latitude: google?.latitude ?? base.latitude,
        longitude: google?.longitude ?? base.longitude,
        rating: google?.rating ?? base.rating,
        googleRating: google?.rating ?? null,
        googlePlaceId: google?.id ?? null,
        googleUserRatingCount: google?.userRatingCount ?? null,
        photoName: google?.photoName ?? null,
        photoUrl,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights,
        price: cheapest?.price ?? null,
        currency: cheapest?.currency ?? params.currency ?? 'MXN',
        offerId: textLimit(cheapest?.offerId ?? null, 190),
        roomName: cheapest?.name ?? null,
        boardName: cheapest?.boardName ?? null,
        refundableTag: cheapest?.refundableTag ?? null,
        rooms,
        rateCount: rooms.length,
        priceMin: cheapest?.price ?? null,
        priceMax: rooms.filter((room) => typeof room.price === 'number').sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0]?.price ?? cheapest?.price ?? null,
        raw: item as unknown as Record<string, unknown>,
      };
    })
  );

  const byHotel = new Map<string, HotelOffer>();

  for (const item of normalized.filter((entry): entry is HotelOffer => Boolean(entry))) {
    const existing = byHotel.get(item.hotelId);
    if (!existing) {
      byHotel.set(item.hotelId, item);
      continue;
    }

    const mergedRooms = [...existing.rooms, ...item.rooms]
      .filter((room, index, all) => {
        const key = `${room.offerId ?? ''}-${room.rateId ?? ''}-${room.name ?? ''}-${room.price ?? ''}`;
        return all.findIndex((candidate) => `${candidate.offerId ?? ''}-${candidate.rateId ?? ''}-${candidate.name ?? ''}-${candidate.price ?? ''}` === key) === index;
      })
      .sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));

    const cheapestRoom = mergedRooms.find((room) => typeof room.price === 'number') ?? mergedRooms[0] ?? null;
    byHotel.set(item.hotelId, {
      ...existing,
      price: cheapestRoom?.price ?? existing.price,
      currency: cheapestRoom?.currency ?? existing.currency,
      offerId: textLimit(cheapestRoom?.offerId ?? existing.offerId, 190),
      roomName: cheapestRoom?.name ?? existing.roomName,
      boardName: cheapestRoom?.boardName ?? existing.boardName,
      refundableTag: cheapestRoom?.refundableTag ?? existing.refundableTag,
      rooms: mergedRooms,
      rateCount: mergedRooms.length,
      priceMin: mergedRooms.find((room) => typeof room.price === 'number')?.price ?? existing.priceMin,
      priceMax: [...mergedRooms].reverse().find((room) => typeof room.price === 'number')?.price ?? existing.priceMax,
    });
  }

  return Array.from(byHotel.values())
    .sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
    .slice(0, limit);
}

export async function prebookHotel(offerId: string) {
  if (!offerId) {
    throw Object.assign(new Error('offerId es requerido'), { statusCode: 400 });
  }

  return prebookHotelRate({ offerId, usePaymentSdk: false });
}
