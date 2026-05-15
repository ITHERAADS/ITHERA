import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchIntegratedShell } from "./SearchIntegratedShell";
import { useAuth } from "../../context/useAuth";
import {
  flightsService,
  type CabinClass,
  type FlightAirportOption,
  type FlightOffer,
} from "../../services/flights";
import { hotelsService, type HotelOffer } from "../../services/hotels";
import { getCurrentGroup } from "../../services/groups";
import type { Group } from "../../types/groups";
import { proposalsService } from "../../services/proposals";

type SearchTab = "flights" | "hotels";
type ViewState = "initial" | "loading" | "results" | "error";

interface Flight extends FlightOffer {
  proposed: boolean;
  saving?: boolean;
}

interface Hotel extends HotelOffer {
  proposed: boolean;
  saving?: boolean;
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function airportOptionLabel(airport: FlightAirportOption) {
  const distance =
    typeof airport.distanceKm === "number"
      ? ` · ${Math.round(airport.distanceKm)} km aprox.`
      : "";

  return `${airport.code} — ${airport.city}, ${airport.country}${distance}`;
}

function sanitizeAirportCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

function isIataCode(value: string) {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}

function AirportSearchInput({
  id,
  value,
  options,
  loading,
  onChange,
  onSelect,
  onBlur,
  placeholder,
}: {
  id: string;
  value: string;
  options: FlightAirportOption[];
  loading: boolean;
  onChange: (value: string) => void;
  onSelect: (airport: FlightAirportOption) => void;
  onBlur: () => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  const normalizedValue = normalizeForSearch(value);
  const showOptions =
    focused && normalizedValue.length >= 2 && options.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
        placeholder={placeholder}
        autoComplete="off"
      />

      {showOptions && (
        <div className="absolute left-0 right-0 top-[72px] z-30 max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
          {options.map((airport) => (
            <button
              key={`${id}-${airport.code}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(airport);
                setFocused(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#EEF4FF]"
            >
              <span className="block text-sm font-semibold text-[#1E0A4E]">
                {airportOptionLabel(airport)}
              </span>
              <span className="block text-[11px] font-normal text-gray-400">
                {airport.name}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-1 text-[11px] font-normal text-gray-400">
        {loading
          ? "Buscando aeropuertos..."
          : isIataCode(value)
            ? `Código IATA listo para Duffel: ${value.trim().toUpperCase()}`
            : "Puedes escribir ciudad, aeropuerto o código IATA; se convertirá al código correcto."}
      </p>
    </div>
  );
}

interface FlightFormState {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infantsWithoutSeat: number;
  cabinClass: CabinClass;
}

const DEFAULT_FLIGHT_FORM: FlightFormState = {
  origin: "MEX",
  destination: "CUN",
  departureDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infantsWithoutSeat: 0,
  cabinClass: "economy",
};

interface HotelFormState {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  currency: string;
}

const DEFAULT_HOTEL_FORM: HotelFormState = {
  destination: "",
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  rooms: 1,
  currency: "MXN",
};

const MAX_TRIP_PEOPLE = 50;
const MAX_HOTEL_ROOMS = 50;
const TRIP_END_GRACE_DAYS = 3;

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDaysIso(value: string, days: number) {
  const date = parseIsoDate(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateWindow(currentGroup?: Group | null) {
  const tripStart = currentGroup?.fecha_inicio || todayIsoDate();
  const tripEnd = currentGroup?.fecha_fin || addDaysIso(tripStart, 60);
  return {
    startMin: tripStart,
    startMax: tripEnd,
  };
}

function getEndDateWindow(startDate: string, currentGroup?: Group | null) {
  const baseStart = startDate || currentGroup?.fecha_inicio || todayIsoDate();
  const min = addDaysIso(baseStart, 1);
  const max = currentGroup?.fecha_fin
    ? addDaysIso(currentGroup.fecha_fin, TRIP_END_GRACE_DAYS)
    : addDaysIso(baseStart, TRIP_END_GRACE_DAYS);
  return { min, max };
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function IconSearch() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlane() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 11l18-8-8 18-2-8-8-2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHotel() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 21V5a2 2 0 012-2h9a2 2 0 012 2v16"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 21v-6h8v6M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="#FFF7ED" />
      <path
        d="M12 7v6"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SkeletonResult() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex animate-pulse items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-3 w-28 rounded bg-gray-200" />
        </div>
        <div className="h-16 w-32 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

function formatTime(value: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDuration(value: string | null) {
  if (!value) return "Duración no disponible";

  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return value;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const parts = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);

  return parts.length ? parts.join(" ") : value;
}

function formatPrice(price: number | null, currency: string | null) {
  if (price === null || Number.isNaN(price)) return "Precio no disponible";

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency ?? "USD",
  }).format(price);
}

function buildStopsLabel(stops: number) {
  if (stops === 0) return "Directo";
  if (stops === 1) return "1 escala";
  return `${stops} escalas`;
}

function parseNumericInput(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

const PREFERRED_AIRLINE_NAMES = [
  "aeromexico",
  "aeroméxico",
  "volaris",
  "viva aerobus",
  "vivaaerobus",
  "magnicharters",
];

const LOW_PRIORITY_DUFFEL_TEST_AIRLINES = [
  "duffel airways",
  "british airways",
  "iberia",
  "test",
];

const FLIGHT_IMAGE_BY_AIRLINE: Record<string, string> = {
  aeromexico:
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop",
  aeroméxico:
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop",
  volaris:
    "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=900&h=420&fit=crop",
  "viva aerobus":
    "https://images.unsplash.com/photo-1490430657723-4d607c1503fc?w=900&h=420&fit=crop",
  vivaaerobus:
    "https://images.unsplash.com/photo-1490430657723-4d607c1503fc?w=900&h=420&fit=crop",
};

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function getFlightImageUrl(flight: FlightOffer) {
  const airline = normalizeText(flight.airline);
  return (
    FLIGHT_IMAGE_BY_AIRLINE[airline] ??
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop"
  );
}

function getFlightSortTier(flight: FlightOffer) {
  const airline = normalizeText(flight.airline);

  if (flight.liveMode) return 0;
  if (PREFERRED_AIRLINE_NAMES.some((name) => airline.includes(name))) return 1;
  if (LOW_PRIORITY_DUFFEL_TEST_AIRLINES.some((name) => airline.includes(name)))
    return 3;

  return 2;
}

function sortFlightOffers(flights: FlightOffer[]) {
  return [...flights].sort((a, b) => {
    const tierDiff = getFlightSortTier(a) - getFlightSortTier(b);
    if (tierDiff !== 0) return tierDiff;

    const priceA = a.price ?? Number.POSITIVE_INFINITY;
    const priceB = b.price ?? Number.POSITIVE_INFINITY;
    return priceA - priceB;
  });
}

function getPrimaryRoute(flight: FlightOffer) {
  return (
    flight.outboundSlice ?? {
      origin: flight.origin,
      originName: flight.originName,
      destination: flight.destination,
      destinationName: flight.destinationName,
      departureAt: flight.departureAt,
      arrivalAt: flight.arrivalAt,
      duration: flight.duration,
      stops: flight.stops,
      segments: [],
    }
  );
}

function getReturnRoute(flight: FlightOffer) {
  return flight.returnSlice ?? null;
}

const FlightHotelSearchPage = () => {
  const { accessToken, localUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { group?: Group } | null;
  const [activeTab, setActiveTab] = useState<SearchTab>("flights");
  const [viewState, setViewState] = useState<ViewState>("initial");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [flightForm, setFlightForm] =
    useState<FlightFormState>(DEFAULT_FLIGHT_FORM);
  const [lastFlightSearch, setLastFlightSearch] =
    useState<FlightFormState | null>(null);
  const [hotelForm, setHotelForm] =
    useState<HotelFormState>(DEFAULT_HOTEL_FORM);
  const [lastHotelSearch, setLastHotelSearch] = useState<HotelFormState | null>(
    null,
  );
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const currentGroup = useMemo(
    () => state?.group ?? getCurrentGroup(),
    [state?.group],
  );
  const passengerTotal =
    flightForm.adults + flightForm.children + flightForm.infantsWithoutSeat;
  const [airportOptions, setAirportOptions] = useState<
    Record<"origin" | "destination", FlightAirportOption[]>
  >({
    origin: [],
    destination: [],
  });
  const [airportLoading, setAirportLoading] = useState<
    Record<"origin" | "destination", boolean>
  >({
    origin: false,
    destination: false,
  });

  const startDateWindow = useMemo(
    () => getDateWindow(currentGroup),
    [currentGroup],
  );
  const flightReturnWindow = useMemo(
    () => getEndDateWindow(flightForm.departureDate, currentGroup),
    [currentGroup, flightForm.departureDate],
  );
  const hotelCheckoutWindow = useMemo(
    () => getEndDateWindow(hotelForm.checkIn, currentGroup),
    [currentGroup, hotelForm.checkIn],
  );

  const flightValidationMessage = useMemo(() => {
    if (!isIataCode(flightForm.origin) || !isIataCode(flightForm.destination))
      return "Origen y destino deben resolverse a códigos IATA de 3 letras.";
    if (
      sanitizeAirportCode(flightForm.origin) ===
      sanitizeAirportCode(flightForm.destination)
    )
      return "El origen y el destino no pueden ser iguales.";
    if (!flightForm.departureDate) return "Selecciona una fecha de salida.";
    if (
      flightForm.departureDate < startDateWindow.startMin ||
      flightForm.departureDate > startDateWindow.startMax
    )
      return `La fecha de salida debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`;
    if (!flightForm.returnDate) return "Selecciona una fecha de regreso.";
    if (
      flightForm.returnDate < flightReturnWindow.min ||
      flightForm.returnDate > flightReturnWindow.max
    )
      return `La fecha de regreso debe estar entre ${flightReturnWindow.min} y ${flightReturnWindow.max}.`;
    if (flightForm.adults < 1) return "Debe viajar al menos un adulto.";
    if (flightForm.children < 0 || flightForm.infantsWithoutSeat < 0)
      return "Los pasajeros no pueden ser negativos.";
    if (flightForm.infantsWithoutSeat > flightForm.adults)
      return "No puede haber más infantes sin asiento que adultos.";
    if (
      flightForm.adults + flightForm.children + flightForm.infantsWithoutSeat >
      MAX_TRIP_PEOPLE
    )
      return `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} pasajeros en total.`;
    return null;
  }, [
    flightForm,
    flightReturnWindow.max,
    flightReturnWindow.min,
    startDateWindow.startMax,
    startDateWindow.startMin,
  ]);

  const hotelValidationMessage = useMemo(() => {
    const destination =
      hotelForm.destination.trim() ||
      currentGroup?.destino_formatted_address ||
      currentGroup?.destino ||
      "";
    if (
      !destination &&
      !currentGroup?.destino_latitud &&
      !currentGroup?.destino_longitud
    )
      return "Captura un destino o selecciona un viaje con destino configurado.";
    if (!hotelForm.checkIn) return "Selecciona una fecha de check-in.";
    if (
      hotelForm.checkIn < startDateWindow.startMin ||
      hotelForm.checkIn > startDateWindow.startMax
    )
      return `El check-in debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`;
    if (!hotelForm.checkOut) return "Selecciona una fecha de check-out.";
    if (
      hotelForm.checkOut < hotelCheckoutWindow.min ||
      hotelForm.checkOut > hotelCheckoutWindow.max
    )
      return `El check-out debe estar entre ${hotelCheckoutWindow.min} y ${hotelCheckoutWindow.max}.`;
    if (hotelForm.adults < 1) return "Debe hospedarse al menos un adulto.";
    if (hotelForm.children < 0) return "Los niños no pueden ser negativos.";
    if (hotelForm.adults + hotelForm.children > MAX_TRIP_PEOPLE)
      return `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} huéspedes en total.`;
    if (hotelForm.rooms < 1) return "Debe haber al menos una habitación.";
    if (hotelForm.rooms > hotelForm.adults)
      return "El número de habitaciones no puede ser mayor que el número de adultos.";
    return null;
  }, [
    currentGroup,
    hotelCheckoutWindow.max,
    hotelCheckoutWindow.min,
    hotelForm,
    startDateWindow.startMax,
    startDateWindow.startMin,
  ]);

  const isSearchDisabled =
    viewState === "loading" ||
    (activeTab === "flights"
      ? Boolean(flightValidationMessage)
      : Boolean(hotelValidationMessage));

  useEffect(() => {
    if (!currentGroup) return;

    setFlightForm((prev) => {
      const departureDate = currentGroup.fecha_inicio ?? prev.departureDate;
      const { min, max } = getEndDateWindow(departureDate, currentGroup);
      const defaultReturnDate = currentGroup.fecha_fin ?? prev.returnDate;
      const returnDate =
        defaultReturnDate &&
        defaultReturnDate >= min &&
        defaultReturnDate <= max
          ? defaultReturnDate
          : min;
      return {
        ...prev,
        departureDate,
        returnDate,
      };
    });

    setHotelForm((prev) => {
      const checkIn = currentGroup.fecha_inicio ?? prev.checkIn;
      const { min, max } = getEndDateWindow(checkIn, currentGroup);
      const defaultCheckOut = currentGroup.fecha_fin ?? prev.checkOut;
      const checkOut =
        defaultCheckOut && defaultCheckOut >= min && defaultCheckOut <= max
          ? defaultCheckOut
          : min;
      return {
        ...prev,
        destination:
          currentGroup.destino_formatted_address ??
          currentGroup.destino ??
          prev.destination,
        checkIn,
        checkOut,
      };
    });
  }, [currentGroup]);

  useEffect(() => {
    if (!currentGroup || !accessToken) return;

    let cancelled = false;
    const destinationSource = [
      currentGroup.destino,
      currentGroup.destino_formatted_address,
    ]
      .filter(Boolean)
      .join(" ");

    if (
      !destinationSource &&
      !currentGroup.destino_latitud &&
      !currentGroup.destino_longitud
    )
      return;

    flightsService
      .resolveAirport(
        {
          q: destinationSource || undefined,
          latitude: currentGroup.destino_latitud ?? undefined,
          longitude: currentGroup.destino_longitud ?? undefined,
          max: 8,
        },
        accessToken,
      )
      .then((response) => {
        if (cancelled || !response.data?.code) return;
        setFlightForm((prev) => ({ ...prev, destination: response.data.code }));
        setAirportOptions((prev) => ({
          ...prev,
          destination: [response.data],
        }));
      })
      .catch(() => {
        // El usuario puede capturar el destino manualmente si no se resuelve por catálogo/Google.
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentGroup]);

  useEffect(() => {
    if (!accessToken || activeTab !== "flights") return;

    const controller = window.setTimeout(() => {
      const query = flightForm.origin.trim();
      if (query.length < 2) {
        setAirportOptions((prev) => ({ ...prev, origin: [] }));
        return;
      }

      setAirportLoading((prev) => ({ ...prev, origin: true }));
      flightsService
        .searchAirports({ q: query, max: 8 }, accessToken)
        .then((response) =>
          setAirportOptions((prev) => ({
            ...prev,
            origin: response.data ?? [],
          })),
        )
        .catch(() => setAirportOptions((prev) => ({ ...prev, origin: [] })))
        .finally(() =>
          setAirportLoading((prev) => ({ ...prev, origin: false })),
        );
    }, 280);

    return () => window.clearTimeout(controller);
  }, [accessToken, activeTab, flightForm.origin]);

  useEffect(() => {
    if (!accessToken || activeTab !== "flights") return;

    const controller = window.setTimeout(() => {
      const query = flightForm.destination.trim();
      if (query.length < 2) {
        setAirportOptions((prev) => ({ ...prev, destination: [] }));
        return;
      }

      setAirportLoading((prev) => ({ ...prev, destination: true }));
      flightsService
        .searchAirports(
          {
            q: query,
            latitude: currentGroup?.destino_latitud ?? undefined,
            longitude: currentGroup?.destino_longitud ?? undefined,
            max: 8,
          },
          accessToken,
        )
        .then((response) =>
          setAirportOptions((prev) => ({
            ...prev,
            destination: response.data ?? [],
          })),
        )
        .catch(() =>
          setAirportOptions((prev) => ({ ...prev, destination: [] })),
        )
        .finally(() =>
          setAirportLoading((prev) => ({ ...prev, destination: false })),
        );
    }, 280);

    return () => window.clearTimeout(controller);
  }, [
    accessToken,
    activeTab,
    currentGroup?.destino_latitud,
    currentGroup?.destino_longitud,
    flightForm.destination,
  ]);

  const handleFlightFieldChange = <K extends keyof FlightFormState>(
    field: K,
    value: FlightFormState[K],
  ) => {
    setFlightForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "adults") {
        next.adults = clampInteger(Number(value), 1, MAX_TRIP_PEOPLE);
      }

      if (field === "children") {
        next.children = clampInteger(Number(value), 0, MAX_TRIP_PEOPLE);
      }

      if (field === "infantsWithoutSeat") {
        next.infantsWithoutSeat = clampInteger(
          Number(value),
          0,
          MAX_TRIP_PEOPLE,
        );
      }

      if (field === "departureDate") {
        const { min, max } = getEndDateWindow(String(value), currentGroup);
        if (!next.returnDate || next.returnDate < min) next.returnDate = min;
        if (next.returnDate > max) next.returnDate = max;
      }

      if (field === "returnDate") {
        const { min, max } = getEndDateWindow(next.departureDate, currentGroup);
        if (String(value) < min) next.returnDate = min;
        if (String(value) > max) next.returnDate = max;
      }

      if (
        next.adults + next.children + next.infantsWithoutSeat >
        MAX_TRIP_PEOPLE
      ) {
        const availableForChildrenAndInfants = Math.max(
          0,
          MAX_TRIP_PEOPLE - next.adults,
        );
        next.children = Math.min(next.children, availableForChildrenAndInfants);
        next.infantsWithoutSeat = Math.min(
          next.infantsWithoutSeat,
          Math.max(0, availableForChildrenAndInfants - next.children),
        );
      }

      next.infantsWithoutSeat = Math.min(next.infantsWithoutSeat, next.adults);

      return next;
    });
  };

  const handleHotelFieldChange = <K extends keyof HotelFormState>(
    field: K,
    value: HotelFormState[K],
  ) => {
    setHotelForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "adults") {
        next.adults = clampInteger(Number(value), 1, MAX_TRIP_PEOPLE);
      }

      if (field === "children") {
        next.children = clampInteger(Number(value), 0, MAX_TRIP_PEOPLE);
      }

      if (field === "rooms") {
        next.rooms = clampInteger(Number(value), 1, MAX_HOTEL_ROOMS);
      }

      if (field === "checkIn") {
        const { min, max } = getEndDateWindow(String(value), currentGroup);
        if (!next.checkOut || next.checkOut < min) next.checkOut = min;
        if (next.checkOut > max) next.checkOut = max;
      }

      if (field === "checkOut") {
        const { min, max } = getEndDateWindow(next.checkIn, currentGroup);
        if (String(value) < min) next.checkOut = min;
        if (String(value) > max) next.checkOut = max;
      }

      if (next.adults + next.children > MAX_TRIP_PEOPLE) {
        next.children = Math.max(0, MAX_TRIP_PEOPLE - next.adults);
      }

      next.rooms = Math.min(next.rooms, next.adults);

      return next;
    });
  };

  const validateHotelForm = () => {
    const destination =
      hotelForm.destination.trim() ||
      currentGroup?.destino_formatted_address ||
      currentGroup?.destino ||
      "";

    if (
      !destination &&
      !currentGroup?.destino_latitud &&
      !currentGroup?.destino_longitud
    ) {
      throw new Error(
        "Captura un destino o selecciona un viaje con destino configurado.",
      );
    }

    if (!hotelForm.checkIn) {
      throw new Error("Selecciona una fecha de check-in.");
    }

    if (!hotelForm.checkOut) {
      throw new Error("Selecciona una fecha de check-out.");
    }

    if (
      hotelForm.checkIn < startDateWindow.startMin ||
      hotelForm.checkIn > startDateWindow.startMax
    ) {
      throw new Error(
        `El check-in debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`,
      );
    }

    if (
      hotelForm.checkOut < hotelCheckoutWindow.min ||
      hotelForm.checkOut > hotelCheckoutWindow.max
    ) {
      throw new Error(
        `El check-out debe estar entre ${hotelCheckoutWindow.min} y ${hotelCheckoutWindow.max}.`,
      );
    }

    const adults = clampInteger(hotelForm.adults, 1, MAX_TRIP_PEOPLE);
    const children = clampInteger(hotelForm.children, 0, MAX_TRIP_PEOPLE);
    const rooms = clampInteger(hotelForm.rooms, 1, MAX_HOTEL_ROOMS);
    const guests = adults + children;

    if (guests > MAX_TRIP_PEOPLE) {
      throw new Error(
        `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} huéspedes en total.`,
      );
    }

    if (rooms > adults) {
      throw new Error(
        "El número de habitaciones no puede ser mayor que el número de adultos, porque cada habitación requiere al menos un adulto.",
      );
    }

    return {
      ...hotelForm,
      destination,
      adults,
      children,
      rooms,
    };
  };

  const resolveFlightAirport = async (field: "origin" | "destination") => {
    const rawValue = flightForm[field].trim();
    const localCode = sanitizeAirportCode(rawValue);

    if (!rawValue) return localCode;
    if (isIataCode(rawValue)) return rawValue.toUpperCase();

    if (!accessToken) return localCode;

    const response = await flightsService.resolveAirport(
      {
        q: rawValue,
        latitude:
          field === "destination"
            ? (currentGroup?.destino_latitud ?? undefined)
            : undefined,
        longitude:
          field === "destination"
            ? (currentGroup?.destino_longitud ?? undefined)
            : undefined,
        max: 8,
      },
      accessToken,
    );

    return response.data.code;
  };

  const normalizeAirportField = async (field: "origin" | "destination") => {
    try {
      const code = await resolveFlightAirport(field);
      if (code) {
        handleFlightFieldChange(field, code);
      }
    } catch {
      const fallback = sanitizeAirportCode(flightForm[field]);
      if (fallback) handleFlightFieldChange(field, fallback);
    }
  };

  const validateFlightForm = async () => {
    const origin = await resolveFlightAirport("origin");
    const destination = await resolveFlightAirport("destination");

    if (origin.length !== 3 || destination.length !== 3) {
      throw new Error(
        "Origen y destino deben resolverse a códigos IATA de 3 letras. Ejemplo: Acapulco → ACA.",
      );
    }

    if (origin === destination) {
      throw new Error("El origen y el destino no pueden ser iguales.");
    }

    if (!flightForm.departureDate) {
      throw new Error("Selecciona una fecha de salida.");
    }

    if (
      flightForm.departureDate < startDateWindow.startMin ||
      flightForm.departureDate > startDateWindow.startMax
    ) {
      throw new Error(
        `La fecha de salida debe estar entre ${startDateWindow.startMin} y ${startDateWindow.startMax}.`,
      );
    }

    if (!flightForm.returnDate) {
      throw new Error("Selecciona una fecha de regreso.");
    }

    if (
      flightForm.returnDate < flightReturnWindow.min ||
      flightForm.returnDate > flightReturnWindow.max
    ) {
      throw new Error(
        `La fecha de regreso debe estar entre ${flightReturnWindow.min} y ${flightReturnWindow.max}.`,
      );
    }

    const adults = clampInteger(flightForm.adults, 1, MAX_TRIP_PEOPLE);
    const children = clampInteger(flightForm.children, 0, MAX_TRIP_PEOPLE);
    const infantsWithoutSeat = clampInteger(
      flightForm.infantsWithoutSeat,
      0,
      MAX_TRIP_PEOPLE,
    );
    const totalPassengers = adults + children + infantsWithoutSeat;

    if (infantsWithoutSeat > adults) {
      throw new Error("No puede haber más infantes sin asiento que adultos.");
    }

    if (totalPassengers > MAX_TRIP_PEOPLE) {
      throw new Error(
        `La búsqueda permite máximo ${MAX_TRIP_PEOPLE} pasajeros en total.`,
      );
    }

    setFlightForm((prev) => ({
      ...prev,
      origin,
      destination,
      adults,
      children,
      infantsWithoutSeat,
    }));

    return {
      ...flightForm,
      origin,
      destination,
      adults,
      children,
      infantsWithoutSeat,
    };
  };

  const handleSearch = async () => {
    setErrorMessage(null);

    if (activeTab === "hotels") {
      try {
        if (!accessToken) {
          throw new Error(
            "Tu sesión no está disponible. Inicia sesión de nuevo.",
          );
        }

        const validatedForm = validateHotelForm();
        setViewState("loading");
        setLastHotelSearch(validatedForm);

        const response = await hotelsService.search(
          {
            destination: validatedForm.destination,
            latitude: currentGroup?.destino_latitud ?? null,
            longitude: currentGroup?.destino_longitud ?? null,
            placeId: currentGroup?.destino_place_id ?? null,
            checkIn: validatedForm.checkIn,
            checkOut: validatedForm.checkOut,
            adults: validatedForm.adults,
            childrenAges: Array.from(
              { length: validatedForm.children },
              () => 8,
            ),
            rooms: validatedForm.rooms,
            currency: validatedForm.currency,
            guestNationality: "MX",
            countryCode: "MX",
            limit: 12,
            radius: 20000,
          },
          accessToken,
        );

        setHotels(
          (response.data ?? []).map((hotel) => ({ ...hotel, proposed: false })),
        );
        setViewState("results");
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No pudimos cargar los hospedajes.",
        );
        setViewState("error");
      }
      return;
    }

    try {
      if (!accessToken) {
        throw new Error(
          "Tu sesión no está disponible. Inicia sesión de nuevo.",
        );
      }

      const validatedForm = await validateFlightForm();
      setViewState("loading");
      setLastFlightSearch(validatedForm);

      const response = await flightsService.search(
        {
          origin: validatedForm.origin,
          destination: validatedForm.destination,
          departureDate: validatedForm.departureDate,
          returnDate: validatedForm.returnDate || undefined,
          adults: validatedForm.adults,
          children: validatedForm.children,
          infantsWithoutSeat: validatedForm.infantsWithoutSeat,
          cabinClass: validatedForm.cabinClass,
          max: 20,
        },
        accessToken,
      );

      setFlights(
        sortFlightOffers(response.data ?? []).map((flight) => ({
          ...flight,
          proposed: false,
        })),
      );
      setViewState("results");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos cargar los vuelos.",
      );
      setViewState("error");
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setViewState("initial");
    setErrorMessage(null);
    setFlights([]);
    setHotels([]);
  };

  const toggleFlight = async (flight: Flight) => {
    if (flight.proposed) {
      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id ? { ...item, proposed: false } : item,
        ),
      );
      return;
    }

    if (!currentGroup?.id || !accessToken) {
      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id ? { ...item, proposed: true } : item,
        ),
      );
      return;
    }

    try {
      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id ? { ...item, saving: true } : item,
        ),
      );

      const outboundRoute = getPrimaryRoute(flight);
      const title =
        `${flight.airline ?? "Vuelo"} ${flight.flightNumber ?? ""} ${outboundRoute.origin ?? ""} → ${outboundRoute.destination ?? ""}`.trim();
      const description = [
        flight.fareBrand ? `Tarifa ${flight.fareBrand}` : null,
        `${flight.passengers.adults} adulto(s)`,
        flight.passengers.children
          ? `${flight.passengers.children} niño(s)`
          : null,
        flight.passengers.infantsWithoutSeat
          ? `${flight.passengers.infantsWithoutSeat} infante(s) sin asiento`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      await proposalsService.saveFlightProposal(
        {
          grupoId: String(currentGroup.id),
          fuente: "duffel",
          titulo: title,
          descripcion: description,
          payload: {
            provider: "duffel",
            offerId: flight.id,
            liveMode: flight.liveMode,
            search: lastFlightSearch,
            passengers: flight.passengers,
            normalizedOffer: flight,
            imageUrl: getFlightImageUrl(flight),
          },
          vuelo: {
            aerolinea: flight.airline ?? "Aerolínea no disponible",
            numeroVuelo: flight.flightNumber,
            origenCodigo: flight.origin ?? "",
            origenNombre: flight.originName,
            destinoCodigo: flight.destination ?? "",
            destinoNombre: flight.destinationName,
            salida: flight.departureAt ?? new Date().toISOString(),
            llegada:
              flight.arrivalAt ??
              flight.departureAt ??
              new Date().toISOString(),
            duracion: flight.duration,
            precio: flight.price ?? 0,
            moneda: flight.currency ?? "USD",
            escalas: flight.stops,
            payload: {
              raw: flight.raw,
              normalizedOffer: flight,
              outboundSlice: flight.outboundSlice,
              returnSlice: flight.returnSlice,
              imageUrl: getFlightImageUrl(flight),
            },
          },
        },
        accessToken,
      );

      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id
            ? { ...item, proposed: true, saving: false }
            : item,
        ),
      );
    } catch (error) {
      setFlights((prev) =>
        prev.map((item) =>
          item.id === flight.id ? { ...item, saving: false } : item,
        ),
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la propuesta de vuelo.",
      );
    }
  };

  const toggleHotel = async (hotel: Hotel) => {
    if (hotel.proposed) {
      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id ? { ...item, proposed: false } : item,
        ),
      );
      return;
    }

    if (!currentGroup?.id || !accessToken) {
      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id ? { ...item, proposed: true } : item,
        ),
      );
      return;
    }

    try {
      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id ? { ...item, saving: true } : item,
        ),
      );

      const prebookResponse = hotel.offerId
        ? await hotelsService
            .prebook(hotel.offerId, accessToken)
            .catch(() => null)
        : null;

      const title = `${hotel.name} · ${hotel.roomName ?? "Habitación disponible"}`;
      const description = [
        hotel.address,
        `${hotel.nights} noche(s)`,
        `${lastHotelSearch?.adults ?? hotelForm.adults} adulto(s)`,
        (lastHotelSearch?.children ?? hotelForm.children) > 0
          ? `${lastHotelSearch?.children ?? hotelForm.children} niño(s)`
          : null,
        `${lastHotelSearch?.rooms ?? hotelForm.rooms} habitación(es)`,
        hotel.boardName,
      ]
        .filter(Boolean)
        .join(" · ");

      await proposalsService.saveHotelProposal(
        {
          grupoId: String(currentGroup.id),
          fuente: "liteapi",
          titulo: title,
          descripcion: description,
          payload: {
            provider: "liteapi",
            search: lastHotelSearch,
            normalizedOffer: hotel,
            offerId: hotel.offerId,
            prebook: prebookResponse?.data ?? null,
            googlePlaceId: hotel.googlePlaceId,
            photoUrl: hotel.photoUrl,
            reservaSimulada: {
              status: "PENDING_GROUP_APPROVAL",
              paymentStatus: "not_started",
            },
          },
          hospedaje: {
            nombre: hotel.name,
            proveedor: hotel.supplier ?? "liteapi",
            referenciaExterna: hotel.offerId ?? hotel.hotelId,
            direccion: hotel.address,
            latitud: hotel.latitude,
            longitud: hotel.longitude,
            checkIn: hotel.checkIn,
            checkOut: hotel.checkOut,
            precioTotal: hotel.price,
            moneda: hotel.currency ?? "MXN",
            calificacion: hotel.rating,
            liteapiHotelId: hotel.hotelId,
            liteapiOfferId: hotel.offerId,
            liteapiPrebookId: prebookResponse?.data?.prebookId
              ? String(prebookResponse.data.prebookId)
              : null,
            googlePlaceId: hotel.googlePlaceId,
            fotoUrl: hotel.photoUrl,
            reservaEstado: "pendiente",
            reservaSimuladaPayload: {
              status: "PENDING_GROUP_APPROVAL",
              paymentStatus: "not_started",
              source: "liteapi_sandbox_search",
            },
            payload: {
              raw: hotel.raw,
              normalizedOffer: hotel,
              prebook: prebookResponse?.data ?? null,
              photoUrl: hotel.photoUrl,
              googlePlaceId: hotel.googlePlaceId,
              rooms: hotel.rooms,
            },
          },
        },
        accessToken,
      );

      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id
            ? { ...item, proposed: true, saving: false }
            : item,
        ),
      );
    } catch (error) {
      setHotels((prev) =>
        prev.map((item) =>
          item.id === hotel.id ? { ...item, saving: false } : item,
        ),
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la propuesta de hospedaje.",
      );
    }
  };

  const searchSummary = lastFlightSearch
    ? `${lastFlightSearch.origin} → ${lastFlightSearch.destination} · ${lastFlightSearch.departureDate}${lastFlightSearch.returnDate ? ` a ${lastFlightSearch.returnDate}` : ""} · ${lastFlightSearch.adults} adulto(s), ${lastFlightSearch.children} niño(s), ${lastFlightSearch.infantsWithoutSeat} infante(s)`
    : "";

  return (
    <SearchIntegratedShell
      group={currentGroup}
      user={{
        name: localUser?.nombre ?? localUser?.email ?? "Usuario",
        role: currentGroup?.myRole === "admin" ? "Organizador" : "Viajero",
        initials: (localUser?.nombre ?? localUser?.email ?? "U")
          .slice(0, 1)
          .toUpperCase(),
        color: "#7A4FD6",
      }}
    >
      <div className="flex-1 overflow-y-auto bg-[#F4F6F8]">
        <section className="relative overflow-hidden bg-[#1E0A4E] px-8 py-8 text-white">
          <button
            type="button"
            onClick={() =>
              navigate(
                currentGroup?.id
                  ? `/dashboard?groupId=${encodeURIComponent(String(currentGroup.id))}`
                  : "/dashboard",
                {
                  state: currentGroup
                    ? {
                        groupId: currentGroup.id,
                        group: currentGroup,
                        activeTab: "buscar",
                      }
                    : { activeTab: "buscar" },
                },
              )
            }
            className="relative z-10 mb-5 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <span aria-hidden="true">←</span>
            Regresar a Buscar
          </button>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E0A4E] via-[#2D1266]/90 to-[#7A4FD6]/50" />
          <div className="relative mx-auto max-w-6xl">
            <h1 className="font-heading text-3xl font-bold">
              Planea tu viaje grupal
            </h1>
            <p className="mt-1 font-body text-sm text-white/80">
              Busca, compara y propone opciones para tu itinerario
            </p>

            <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="inline-flex overflow-hidden rounded-xl bg-white/15 p-1 backdrop-blur-sm">
                <button
                  onClick={() => handleTabChange("flights")}
                  className={`px-8 py-3 text-sm font-semibold ${
                    activeTab === "flights"
                      ? "rounded-lg bg-white text-[#1E0A4E]"
                      : "text-white/80"
                  }`}
                >
                  Vuelos
                </button>
                <button
                  onClick={() => handleTabChange("hotels")}
                  className={`px-8 py-3 text-sm font-semibold ${
                    activeTab === "hotels"
                      ? "rounded-lg bg-white text-[#1E0A4E]"
                      : "text-white/80"
                  }`}
                >
                  Hospedaje
                </button>
              </div>

              <div className="flex gap-3">
                <div className="rounded-xl border border-white/20 bg-white/15 px-5 py-3 backdrop-blur-sm">
                  <p className="text-xs text-white/60">Viaje con</p>
                  <p className="font-semibold">
                    {activeTab === "flights"
                      ? passengerTotal
                      : hotelForm.adults + hotelForm.children}{" "}
                    persona(s)
                  </p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/15 px-5 py-3 backdrop-blur-sm">
                  <p className="text-xs text-white/60">Proveedor</p>
                  <p className="font-semibold">
                    {activeTab === "flights"
                      ? "Duffel API"
                      : "LiteAPI + Google"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-6 py-8 pb-24">
          <section className="mx-auto max-w-4xl rounded-2xl border border-gray-100 bg-white p-7 shadow-lg">
            <h2 className="font-heading text-2xl font-bold text-[#1E0A4E]">
              {activeTab === "flights"
                ? "Buscar vuelos para tu grupo"
                : "Busca hospedaje para tu grupo"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === "flights"
                ? "Encuentra opciones con Duffel y compártelas como propuesta con tu grupo"
                : "Encuentra hoteles y alojamientos para compartir con tu grupo"}
            </p>

            {activeTab === "flights" ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  ¿Desde dónde viajas?
                  <AirportSearchInput
                    id="origin-airport-options"
                    value={flightForm.origin}
                    options={airportOptions.origin}
                    loading={airportLoading.origin}
                    onChange={(value) =>
                      handleFlightFieldChange("origin", value)
                    }
                    onSelect={(airport) =>
                      handleFlightFieldChange("origin", airport.code)
                    }
                    onBlur={() => void normalizeAirportField("origin")}
                    placeholder="Ej: Ciudad de México, AICM o MEX"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  ¿A dónde quieres ir?
                  <AirportSearchInput
                    id="destination-airport-options"
                    value={flightForm.destination}
                    options={airportOptions.destination}
                    loading={airportLoading.destination}
                    onChange={(value) =>
                      handleFlightFieldChange("destination", value)
                    }
                    onSelect={(airport) =>
                      handleFlightFieldChange("destination", airport.code)
                    }
                    onBlur={() => void normalizeAirportField("destination")}
                    placeholder="Ej: Acapulco, Cancún o ACA"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Fecha de salida
                  <input
                    type="date"
                    value={flightForm.departureDate}
                    min={startDateWindow.startMin}
                    max={startDateWindow.startMax}
                    onChange={(event) =>
                      handleFlightFieldChange(
                        "departureDate",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                  <p className="mt-1 text-[11px] font-normal text-gray-400">
                    Dentro del viaje: {startDateWindow.startMin} a{" "}
                    {startDateWindow.startMax}
                  </p>
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Fecha de regreso
                  <input
                    type="date"
                    value={flightForm.returnDate}
                    min={flightReturnWindow.min}
                    max={flightReturnWindow.max}
                    onChange={(event) =>
                      handleFlightFieldChange("returnDate", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                  <p className="mt-1 text-[11px] font-normal text-gray-400">
Debe ser posterior a la salida y puede quedar hasta 3 día(s) después del fin del viaje: {flightReturnWindow.min} a {flightReturnWindow.max}.
                  </p>
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Adultos
                  <input
                    type="number"
                    min="1"
                    max={MAX_TRIP_PEOPLE}
                    value={flightForm.adults}
                    onChange={(event) =>
                      handleFlightFieldChange(
                        "adults",
                        Math.max(1, parseNumericInput(event.target.value, 1)),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Niños
                  <input
                    type="number"
                    min="0"
                    max={
                      MAX_TRIP_PEOPLE -
                      flightForm.adults -
                      flightForm.infantsWithoutSeat
                    }
                    value={flightForm.children}
                    onChange={(event) =>
                      handleFlightFieldChange(
                        "children",
                        parseNumericInput(event.target.value, 0),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Infantes sin asiento
                  <input
                    type="number"
                    min="0"
                    max={Math.min(
                      flightForm.adults,
                      MAX_TRIP_PEOPLE - flightForm.adults - flightForm.children,
                    )}
                    value={flightForm.infantsWithoutSeat}
                    onChange={(event) =>
                      handleFlightFieldChange(
                        "infantsWithoutSeat",
                        parseNumericInput(event.target.value, 0),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Cabina
                  <select
                    value={flightForm.cabinClass}
                    onChange={(event) =>
                      handleFlightFieldChange(
                        "cabinClass",
                        event.target.value as CabinClass,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  >
                    <option value="economy">Económica</option>
                    <option value="premium_economy">Premium economy</option>
                    <option value="business">Business</option>
                    <option value="first">First</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-[#1E0A4E] md:col-span-2">
                  ¿A dónde viajan?
                  <input
                    value={hotelForm.destination}
                    onChange={(event) =>
                      handleHotelFieldChange("destination", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                    placeholder="Ej: Cancún, México"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Check-in
                  <input
                    type="date"
                    value={hotelForm.checkIn}
                    min={startDateWindow.startMin}
                    max={startDateWindow.startMax}
                    onChange={(event) =>
                      handleHotelFieldChange("checkIn", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                  <p className="mt-1 text-[11px] font-normal text-gray-400">
                    Dentro del viaje: {startDateWindow.startMin} a{" "}
                    {startDateWindow.startMax}
                  </p>
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Check-out
                  <input
                    type="date"
                    value={hotelForm.checkOut}
                    min={hotelCheckoutWindow.min}
                    max={hotelCheckoutWindow.max}
                    onChange={(event) =>
                      handleHotelFieldChange("checkOut", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  />
                  <p className="mt-1 text-[11px] font-normal text-gray-400">
Debe ser posterior al check-in y puede quedar hasta 3 día(s) después del fin del viaje: {hotelCheckoutWindow.min} a {hotelCheckoutWindow.max}.
                  </p>
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Adultos
                  <input
                    type="number"
                    min="1"
                    max={MAX_TRIP_PEOPLE}
                    value={hotelForm.adults}
                    onChange={(event) =>
                      handleHotelFieldChange(
                        "adults",
                        parseNumericInput(event.target.value, 1),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                    placeholder="Adultos"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Niños
                  <input
                    type="number"
                    min="0"
                    max={MAX_TRIP_PEOPLE - hotelForm.adults}
                    value={hotelForm.children}
                    onChange={(event) =>
                      handleHotelFieldChange(
                        "children",
                        parseNumericInput(event.target.value, 0),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                    placeholder="Niños"
                  />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Habitaciones
                  <input
                    type="number"
                    min="1"
                    max={Math.min(MAX_HOTEL_ROOMS, hotelForm.adults)}
                    value={hotelForm.rooms}
                    onChange={(event) =>
                      handleHotelFieldChange(
                        "rooms",
                        parseNumericInput(event.target.value, 1),
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                    placeholder="2 habitaciones"
                  />
                  <p className="mt-1 text-[11px] font-normal text-gray-400">
                    Máximo {Math.min(MAX_HOTEL_ROOMS, hotelForm.adults)}{" "}
                    habitación(es); los niños sí se permiten y se distribuyen
                    con adultos.
                  </p>
                </label>
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={isSearchDisabled}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#1557B0] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {viewState === "loading" ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {activeTab === "flights"
                    ? "Buscando vuelos..."
                    : "Buscando hospedajes..."}
                </>
              ) : activeTab === "flights" ? (
                "Buscar vuelos para el grupo"
              ) : (
                "Buscar hospedajes para el grupo"
              )}
            </button>

            {(activeTab === "flights"
              ? flightValidationMessage
              : hotelValidationMessage) && (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {activeTab === "flights"
                  ? flightValidationMessage
                  : hotelValidationMessage}
              </p>
            )}

            {errorMessage && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </p>
            )}
          </section>

          {viewState === "loading" && (
            <div className="mx-auto mt-8 max-w-4xl space-y-4">
              <p className="text-center text-sm text-gray-500">
                Consultando disponibilidad en tiempo real...
              </p>
              <SkeletonResult />
              <SkeletonResult />
              <SkeletonResult />
            </div>
          )}

          {viewState === "initial" && (
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
              <h3 className="font-semibold text-[#1E0A4E]">
                Sin resultados todavía
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Realiza una búsqueda para ver opciones disponibles.
              </p>
            </div>
          )}

          {viewState === "error" && (
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex justify-center">
                <IconAlert />
              </div>
              <h3 className="font-semibold text-[#1E0A4E]">
                No pudimos cargar los resultados
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {errorMessage ??
                  "Parece que hubo un problema de conexión. Intenta nuevamente."}
              </p>
              <button
                onClick={handleSearch}
                className="mt-5 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
              >
                Reintentar búsqueda
              </button>
            </div>
          )}

          {viewState === "results" && activeTab === "flights" && (
            <section className="mx-auto mt-8 max-w-5xl">
              <div className="mb-4 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                  <span>{searchSummary}</span>
                  <button
                    onClick={() => setViewState("initial")}
                    className="font-semibold text-[#1E6FD9]"
                  >
                    Editar búsqueda
                  </button>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                {flights.length} vuelos disponibles
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Selecciona la mejor opción para tu grupo
              </p>

              <div className="mb-5 flex gap-2">
                <button className="rounded-lg bg-[#1E6FD9] px-4 py-2 text-xs font-semibold text-white">
                  Todos
                </button>
                <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
                  Sin escalas
                </button>
                <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
                  Dentro del presupuesto
                </button>
              </div>

              <div className="space-y-4">
                {flights.map((flight) => {
                  const outbound = getPrimaryRoute(flight);
                  const inbound = getReturnRoute(flight);

                  return (
                    <article
                      key={flight.id}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                      <div className="grid gap-5 md:grid-cols-[1fr_2fr_190px] md:items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1E6FD9]">
                            <IconPlane />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#1E0A4E]">
                              {flight.airline ?? "Aerolínea no disponible"}
                              {!flight.liveMode && (
                                <span className="ml-2 rounded-full bg-[#E8F0FF] px-2 py-0.5 text-[10px] text-[#1E6FD9]">
                                  Test
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {flight.flightNumber ?? "Vuelo sin número"} ·{" "}
                              {flight.fareBrand ??
                                flight.cabinClass ??
                                "Tarifa no disponible"}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400">
                              Oferta Duffel: {flight.id.slice(0, 12)}…
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              Ida
                            </p>
                            <div className="grid grid-cols-[80px_1fr_80px] items-center gap-3">
                              <div>
                                <p className="text-xl font-bold text-[#1E0A4E]">
                                  {formatTime(outbound.departureAt)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {outbound.origin ?? "---"}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">
                                  {formatDuration(outbound.duration)}
                                </p>
                                <div className="my-2 h-0.5 rounded-full bg-[#1E6FD9]" />
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                                    outbound.stops === 0
                                      ? "bg-[#DCFCE7] text-[#35C56A]"
                                      : "bg-[#FEF3C7] text-[#F59E0B]"
                                  }`}
                                >
                                  {buildStopsLabel(outbound.stops)}
                                </span>
                              </div>
                              <div>
                                <p className="text-xl font-bold text-[#1E0A4E]">
                                  {formatTime(outbound.arrivalAt)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {outbound.destination ?? "---"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {inbound && (
                            <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                Regreso
                              </p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                                <span className="font-semibold text-[#1E0A4E]">
                                  {inbound.origin ?? "---"} →{" "}
                                  {inbound.destination ?? "---"}
                                </span>
                                <span>
                                  {formatTime(inbound.departureAt)} →{" "}
                                  {formatTime(inbound.arrivalAt)}
                                </span>
                                <span>{formatDuration(inbound.duration)}</span>
                                <span>{buildStopsLabel(inbound.stops)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-gray-100 p-4 text-center">
                          <p className="text-[10px] uppercase text-gray-400">
                            Total
                          </p>
                          <p className="text-2xl font-bold text-[#1E0A4E]">
                            {formatPrice(flight.price, flight.currency)}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {formatDate(outbound.departureAt)} ·{" "}
                            {flight.passengers.total} pasajero(s)
                          </p>
                          <button
                            onClick={() => toggleFlight(flight)}
                            disabled={flight.saving || flight.proposed}
                            className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-80 ${
                              flight.proposed
                                ? "bg-[#35C56A]"
                                : "bg-[#1E6FD9] hover:bg-[#1557B0]"
                            }`}
                          >
                            {flight.saving
                              ? "Guardando..."
                              : flight.proposed
                                ? "Propuesto"
                                : "Proponer vuelo"}
                          </button>
                          <p className="mt-2 text-[10px] text-gray-400">
                            {currentGroup?.id
                              ? "Se guarda en Comparar/Propuestas"
                              : "Sin grupo actual: solo selección local"}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {viewState === "results" && activeTab === "hotels" && (
            <section className="mx-auto mt-8 max-w-5xl">
              <div className="mb-4 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                  <span>
                    {lastHotelSearch
                      ? `${lastHotelSearch.destination} · ${lastHotelSearch.checkIn} a ${lastHotelSearch.checkOut} · ${lastHotelSearch.adults + lastHotelSearch.children} huésped(es) · ${lastHotelSearch.rooms} habitación(es)`
                      : "Búsqueda de hospedaje"}
                  </span>
                  <button
                    onClick={() => setViewState("initial")}
                    className="font-semibold text-[#1E6FD9]"
                  >
                    Editar búsqueda
                  </button>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                {hotels.length} hospedajes disponibles
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Selecciona las mejores opciones para tu grupo. Cada tarjeta
                agrupa un hotel; en detalles puedes comparar habitaciones y
                tarifas.
              </p>

              <div className="space-y-4">
                {hotels.map((hotel) => (
                  <article
                    key={hotel.id}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                  >
                    <div className="grid gap-5 md:grid-cols-[1fr_160px] md:items-center">
                      <div className="flex gap-4">
                        {hotel.photoUrl ? (
                          <img
                            src={hotel.photoUrl}
                            alt={hotel.name}
                            className="h-24 w-28 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1E6FD9]">
                            <IconHotel />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-[#1E0A4E]">
                            {hotel.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {hotel.address ?? "Dirección no disponible"}
                          </p>
                          <p className="mt-2 text-sm text-[#F59E0B]">
                            ★★★★★{" "}
                            <span className="text-gray-500">
                              {hotel.rating
                                ? hotel.rating.toFixed(1)
                                : "Sin calificación"}
                            </span>
                            {hotel.googleUserRatingCount ? (
                              <span className="text-gray-400">
                                {" "}
                                · {hotel.googleUserRatingCount} reseñas
                              </span>
                            ) : null}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#EEF4FF] px-2 py-1 text-xs text-[#1E6FD9]">
                              {hotel.roomName ?? "Habitación disponible"}
                            </span>
                            {hotel.boardName ? (
                              <span className="rounded-full bg-[#EEF4FF] px-2 py-1 text-xs text-[#1E6FD9]">
                                {hotel.boardName}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-[#EEF4FF] px-2 py-1 text-xs text-[#1E6FD9]">
                              {hotel.nights} noche(s)
                            </span>
                            {hotel.refundableTag ? (
                              <span className="rounded-full bg-[#FEF3C7] px-2 py-1 text-xs text-[#F59E0B]">
                                {hotel.refundableTag}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-[11px] text-gray-400">
                            Hotel ID: {hotel.hotelId} · Offer:{" "}
                            {hotel.offerId
                              ? `${hotel.offerId.slice(0, 12)}…`
                              : "no disponible"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4 text-center">
                        <p className="text-[10px] uppercase text-gray-400">
                          Total
                        </p>
                        <p className="text-2xl font-bold text-[#1E0A4E]">
                          {formatPrice(hotel.price, hotel.currency)}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {hotel.checkIn} → {hotel.checkOut}
                        </p>
                        <button
                          onClick={() => toggleHotel(hotel)}
                          disabled={hotel.saving || hotel.proposed}
                          className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-80 ${
                            hotel.proposed
                              ? "bg-[#35C56A]"
                              : "bg-[#1E6FD9] hover:bg-[#1557B0]"
                          }`}
                        >
                          {hotel.saving
                            ? "Guardando..."
                            : hotel.proposed
                              ? "Propuesto"
                              : "Proponer hospedaje"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedHotel(hotel)}
                          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#1E6FD9] hover:text-[#1E6FD9]"
                        >
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {viewState === "results" && (
            <div className="mx-auto mt-8 max-w-5xl rounded-2xl bg-[#1E0A4E] p-8 text-center text-white shadow-lg">
              <h3 className="font-semibold">
                ¿No encontraste lo que buscabas?
              </h3>
              <p className="mt-1 text-sm text-white/70">
                Ajusta tus filtros o modifica tu búsqueda para ver más opciones
              </p>
              <button
                onClick={() => setViewState("initial")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1E0A4E]"
              >
                <IconSearch />
                Modificar búsqueda
              </button>
            </div>
          )}

          {selectedHotel && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
              onClick={() => setSelectedHotel(null)}
            >
              <div
                className="max-h-[86vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                      {selectedHotel.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedHotel.address ?? "Dirección no disponible"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHotel(null)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Calificación
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#1E0A4E]">
                      {selectedHotel.rating
                        ? selectedHotel.rating.toFixed(1)
                        : "N/D"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedHotel.googleUserRatingCount
                        ? `${selectedHotel.googleUserRatingCount} reseñas Google`
                        : "Sin reseñas Google"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Tarifas detectadas
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#1E0A4E]">
                      {selectedHotel.rateCount ?? selectedHotel.rooms.length}
                    </p>
                    <p className="text-xs text-gray-500">
                      Mismo hotel, diferentes habitaciones/precios
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Rango
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#1E0A4E]">
                      {formatPrice(
                        selectedHotel.priceMin ?? selectedHotel.price,
                        selectedHotel.currency,
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      a{" "}
                      {formatPrice(
                        selectedHotel.priceMax ?? selectedHotel.price,
                        selectedHotel.currency,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <h4 className="font-semibold text-[#1E0A4E]">
                    Habitaciones y tarifas
                  </h4>
                  {selectedHotel.rooms.length > 0 ? (
                    selectedHotel.rooms.map((room, index) => (
                      <div
                        key={`${room.offerId ?? index}-${room.rateId ?? index}`}
                        className="rounded-xl border border-gray-100 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#1E0A4E]">
                              {room.name ?? "Habitación disponible"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {room.boardName ?? "Plan no especificado"} ·{" "}
                              {room.refundableTag ?? "Política no especificada"}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400">
                              Adultos: {room.adultCount ?? "-"} · Niños:{" "}
                              {room.childCount ?? "-"} · Ocupación máx.:{" "}
                              {room.maxOccupancy ?? "-"}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-[#1E0A4E]">
                            {formatPrice(
                              room.price,
                              room.currency ?? selectedHotel.currency,
                            )}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-gray-500">
                      LiteAPI no regresó el desglose de habitaciones para esta
                      opción.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </SearchIntegratedShell>
  );
};

export default FlightHotelSearchPage;
