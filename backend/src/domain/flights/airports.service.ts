import { AIRPORT_CATALOG, AirportCatalogItem } from './airports.data';
import * as MapsService from '../maps/maps.service';

export interface AirportSuggestion {
  code: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  label: string;
  matchSource: 'iata' | 'catalog' | 'nearest' | 'google_geocoding';
  score: number;
  distanceKm?: number;
}

interface SearchAirportsParams {
  query?: string;
  latitude?: number;
  longitude?: number;
  max?: number;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function airportLabel(airport: AirportCatalogItem): string {
  const region = airport.state ? `${airport.state}, ${airport.country}` : airport.country;
  return `${airport.code} — ${airport.city} · ${region}`;
}

function toSuggestion(
  airport: AirportCatalogItem,
  score: number,
  matchSource: AirportSuggestion['matchSource'],
  distanceKm?: number
): AirportSuggestion {
  return {
    code: airport.code,
    name: airport.name,
    city: airport.city,
    state: airport.state,
    country: airport.country,
    countryCode: airport.countryCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
    label: airportLabel(airport),
    matchSource,
    score,
    distanceKm,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreAirport(airport: AirportCatalogItem, normalizedQuery: string): number {
  if (!normalizedQuery) return 0;

  const code = airport.code.toLowerCase();
  const city = normalizeText(airport.city);
  const name = normalizeText(airport.name);
  const state = normalizeText(airport.state ?? '');
  const country = normalizeText(airport.country);
  const aliases = airport.aliases.map(normalizeText);
  const haystack = [code, city, name, state, country, ...aliases].join(' ');
  const terms = normalizedQuery.split(' ').filter(Boolean);

  if (code === normalizedQuery) return 120;
  if (aliases.includes(normalizedQuery)) return 110;
  if (city === normalizedQuery) return 105;
  if (city.startsWith(normalizedQuery)) return 95;
  if (name.includes(normalizedQuery)) return 85;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) return 80;
  if (terms.length > 1 && terms.every((term) => haystack.includes(term))) return 72;
  if (haystack.includes(normalizedQuery)) return 65;

  return 0;
}

function sortAndLimit(suggestions: AirportSuggestion[], max: number): AirportSuggestion[] {
  const unique = new Map<string, AirportSuggestion>();

  for (const suggestion of suggestions) {
    const previous = unique.get(suggestion.code);
    if (!previous || suggestion.score > previous.score) {
      unique.set(suggestion.code, suggestion);
    }
  }

  return [...unique.values()]
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      const distanceA = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return distanceA - distanceB;
    })
    .slice(0, max);
}

export function searchAirports(params: SearchAirportsParams): AirportSuggestion[] {
  const query = normalizeText(params.query ?? '');
  const max = Math.min(Math.max(params.max ?? 8, 1), 20);
  const hasCoordinates = Number.isFinite(params.latitude) && Number.isFinite(params.longitude);

  const catalogMatches = AIRPORT_CATALOG
    .map((airport) => {
      const score = scoreAirport(airport, query);
      if (score <= 0) return null;
      const distanceKm = hasCoordinates
        ? haversineKm(params.latitude!, params.longitude!, airport.latitude, airport.longitude)
        : undefined;
      return toSuggestion(airport, score, score >= 120 ? 'iata' : 'catalog', distanceKm);
    })
    .filter(Boolean) as AirportSuggestion[];

  if (catalogMatches.length > 0) {
    return sortAndLimit(catalogMatches, max);
  }

  if (hasCoordinates) {
    return getNearestAirports(params.latitude!, params.longitude!, max);
  }

  return [];
}

export function getNearestAirports(latitude: number, longitude: number, max = 5): AirportSuggestion[] {
  return AIRPORT_CATALOG
    .map((airport) => {
      const distanceKm = haversineKm(latitude, longitude, airport.latitude, airport.longitude);
      const score = Math.max(1, 100 - distanceKm / 10);
      return toSuggestion(airport, score, 'nearest', distanceKm);
    })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, Math.min(Math.max(max, 1), 20));
}

export async function resolveAirport(params: SearchAirportsParams): Promise<AirportSuggestion | null> {
  const max = Math.min(Math.max(params.max ?? 8, 1), 20);
  const directMatches = searchAirports({ ...params, max });

  if (directMatches.length > 0) {
    return directMatches[0];
  }

  if (params.query && params.query.trim().length >= 3) {
    try {
      const geocoded = await MapsService.geocodeAddress(params.query);
      const latitude = geocoded?.latitude;
      const longitude = geocoded?.longitude;

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        const nearest = getNearestAirports(latitude, longitude, 1)[0];
        return nearest ? { ...nearest, matchSource: 'google_geocoding' } : null;
      }
    } catch {
      // Si Google no está configurado o no responde, se conserva el flujo por catálogo local.
    }
  }

  if (Number.isFinite(params.latitude) && Number.isFinite(params.longitude)) {
    return getNearestAirports(params.latitude!, params.longitude!, 1)[0] ?? null;
  }

  return null;
}
