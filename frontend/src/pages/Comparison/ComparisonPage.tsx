import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { useGroupRealtimeRefresh } from "../../hooks/useGroupRealtimeRefresh";
import { getCurrentGroup } from "../../services/groups";
import {
  proposalsService,
  type Proposal,
  type ProposalComment,
  type ProposalDetailFlight,
  type ProposalDetailHotel,
  type VoteResult,
} from "../../services/proposals";
import { budgetService, type BudgetSummary } from "../../services/budget";

export interface ComparisonPageProps {
  onBack: () => void;
}

type ProposalFilter = "todas" | "vuelo" | "hospedaje";

const MAX_COMPARISON_COLUMNS = 4;

type ComparisonCacheEntry = {
  proposals: Proposal[];
  voteResults: VoteResult[];
  budgetSummary: BudgetSummary | null;
  selected: string | null;
};

const comparisonCache = new Map<string, ComparisonCacheEntry>();

const FALLBACK_FLIGHT_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=420&fit=crop",
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=900&h=420&fit=crop",
  "https://images.unsplash.com/photo-1490430657723-4d607c1503fc?w=900&h=420&fit=crop",
  "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?w=900&h=420&fit=crop",
];

const FALLBACK_HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&h=420&fit=crop",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=900&h=420&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&h=420&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&h=420&fit=crop",
];

function IconArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="15 18 9 12 15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWarning({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="12.01"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="20 6 9 17 4 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="12"
        y1="5"
        x2="12"
        y2="19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points="9 18 15 12 9 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlane({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#1E6FD9]"
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

function IconHotel({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#7A4FD6]"
    >
      <path
        d="M2 9V5a1 1 0 011-1h18a1 1 0 011 1v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="2"
        y="9"
        width="20"
        height="9"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="2"
        y1="18"
        x2="2"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="22"
        y1="18"
        x2="22"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMessage({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconEdit({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InlineSpinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent align-[-2px]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

function ActionIconButton({
  children,
  label,
  onClick,
  disabled,
  loading,
  variant = "neutral",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "neutral" | "danger" | "primary" | "success";
}) {
  const variantClasses = {
    neutral: "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]",
    danger: "border-[#FCA5A5] bg-white text-[#EF4444] hover:bg-[#FEF2F2]",
    primary: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E6FD9] hover:bg-[#DBEAFE]",
    success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] hover:bg-[#DCFCE7]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variantClasses[variant],
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      {loading ? <InlineSpinner size={14} /> : children}
    </button>
  );
}

function CategoryIcon({ type }: { type: Proposal["tipo"] }) {
  return type === "hospedaje" ? <IconHotel /> : <IconPlane />;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(value: unknown, currency?: string | null) {
  const amount = numberValue(value);
  if (amount === null) return "Precio no disponible";

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCommentDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(value?: string | null) {
  if (!value) return "Duración no disponible";
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return value;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}min`);
  return parts.length ? parts.join(" ") : value;
}

function getPayload(proposal: Proposal) {
  return asRecord(proposal.payload);
}

function getDetailPayload(proposal: Proposal) {
  const detail = asRecord(proposal.detalle);
  return asRecord(detail?.payload);
}

function getNormalizedOffer(proposal: Proposal) {
  return (
    asRecord(getPayload(proposal)?.normalizedOffer) ??
    asRecord(getDetailPayload(proposal)?.normalizedOffer)
  );
}

function getSlice(proposal: Proposal, key: "outboundSlice" | "returnSlice") {
  const normalized = getNormalizedOffer(proposal);
  return (
    asRecord(normalized?.[key]) ?? asRecord(getDetailPayload(proposal)?.[key])
  );
}

function getPassengers(proposal: Proposal) {
  const payload = getPayload(proposal);
  const normalized = getNormalizedOffer(proposal);
  const passengers =
    asRecord(payload?.passengers) ?? asRecord(normalized?.passengers);

  const adults = Math.max(0, numberValue(passengers?.adults) ?? 0);
  const children = Math.max(0, numberValue(passengers?.children) ?? 0);
  const infantsWithoutSeat = Math.max(
    0,
    numberValue(passengers?.infantsWithoutSeat) ?? 0,
  );

  return {
    adults,
    children,
    infantsWithoutSeat,
    total: adults + children + infantsWithoutSeat,
  };
}

function getPassengersText(proposal: Proposal) {
  if (proposal.tipo !== "vuelo") return "No aplica";

  const passengers = getPassengers(proposal);
  const parts = [
    `${passengers.adults || 1} adulto(s)`,
    `${passengers.children} niño(s)`,
    `${passengers.infantsWithoutSeat} infante(s)`,
  ];

  return `${parts.join(" · ")} · Total ${Math.max(passengers.total, 1)} pasajero(s)`;
}

function getHotelOffer(proposal: Proposal) {
  const payload = getPayload(proposal);
  const detailPayload = getDetailPayload(proposal);
  return (
    asRecord(payload?.normalizedOffer) ??
    asRecord(detailPayload?.normalizedOffer)
  );
}

function getHotelSearch(proposal: Proposal) {
  const payload = getPayload(proposal);
  const detailPayload = getDetailPayload(proposal);
  return asRecord(payload?.search) ?? asRecord(detailPayload?.search);
}

function getHotelRooms(proposal: Proposal): Record<string, unknown>[] {
  const offer = getHotelOffer(proposal);
  const detailPayload = getDetailPayload(proposal);
  const fromOffer = Array.isArray(offer?.rooms) ? offer.rooms : null;
  const fromPayload = Array.isArray(detailPayload?.rooms)
    ? detailPayload.rooms
    : null;
  return ((fromOffer ?? fromPayload ?? []) as unknown[])
    .map(asRecord)
    .filter((room): room is Record<string, unknown> => Boolean(room));
}

function getHotelOccupancyText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return getPassengersText(proposal);

  const search = getHotelSearch(proposal);
  const offer = getHotelOffer(proposal);
  const rooms = getHotelRooms(proposal);
  const adults =
    numberValue(search?.adults) ??
    numberValue(offer?.adultCount) ??
    numberValue(rooms[0]?.adultCount) ??
    null;
  const childrenAges = Array.isArray(search?.childrenAges)
    ? search.childrenAges
    : [];
  const children =
    childrenAges.length ||
    numberValue(search?.children) ||
    numberValue(offer?.childCount) ||
    numberValue(rooms[0]?.childCount) ||
    0;
  const roomCount = numberValue(search?.rooms) ?? 1;
  const parts = [
    adults !== null ? `${adults} adulto(s)` : null,
    children > 0 ? `${children} niño(s)` : "0 niño(s)",
    `${roomCount} habitación(es)`,
  ].filter(Boolean);

  return parts.join(" · ");
}

function getHotelRatingText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return "No aplica";

  const detail = proposal.detalle as ProposalDetailHotel | null;
  const offer = getHotelOffer(proposal);
  const googleRating =
    numberValue(offer?.googleRating) ??
    numberValue(offer?.rating) ??
    numberValue(detail?.calificacion);
  const reviews = numberValue(offer?.googleUserRatingCount);
  const liteRating =
    numberValue(offer?.rating) ?? numberValue(detail?.calificacion);
  const parts = [];
  if (googleRating !== null)
    parts.push(
      `Google ${googleRating.toFixed(1)} ★${reviews ? ` · ${reviews.toLocaleString("es-MX")} reseñas` : ""}`,
    );
  if (liteRating !== null && liteRating !== googleRating)
    parts.push(`LiteAPI ${liteRating.toFixed(1)} ★`);
  return parts.length ? parts.join(" · ") : "Calificación no disponible";
}

function getHotelRoomText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return "No aplica";

  const offer = getHotelOffer(proposal);
  const rooms = getHotelRooms(proposal);
  const roomName =
    stringValue(offer?.roomName) ??
    stringValue(rooms[0]?.name) ??
    "Habitación disponible";
  const rateCount = numberValue(offer?.rateCount) ?? rooms.length;
  const priceMin = numberValue(offer?.priceMin);
  const priceMax = numberValue(offer?.priceMax);
  const currency = stringValue(offer?.currency) ?? getCurrency(proposal);
  const range =
    priceMin !== null && priceMax !== null && priceMax > priceMin
      ? ` · rango ${formatMoney(priceMin, currency)} - ${formatMoney(priceMax, currency)}`
      : "";
  return `${roomName}${rateCount ? ` · ${rateCount} tarifa(s)` : ""}${range}`;
}

function getHotelBoardText(proposal: Proposal) {
  if (proposal.tipo !== "hospedaje") return "No aplica";

  const offer = getHotelOffer(proposal);
  const rooms = getHotelRooms(proposal);
  const board =
    stringValue(offer?.boardName) ??
    stringValue(rooms[0]?.boardName) ??
    stringValue(rooms[0]?.boardType);
  const refundable =
    stringValue(offer?.refundableTag) ?? stringValue(rooms[0]?.refundableTag);
  const paymentTypes = Array.isArray(rooms[0]?.paymentTypes)
    ? rooms[0].paymentTypes.map(String).filter(Boolean)
    : [];
  const parts = [
    board ?? "Régimen no especificado",
    refundable
      ? refundable.toUpperCase().includes("NR")
        ? "No reembolsable"
        : refundable
      : null,
    paymentTypes.length ? `Pago: ${paymentTypes.slice(0, 2).join(", ")}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function getProviderText(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const payload = getPayload(proposal);
    return (
      stringValue(payload?.provider) ?? stringValue(payload?.fuente) ?? "Duffel"
    );
  }

  const detail = proposal.detalle as ProposalDetailHotel | null;
  const offer = getHotelOffer(proposal);
  const provider =
    detail?.proveedor ?? stringValue(offer?.provider) ?? "LiteAPI";
  const googlePlaceId =
    stringValue(offer?.googlePlaceId) ??
    stringValue(getPayload(proposal)?.googlePlaceId);
  return googlePlaceId ? `${provider} + Google Places` : provider;
}

function getStayOrReturnText(proposal: Proposal) {
  if (proposal.tipo === "hospedaje") return getDurationText(proposal);
  return getReturnText(proposal);
}

function getImageUrl(proposal: Proposal, index: number) {
  const payload = getPayload(proposal);
  const detailPayload = getDetailPayload(proposal);
  const normalized = getNormalizedOffer(proposal);

  const candidate =
    stringValue(payload?.imageUrl) ??
    stringValue(payload?.photoUrl) ??
    stringValue(payload?.photo_url) ??
    stringValue(payload?.placePhotoUrl) ??
    stringValue(payload?.googlePlacePhotoUrl) ??
    stringValue(detailPayload?.imageUrl) ??
    stringValue(detailPayload?.photoUrl) ??
    stringValue(detailPayload?.photo_url) ??
    stringValue(detailPayload?.placePhotoUrl) ??
    stringValue(normalized?.imageUrl);

  if (candidate) return candidate;
  return proposal.tipo === "hospedaje"
    ? FALLBACK_HOTEL_IMAGES[index % FALLBACK_HOTEL_IMAGES.length]
    : FALLBACK_FLIGHT_IMAGES[index % FALLBACK_FLIGHT_IMAGES.length];
}

function getPrice(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    return Number(detail?.precio ?? NaN);
  }

  if (proposal.tipo === "hospedaje") {
    const detail = proposal.detalle as ProposalDetailHotel | null;
    return Number(detail?.precio_total ?? NaN);
  }

  return Number.NaN;
}

function getCurrency(proposal: Proposal) {
  if (proposal.tipo === "vuelo")
    return (proposal.detalle as ProposalDetailFlight | null)?.moneda ?? "USD";
  if (proposal.tipo === "hospedaje")
    return (proposal.detalle as ProposalDetailHotel | null)?.moneda ?? "MXN";
  return "MXN";
}

function getFlightRoute(proposal: Proposal) {
  const detail = proposal.detalle as ProposalDetailFlight | null;
  const outbound = getSlice(proposal, "outboundSlice");
  const origin =
    stringValue(outbound?.origin) ?? detail?.origen_codigo ?? "---";
  const destination =
    stringValue(outbound?.destination) ?? detail?.destino_codigo ?? "---";
  return `${origin} → ${destination}`;
}

function getTitle(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    return `${detail?.aerolinea ?? "Vuelo"} ${detail?.numero_vuelo ?? ""} ${getFlightRoute(proposal)}`.trim();
  }

  if (proposal.tipo === "hospedaje") {
    const detail = proposal.detalle as ProposalDetailHotel | null;
    return detail?.nombre ?? proposal.titulo;
  }

  return proposal.titulo;
}

function getSubtitle(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    const stops = Number(detail?.escalas ?? 0);
    const stopsLabel =
      stops === 0 ? "Directo" : stops === 1 ? "1 escala" : `${stops} escalas`;
    return `${detail?.aerolinea ?? "Aerolínea"} · ${detail?.numero_vuelo ?? "Sin número"} · ${stopsLabel}`;
  }

  const detail = proposal.detalle as ProposalDetailHotel | null;
  const rating = detail?.calificacion ? ` · ${detail.calificacion} ★` : "";
  return `${detail?.proveedor ?? "Hospedaje"}${rating}`;
}

function getRouteOrLocation(proposal: Proposal) {
  if (proposal.tipo === "vuelo") return getFlightRoute(proposal);
  const detail = proposal.detalle as ProposalDetailHotel | null;
  return detail?.direccion ?? detail?.nombre ?? "Ubicación no disponible";
}

function getOutboundText(proposal: Proposal) {
  if (proposal.tipo !== "vuelo") {
    const detail = proposal.detalle as ProposalDetailHotel | null;
    return `${detail?.check_in ?? "Check-in sin definir"} → ${detail?.check_out ?? "Check-out sin definir"}`;
  }

  const detail = proposal.detalle as ProposalDetailFlight | null;
  const outbound = getSlice(proposal, "outboundSlice");
  const departure =
    stringValue(outbound?.departureAt) ?? detail?.salida ?? null;
  const arrival = stringValue(outbound?.arrivalAt) ?? detail?.llegada ?? null;
  return `${formatDate(departure)} · ${formatTime(departure)} → ${formatTime(arrival)}`;
}

function getReturnText(proposal: Proposal) {
  if (proposal.tipo !== "vuelo") return "No aplica";

  const inbound = getSlice(proposal, "returnSlice");
  if (!inbound) return "Vuelo sencillo";

  const origin = stringValue(inbound.origin) ?? "---";
  const destination = stringValue(inbound.destination) ?? "---";
  const departure = stringValue(inbound.departureAt);
  const arrival = stringValue(inbound.arrivalAt);
  return `${origin} → ${destination} · ${formatDate(departure)} · ${formatTime(departure)} → ${formatTime(arrival)}`;
}

function getDurationText(proposal: Proposal) {
  if (proposal.tipo === "vuelo") {
    const detail = proposal.detalle as ProposalDetailFlight | null;
    const outbound = getSlice(proposal, "outboundSlice");
    const inbound = getSlice(proposal, "returnSlice");
    const ida = formatDuration(
      stringValue(outbound?.duration) ?? detail?.duracion ?? null,
    );
    const regreso = inbound
      ? ` · Regreso ${formatDuration(stringValue(inbound.duration))}`
      : "";
    return `Ida ${ida}${regreso}`;
  }

  const detail = proposal.detalle as ProposalDetailHotel | null;
  if (!detail?.check_in || !detail?.check_out) return "Noches no definidas";
  const start = new Date(detail.check_in);
  const end = new Date(detail.check_out);
  const nights = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 86400000),
  );
  return nights > 0 ? `${nights} noche(s)` : "Noches no definidas";
}

function voteLabel(result?: VoteResult) {
  if (!result?.mi_voto) return "Sin tu voto";
  if (result.mi_voto === "a_favor") return "Votaste a favor";
  if (result.mi_voto === "en_contra") return "Votaste en contra";
  return "Te abstuviste";
}

interface ProposalCommentSocketPayload {
  grupoId?: number | string;
  groupId?: number | string;
  proposalId?: number | string;
  entidadId?: number | string | null;
  comment?: Record<string, unknown> | null;
  commentId?: number | string | null;
}

function normalizeRealtimeProposalComment(
  raw: Record<string, unknown> | null | undefined,
): ProposalComment | null {
  if (!raw) return null;
  return {
    id: String(raw.id ?? raw.id_comentario ?? ""),
    proposalId: String(raw.proposalId ?? raw.id_propuesta ?? ""),
    usuarioId: String(raw.usuarioId ?? raw.id_usuario ?? ""),
    authorName: (raw.authorName ?? raw.nombre ?? null) as string | null,
    contenido: String(raw.contenido ?? ""),
    createdAt: String(
      raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    ),
    updatedAt: String(
      raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    ),
  };
}

function TableRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-stretch border-t border-[#E2E8F0]">
      <div className="sticky left-0 z-10 flex w-36 shrink-0 items-center border-r border-[#DCE5F3] bg-[#F2F5FC] py-3 pl-4 pr-3 font-body text-[11px] font-semibold text-[#94A3B8]">
        {label}
      </div>
      <div className="flex min-w-0 flex-1 gap-3 px-4">{children}</div>
    </div>
  );
}

export function ComparisonPage({ onBack }: ComparisonPageProps) {
  const navigate = useNavigate();
  const { accessToken, localUser } = useAuth();
  const { socket } = useSocket(accessToken);
  const currentGroup = useMemo(() => getCurrentGroup(), []);
  const groupId = currentGroup?.id ? String(currentGroup.id) : "";
  const cachedComparison = groupId ? comparisonCache.get(groupId) : undefined;
  const [filter, setFilter] = useState<ProposalFilter>("todas");
  const [proposals, setProposals] = useState<Proposal[]>(
    cachedComparison?.proposals ?? [],
  );
  const [voteResults, setVoteResults] = useState<VoteResult[]>(
    cachedComparison?.voteResults ?? [],
  );
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(
    cachedComparison?.selected ?? null,
  );
  const [loading, setLoading] = useState(!cachedComparison);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentsByProposal, setCommentsByProposal] = useState<
    Record<string, ProposalComment[]>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(
    cachedComparison?.budgetSummary ?? null,
  );
  const [budgetLoading, setBudgetLoading] = useState(false);

  const localUserId = localUser?.id_usuario ? String(localUser.id_usuario) : "";
  const isAdmin = currentGroup?.myRole === "admin";

  const comparableProposals = proposals.filter(
    (proposal) => proposal.tipo === "vuelo" || proposal.tipo === "hospedaje",
  );

  const filteredProposals = comparableProposals
    .filter((proposal) => filter === "todas" || proposal.tipo === filter)
    .filter((proposal) => !hiddenIds.includes(proposal.id))
    .slice(0, MAX_COMPARISON_COLUMNS);

  const minPrice = Math.min(
    ...filteredProposals
      .map(getPrice)
      .filter((value) => Number.isFinite(value)),
  );

  const comparisonMode: "mixed" | "flight" | "hotel" =
    filteredProposals.length > 0 &&
    filteredProposals.every((proposal) => proposal.tipo === "vuelo")
      ? "flight"
      : filteredProposals.length > 0 &&
          filteredProposals.every((proposal) => proposal.tipo === "hospedaje")
        ? "hotel"
        : "mixed";

  const selectedProposal = selected
    ? (filteredProposals.find((proposal) => proposal.id === selected) ?? null)
    : null;
  const selectedPrice = selectedProposal
    ? getPrice(selectedProposal)
    : Number.NaN;
  const selectedCurrency = selectedProposal
    ? getCurrency(selectedProposal)
    : "MXN";
  const budgetAvailable = budgetSummary?.available ?? null;
  const hasRealBudget =
    !!budgetSummary &&
    Number.isFinite(budgetSummary.totalBudget) &&
    budgetSummary.totalBudget > 0 &&
    typeof budgetAvailable === "number" &&
    Number.isFinite(budgetAvailable);
  const exceedsBudget =
    hasRealBudget &&
    Number.isFinite(selectedPrice) &&
    selectedCurrency === "MXN" &&
    selectedPrice > budgetAvailable!;

  const resultsByProposalId = useMemo(() => {
    const map = new Map<string, VoteResult>();
    voteResults.forEach((result) =>
      map.set(String(result.id_propuesta), result),
    );
    return map;
  }, [voteResults]);

  const loadData = useCallback(async () => {
    if (!accessToken || !groupId) {
      setLoading(false);
      setError("No hay un grupo activo para cargar propuestas.");
      return;
    }

    try {
      if (!comparisonCache.has(groupId)) setLoading(true);
      setError(null);
      setBudgetLoading(true);
      const [proposalsResponse, votesResponse, budgetResponse] =
        await Promise.all([
          proposalsService.getGroupProposals(groupId, accessToken),
          proposalsService
            .getVoteResults(groupId, accessToken)
            .catch(() => ({ results: [] as VoteResult[] })),
          budgetService.getDashboard(groupId, accessToken).catch(() => null),
        ]);
      const nextProposals = proposalsResponse.proposals;
      const nextVotes = votesResponse.results ?? [];
      const nextBudget = budgetResponse?.summary ?? null;
      const nextSelected =
        selected ??
        nextProposals.find(
          (proposal) =>
            proposal.tipo === "vuelo" || proposal.tipo === "hospedaje",
        )?.id ??
        null;

      setProposals(nextProposals);
      setVoteResults(nextVotes);
      setBudgetSummary(nextBudget);
      setSelected(nextSelected);
      comparisonCache.set(groupId, {
        proposals: nextProposals,
        voteResults: nextVotes,
        budgetSummary: nextBudget,
        selected: nextSelected,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las propuestas.",
      );
    } finally {
      setLoading(false);
      setBudgetLoading(false);
    }
  }, [accessToken, groupId, selected]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useGroupRealtimeRefresh({
    socket,
    groupId,
    events: ["dashboard_updated", "vote_updated", "checkout_updated"],
    debounceMs: 700,
    onRefresh: async (payload) => {
      const tipo = String(payload.tipo ?? "");
      const proposalId =
        payload.entidadTipo === "propuesta" && payload.entidadId != null
          ? String(payload.entidadId)
          : null;
      const isCommentEvent =
        tipo.startsWith("comentario_") || payload.entidadTipo === "comentario";
      const shouldRefreshComparison =
        tipo.startsWith("propuesta_") ||
        tipo.startsWith("voto_") ||
        tipo.includes("checkout") ||
        tipo.startsWith("gasto_") ||
        tipo.startsWith("presupuesto_") ||
        payload.entidadTipo === "propuesta";

      if (shouldRefreshComparison) await loadData();
      if (
        isCommentEvent &&
        openCommentsFor &&
        (!proposalId || proposalId === openCommentsFor)
      ) {
        await loadComments(openCommentsFor);
      }
    },
  });

  useEffect(() => {
    if (!socket || !groupId) return;

    const belongsToGroup = (payload: ProposalCommentSocketPayload) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId;
      return (
        payloadGroupId === undefined ||
        String(payloadGroupId) === String(groupId)
      );
    };
    const getProposalId = (payload: ProposalCommentSocketPayload) =>
      String(payload.proposalId ?? payload.entidadId ?? "");

    const handleCreated = (payload: ProposalCommentSocketPayload) => {
      if (!belongsToGroup(payload)) return;
      const proposalId = getProposalId(payload);
      const comment = normalizeRealtimeProposalComment(payload.comment);
      if (!proposalId || !comment?.id) return;
      setCommentsByProposal((prev) => {
        const current = prev[proposalId] ?? [];
        if (current.some((item) => item.id === comment.id)) return prev;
        return { ...prev, [proposalId]: [...current, comment] };
      });
    };

    const handleUpdated = (payload: ProposalCommentSocketPayload) => {
      if (!belongsToGroup(payload)) return;
      const proposalId = getProposalId(payload);
      const comment = normalizeRealtimeProposalComment(payload.comment);
      if (!proposalId || !comment?.id) return;
      setCommentsByProposal((prev) => ({
        ...prev,
        [proposalId]: (prev[proposalId] ?? []).map((item) =>
          item.id === comment.id ? comment : item,
        ),
      }));
    };

    const handleDeleted = (payload: ProposalCommentSocketPayload) => {
      if (!belongsToGroup(payload)) return;
      const proposalId = getProposalId(payload);
      const commentId = String(payload.commentId ?? "");
      if (!proposalId || !commentId) return;
      setCommentsByProposal((prev) => ({
        ...prev,
        [proposalId]: (prev[proposalId] ?? []).filter(
          (item) => item.id !== commentId,
        ),
      }));
    };

    socket.on("proposal_comment_created", handleCreated);
    socket.on("proposal_comment_updated", handleUpdated);
    socket.on("proposal_comment_deleted", handleDeleted);

    return () => {
      socket.off("proposal_comment_created", handleCreated);
      socket.off("proposal_comment_updated", handleUpdated);
      socket.off("proposal_comment_deleted", handleDeleted);
    };
  }, [socket, groupId]);

  const canManageProposal = (proposal: Proposal) => {
    return (
      isAdmin ||
      String(proposal.creadoPor ?? proposal.creado_por ?? "") === localUserId
    );
  };

  const canManageComment = (comment: ProposalComment) => {
    return String(comment.usuarioId) === localUserId;
  };

  const loadComments = async (proposalId: string) => {
    if (!accessToken || !groupId) return;
    const response = await proposalsService.getComments(
      groupId,
      proposalId,
      accessToken,
    );
    setCommentsByProposal((prev) => ({
      ...prev,
      [proposalId]: response.comments,
    }));
  };

  const toggleComments = async (proposalId: string) => {
    const next = openCommentsFor === proposalId ? null : proposalId;
    setOpenCommentsFor(next);
    if (next && !commentsByProposal[next]) {
      try {
        await loadComments(next);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los comentarios.",
        );
      }
    }
  };

  const removeOption = (proposalId: string) => {
    setHiddenIds((prev) => [...prev, proposalId]);
    if (selected === proposalId) setSelected(null);
  };

  const handleVote = async (
    proposalId: string,
    voto: "a_favor" | "en_contra" | "abstencion",
  ) => {
    if (!accessToken || !groupId) return;
    try {
      setActionLoading(`${proposalId}-${voto}`);
      setSuccess(null);
      setError(null);
      await proposalsService.voteProposal(
        groupId,
        proposalId,
        { voto },
        accessToken,
      );
      const votesResponse = await proposalsService.getVoteResults(
        groupId,
        accessToken,
      );
      setVoteResults(votesResponse.results ?? []);
      setSuccess("Voto registrado correctamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar el voto.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminDecision = async (
    proposalId: string,
    decision: "aprobar" | "rechazar",
  ) => {
    if (!accessToken || !groupId) return;
    try {
      setActionLoading(`${proposalId}-${decision}`);
      setSuccess(null);
      setError(null);
      await proposalsService.applyAdminDecision(
        groupId,
        proposalId,
        { decision },
        accessToken,
      );
      await loadData();
      setSuccess(
        decision === "aprobar"
          ? "Propuesta aprobada."
          : "Propuesta descartada.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la propuesta.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const startEditProposal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setEditTitle(proposal.titulo);
    setEditDescription(proposal.descripcion ?? "");
  };

  const saveProposalEdit = async () => {
    if (!editingProposal || !accessToken) return;
    try {
      setActionLoading(`${editingProposal.id}-edit`);
      setError(null);
      await proposalsService.updateProposal(
        editingProposal.id,
        {
          titulo: editTitle.trim(),
          descripcion: editDescription.trim() || null,
        },
        accessToken,
      );
      setEditingProposal(null);
      await loadData();
      setSuccess("Propuesta actualizada correctamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo editar la propuesta.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const deleteProposal = async (proposal: Proposal) => {
    if (!accessToken) return;
    const confirmed = window.confirm(
      `¿Eliminar la propuesta "${getTitle(proposal)}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    try {
      setActionLoading(`${proposal.id}-delete`);
      setError(null);
      await proposalsService.deleteProposal(proposal.id, accessToken);
      setHiddenIds((prev) => prev.filter((id) => id !== proposal.id));
      if (selected === proposal.id) setSelected(null);
      await loadData();
      setSuccess("Propuesta eliminada correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la propuesta.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const addComment = async (proposalId: string) => {
    if (!accessToken || !groupId) return;
    const draft = commentDrafts[proposalId]?.trim();
    if (!draft) return;

    try {
      setActionLoading(`${proposalId}-comment`);
      setError(null);
      const response = await proposalsService.addComment(
        groupId,
        proposalId,
        { contenido: draft },
        accessToken,
      );
      setCommentsByProposal((prev) => {
        const current = prev[proposalId] ?? [];
        return current.some((item) => item.id === response.comment.id)
          ? prev
          : { ...prev, [proposalId]: [...current, response.comment] };
      });
      setCommentDrafts((prev) => ({ ...prev, [proposalId]: "" }));
      setSuccess("Comentario agregado.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo agregar el comentario.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const editComment = async (proposalId: string, comment: ProposalComment) => {
    if (!accessToken || !groupId) return;
    const nextContent = window.prompt("Editar comentario", comment.contenido);
    if (nextContent === null || !nextContent.trim()) return;

    try {
      setActionLoading(`${proposalId}-${comment.id}-edit`);
      setError(null);
      await proposalsService.updateComment(
        groupId,
        proposalId,
        comment.id,
        { contenido: nextContent.trim() },
        accessToken,
      );
      await loadComments(proposalId);
      setSuccess("Comentario actualizado.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el comentario.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const deleteComment = async (
    proposalId: string,
    comment: ProposalComment,
  ) => {
    if (!accessToken || !groupId) return;
    const confirmed = window.confirm("¿Eliminar este comentario?");
    if (!confirmed) return;

    try {
      setActionLoading(`${proposalId}-${comment.id}-delete`);
      setError(null);
      await proposalsService.deleteComment(
        groupId,
        proposalId,
        comment.id,
        accessToken,
      );
      await loadComments(proposalId);
      setSuccess("Comentario eliminado.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el comentario.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-8 text-center shadow-xl shadow-[#1E0A4E]/10 backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E6FD9] to-[#7A4FD6] text-white shadow-lg shadow-[#7A4FD6]/25">
          <InlineSpinner size={22} />
        </div>
        <p className="font-heading text-base font-bold text-[#1E0A4E]">
          Preparando comparativa
        </p>
        <p className="mt-1 font-body text-sm text-[#64748B]">
          Cargando votos, presupuesto y opciones guardadas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3 px-2">
      <div className="relative border-b border-[#D9E2F2] pb-3">
        <div className="relative flex flex-wrap items-center justify-between gap-3 pr-0 sm:pr-2">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={onBack}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border border-white bg-white/90 px-3.5 font-body text-xs font-bold text-[#1E0A4E] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <IconArrowLeft size={14} />
              Regresar
            </button>
            <div className="min-w-0">
              <h1 className="font-heading text-[26px] font-bold leading-tight text-[#1E0A4E]">
                Comparar opciones
              </h1>
              <p className="mt-0.5 max-w-xl font-body text-sm leading-relaxed text-[#64748B]">
                Compara propuestas de vuelos y hospedajes con votos, comentarios
                y edición controlada.
              </p>
            </div>
          </div>

          {exceedsBudget ? (
            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 font-body text-xs font-bold text-[#EF4444] shadow-sm">
              <IconWarning size={13} />
              Supera disponible
            </span>
          ) : (
            <span className="inline-flex w-fit shrink-0 flex-col rounded-2xl border border-[#E2E8F0] bg-white/95 px-3.5 py-2 text-right shadow-sm">
              <span className="font-body text-[10px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]">
                Disponible real
              </span>
              <span className="font-heading text-sm font-bold leading-tight text-[#1E0A4E]">
                {budgetLoading
                  ? "Consultando..."
                  : hasRealBudget
                    ? formatMoney(budgetSummary.available, "MXN")
                    : budgetSummary
                      ? "Sin definir"
                      : "No disponible"}
              </span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 font-body text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[#35C56A]/30 bg-[#35C56A]/10 p-3 font-body text-sm font-semibold text-[#35C56A]">
          {success}
        </div>
      )}

      {editingProposal && (
        <div className="rounded-[26px] border border-white/80 bg-white p-5 shadow-xl shadow-[#1E0A4E]/10 ring-1 ring-[#E2E8F0]/70">
          <h2 className="font-heading text-base font-bold text-[#1E0A4E]">
            Editar propuesta
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="font-body text-xs font-semibold text-[#1E0A4E]">
              Título
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#1E6FD9]"
              />
            </label>
            <label className="font-body text-xs font-semibold text-[#1E0A4E]">
              Descripción
              <input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#1E6FD9]"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={saveProposalEdit}
              disabled={actionLoading !== null || !editTitle.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-4 py-2 font-body text-xs font-bold text-white shadow-sm disabled:opacity-60"
            >
              {actionLoading === `${editingProposal.id}-edit` && (
                <InlineSpinner size={12} />
              )}
              {actionLoading === `${editingProposal.id}-edit`
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
            <button
              onClick={() => setEditingProposal(null)}
              className="rounded-xl border border-[#E2E8F0] px-4 py-2 font-body text-xs font-semibold text-[#64748B]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="inline-flex w-fit flex-wrap gap-1.5 rounded-2xl border border-[#D5DEEE] bg-[#EEF2FB] p-1.5">
        {(["todas", "vuelo", "hospedaje"] as ProposalFilter[]).map((item) => (
          <button
            key={item}
            onClick={() => {
              setFilter(item);
              setHiddenIds([]);
              setSelected(null);
            }}
            className={[
              "rounded-xl px-4 py-2 font-body text-xs font-bold transition-all",
              filter === item
                ? "bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] text-white shadow-md shadow-[#1E6FD9]/20"
                : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E0A4E]",
            ].join(" ")}
          >
            {item === "todas"
              ? "Todas"
              : item === "vuelo"
                ? "Vuelo"
                : "Hospedaje"}
          </button>
        ))}
      </div>

      {filteredProposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center">
          <p className="font-heading text-lg font-bold text-[#1E0A4E]">
            Aún no hay vuelos u hospedajes para comparar
          </p>
          <p className="mt-1 font-body text-sm text-[#6B7280]">
            Busca un vuelo u hospedaje y presiona “Proponer” para guardarlo en
            este grupo.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#D5DEEE] bg-[#F7F8FD]">
        <div className="overflow-x-auto overscroll-x-contain pb-2">
          <div className="min-w-max">
            <div className="flex items-stretch gap-3 bg-[#F2F5FC] p-4">
                <div className="sticky left-0 z-10 w-36 shrink-0 border-r border-[#DCE5F3] bg-[#F2F5FC]" />
                {filteredProposals.map((proposal, index) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 pr-0">
                    <div className="group relative overflow-hidden rounded-2xl shadow-lg shadow-[#1E0A4E]/10">
                      <img
                        src={getImageUrl(proposal, index)}
                        alt={getTitle(proposal)}
                        className="h-[128px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <button
                        onClick={() => removeOption(proposal.id)}
                        disabled={filteredProposals.length <= 1}
                        className={[
                          "absolute right-2 top-2 rounded-full bg-black/45 p-1.5 text-white backdrop-blur transition-all",
                          filteredProposals.length <= 1
                            ? "cursor-not-allowed opacity-30"
                            : "hover:bg-black/60",
                        ].join(" ")}
                        aria-label={`Quitar ${getTitle(proposal)}`}
                      >
                        <IconX size={10} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-start gap-1">
                      <span className="mt-0.5">
                        <CategoryIcon type={proposal.tipo} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-semibold leading-tight text-[#1E0A4E]">
                          {getTitle(proposal)}
                        </p>
                        <p className="mt-0.5 truncate font-body text-[11px] text-[#6B7280]">
                          {getSubtitle(proposal)}
                        </p>
                        <p className="mt-0.5 truncate font-body text-[10px] text-[#94A3B8]">
                          {proposal.estado}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <TableRow label="Precio">
                {filteredProposals.map((proposal) => {
                  const price = getPrice(proposal);
                  const isBestPrice =
                    Number.isFinite(minPrice) &&
                    price === minPrice &&
                    filteredProposals.length > 1;

                  return (
                    <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                      <span className="font-heading text-base font-bold leading-none text-[#1E0A4E]">
                        {formatMoney(price, getCurrency(proposal))}
                      </span>
                      {isBestPrice && (
                        <span className="mt-1 inline-flex rounded-full bg-[#35C56A]/10 px-2 py-0.5 text-[10px] font-bold text-[#35C56A]">
                          Mejor precio
                        </span>
                      )}
                    </div>
                  );
                })}
              </TableRow>

              <TableRow label="Tipo">
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                    <span className="font-body text-sm text-[#1E0A4E]">
                      {proposal.tipo === "vuelo"
                        ? getSlice(proposal, "returnSlice")
                          ? "Vuelo redondo"
                          : "Vuelo sencillo"
                        : "Hospedaje"}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow
                label={
                  comparisonMode === "flight"
                    ? "Pasajeros"
                    : comparisonMode === "hotel"
                      ? "Huéspedes"
                      : "Viajeros / huéspedes"
                }
              >
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                    <span className="font-body text-xs text-[#6B7280]">
                      {getHotelOccupancyText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow
                label={
                  comparisonMode === "flight"
                    ? "Ruta"
                    : comparisonMode === "hotel"
                      ? "Ubicación"
                      : "Ruta / ubicación"
                }
              >
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                    <span className="font-body text-xs text-[#6B7280]">
                      {getRouteOrLocation(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow
                label={
                  comparisonMode === "flight"
                    ? "Salida"
                    : comparisonMode === "hotel"
                      ? "Check-in / Check-out"
                      : "Fechas"
                }
              >
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                    <span className="font-body text-xs text-[#6B7280]">
                      {getOutboundText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow
                label={
                  comparisonMode === "flight"
                    ? "Regreso"
                    : comparisonMode === "hotel"
                      ? "Estancia"
                      : "Regreso / estancia"
                }
              >
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                    <span className="font-body text-xs text-[#6B7280]">
                      {getStayOrReturnText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              {comparisonMode !== "mixed" && (
                <>
                  <TableRow
                    label={
                      comparisonMode === "flight"
                        ? "Duración"
                        : comparisonMode === "hotel"
                          ? "Habitación / tarifa"
                          : "Habitación / duración"
                    }
                  >
                    {filteredProposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="w-[332px] shrink-0 py-3"
                      >
                        <span className="font-body text-xs text-[#6B7280]">
                          {proposal.tipo === "hospedaje"
                            ? getHotelRoomText(proposal)
                            : getDurationText(proposal)}
                        </span>
                      </div>
                    ))}
                  </TableRow>

                  <TableRow
                    label={
                      comparisonMode === "flight"
                        ? "Escalas / conexión"
                        : comparisonMode === "hotel"
                          ? "Régimen / política"
                          : "Régimen / conexión"
                    }
                  >
                    {filteredProposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="w-[332px] shrink-0 py-3"
                      >
                        <span className="font-body text-xs text-[#6B7280]">
                          {proposal.tipo === "hospedaje"
                            ? getHotelBoardText(proposal)
                            : getDurationText(proposal)}
                        </span>
                      </div>
                    ))}
                  </TableRow>

                  <TableRow
                    label={
                      comparisonMode === "flight" ? "Aerolínea" : "Calificación"
                    }
                  >
                    {filteredProposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="w-[332px] shrink-0 py-3"
                      >
                        <span className="font-body text-xs text-[#6B7280]">
                          {proposal.tipo === "hospedaje"
                            ? getHotelRatingText(proposal)
                            : getSubtitle(proposal)}
                        </span>
                      </div>
                    ))}
                  </TableRow>
                </>
              )}

              <TableRow label="Proveedor">
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                    <span className="inline-flex rounded-full bg-[#F0F4FF] px-2 py-1 font-body text-[11px] font-semibold text-[#1E0A4E]/70">
                      {getProviderText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Votación">
                {filteredProposals.map((proposal) => {
                  const result = resultsByProposalId.get(proposal.id);
                  return (
                    <div key={proposal.id} className="w-[332px] shrink-0 py-3">
                      <p className="font-body text-xs font-semibold text-[#1E0A4E]">
                        {result
                          ? `${result.votos_a_favor} a favor · ${result.votos_en_contra} en contra`
                          : "Sin votos"}
                      </p>
                      <p className="mt-0.5 font-body text-[11px] text-[#94A3B8]">
                        {voteLabel(result)}
                      </p>
                    </div>
                  );
                })}
              </TableRow>

              <TableRow label="Acciones">
                {filteredProposals.map((proposal) => {
                  const selectedColumn = selected === proposal.id;
                  const result = resultsByProposalId.get(proposal.id);
                  const hasVoted = Boolean(result?.mi_voto);
                  return (
                    <div
                      key={proposal.id}
                      className="w-[332px] shrink-0 space-y-3 py-4"
                    >
                      <div className="min-h-[126px] rounded-[28px] border border-[#E2E8F0] bg-white/95 p-3.5 shadow-sm shadow-[#1E0A4E]/5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => {
                              setSelected(proposal.id);
                              handleVote(proposal.id, "a_favor");
                            }}
                            disabled={actionLoading !== null || hasVoted}
                            className={[
                              "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl px-4 font-body text-[12px] font-bold shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
                              selectedColumn || result?.mi_voto === "a_favor"
                                ? "bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] text-white shadow-[#1E6FD9]/25"
                                : "bg-[#1E6FD9] text-white hover:bg-[#185DB8]",
                            ].join(" ")}
                          >
                            {actionLoading === `${proposal.id}-a_favor` ? (
                              <InlineSpinner size={13} />
                            ) : selectedColumn ||
                              result?.mi_voto === "a_favor" ? (
                              <IconCheck size={12} />
                            ) : null}
                            <span className="truncate">
                              {result?.mi_voto === "a_favor"
                                ? "Seleccionada"
                                : actionLoading === `${proposal.id}-a_favor`
                                  ? "Registrando..."
                                  : "A favor"}
                            </span>
                          </button>
                          <button
                            onClick={() => handleVote(proposal.id, "en_contra")}
                            disabled={actionLoading !== null || hasVoted}
                            className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-[#FCA5A5] bg-white px-4 font-body text-[12px] font-bold text-[#EF4444] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                          >
                            {actionLoading === `${proposal.id}-en_contra` && (
                              <InlineSpinner size={13} />
                            )}
                            <span className="truncate">
                              {result?.mi_voto === "en_contra"
                                ? "En contra"
                                : actionLoading === `${proposal.id}-en_contra`
                                  ? "Registrando..."
                                  : "En contra"}
                            </span>
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-center gap-2.5 border-t border-[#EEF2F7] pt-3">
                          <ActionIconButton
                            label={
                              openCommentsFor === proposal.id
                                ? "Ocultar chat"
                                : "Abrir chat"
                            }
                            onClick={() => toggleComments(proposal.id)}
                            variant="neutral"
                          >
                            <span className="relative inline-flex">
                              <IconMessage />
                              {(commentsByProposal[proposal.id] ?? []).length >
                                0 && (
                                <span className="absolute -right-2.5 -top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1E6FD9] px-1 font-body text-[9px] font-bold text-white ring-2 ring-white">
                                  {
                                    (commentsByProposal[proposal.id] ?? [])
                                      .length
                                  }
                                </span>
                              )}
                            </span>
                          </ActionIconButton>

                          {canManageProposal(proposal) && (
                            <>
                              <ActionIconButton
                                label="Editar propuesta"
                                onClick={() => startEditProposal(proposal)}
                                disabled={actionLoading !== null}
                                loading={
                                  actionLoading === `${proposal.id}-edit`
                                }
                                variant="neutral"
                              >
                                <IconEdit />
                              </ActionIconButton>
                              <ActionIconButton
                                label="Eliminar propuesta"
                                onClick={() => deleteProposal(proposal)}
                                disabled={actionLoading !== null}
                                loading={
                                  actionLoading === `${proposal.id}-delete`
                                }
                                variant="danger"
                              >
                                <IconTrash />
                              </ActionIconButton>
                            </>
                          )}
                        </div>
                      </div>

                      {proposal.estado === "aprobada" &&
                        (proposal.tipo === "vuelo" ||
                          proposal.tipo === "hospedaje") &&
                        (() => {
                          const detail = proposal.detalle as
                            | (ProposalDetailFlight & ProposalDetailHotel)
                            | null;
                          const isConfirmed =
                            proposal.tipo === "vuelo"
                              ? detail?.compra_estado === "confirmada_simulada"
                              : detail?.reserva_estado ===
                                "confirmada_simulada";

                          if (isConfirmed) {
                            return (
                              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-center font-body text-xs font-bold text-[#15803D]">
                                {proposal.tipo === "vuelo"
                                  ? "Vuelo comprado"
                                  : "Hospedaje reservado"}
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() =>
                                navigate(
                                  `/checkout/${proposal.tipo === "vuelo" ? "flight" : "hotel"}/${proposal.id}`,
                                )
                              }
                              disabled={actionLoading !== null}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] px-3 py-2.5 font-body text-xs font-bold text-white shadow-lg shadow-[#1E6FD9]/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                              {actionLoading === `${proposal.id}-checkout` && (
                                <InlineSpinner size={13} />
                              )}
                              {proposal.tipo === "vuelo"
                                ? "Comprar vuelo"
                                : "Reservar hospedaje"}
                            </button>
                          );
                        })()}

                      {isAdmin &&
                        proposal.estado !== "aprobada" &&
                        proposal.estado !== "descartada" && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              onClick={() =>
                                handleAdminDecision(proposal.id, "aprobar")
                              }
                              disabled={actionLoading !== null}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#35C56A] px-3 py-2.5 font-body text-[11px] font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                              {actionLoading === `${proposal.id}-aprobar` && (
                                <InlineSpinner size={12} />
                              )}
                              Aprobar
                            </button>
                            <button
                              onClick={() =>
                                handleAdminDecision(proposal.id, "rechazar")
                              }
                              disabled={actionLoading !== null}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-2.5 font-body text-[11px] font-bold text-[#64748B] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            >
                              {actionLoading === `${proposal.id}-rechazar` && (
                                <InlineSpinner size={12} />
                              )}
                              Descartar
                            </button>
                          </div>
                        )}
                    </div>
                  );
                })}
              </TableRow>
            </div>
          </div>

          {openCommentsFor &&
            (() => {
              const activeProposal =
                filteredProposals.find(
                  (proposal) => proposal.id === openCommentsFor,
                ) ??
                proposals.find((proposal) => proposal.id === openCommentsFor);
              const activeComments = commentsByProposal[openCommentsFor] ?? [];

              return (
                <div className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/35 backdrop-blur-[3px]">
                  <button
                    type="button"
                    className="absolute inset-0 cursor-default"
                    onClick={() => setOpenCommentsFor(null)}
                    aria-label="Cerrar chat de propuesta"
                  />

                  <aside className="relative z-10 flex h-full w-[min(430px,calc(100vw-24px))] max-w-[430px] flex-col overflow-hidden border-l border-[#DDD6FE] bg-[#F8FAFC] shadow-2xl shadow-[#1E0A4E]/25">
                    <div className="bg-gradient-to-r from-[#1E0A4E] to-[#7A4FD6] px-5 py-5 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-body text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
                            Chat de propuesta
                          </p>
                          <h3 className="mt-2 truncate font-heading text-lg font-bold">
                            {activeProposal?.titulo ?? "Propuesta"}
                          </h3>
                          <p className="mt-1 truncate font-body text-xs text-white/75">
                            {activeProposal?.tipo === "vuelo"
                              ? "Vuelo"
                              : activeProposal?.tipo === "hospedaje"
                                ? "Hospedaje"
                                : "Actividad"}{" "}
                            · Comentarios en tiempo real
                          </p>
                        </div>
                        <button
                          onClick={() => setOpenCommentsFor(null)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/75 transition-colors hover:bg-white/20 hover:text-white"
                          aria-label="Cerrar chat"
                          title="Cerrar chat"
                        >
                          <IconX size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-[auto_1fr] gap-0 border-b border-[#E2E8F0] bg-white px-5 py-3">
                      <div className="rounded-xl bg-[#EFF6FF] px-3 py-2 text-center font-body text-xs font-bold text-[#1E6FD9]">
                        {activeComments.length}
                        <br />
                        <span className="text-[10px] font-semibold">
                          comentarios
                        </span>
                      </div>
                      <div className="min-w-0 px-3 py-2">
                        <p className="truncate font-body text-xs font-semibold text-[#64748B]">
                          {activeProposal
                            ? getRouteOrLocation(activeProposal)
                            : "Conversación del grupo"}
                        </p>
                        <p className="mt-0.5 truncate font-body text-[11px] text-[#94A3B8]">
                          {activeProposal
                            ? getOutboundText(activeProposal)
                            : "Sin datos adicionales"}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                      {activeComments.length === 0 ? (
                        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#DDD6FE] bg-white p-8 text-center">
                          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#7A4FD6]">
                            <IconMessage size={20} />
                          </span>
                          <p className="font-heading text-sm font-bold text-[#1E0A4E]">
                            Sé el primero en comentar
                          </p>
                          <p className="mt-1 max-w-xs font-body text-xs text-[#64748B]">
                            Coordina esta opción con el grupo sin salir de la
                            comparativa.
                          </p>
                        </div>
                      ) : (
                        activeComments.map((comment) => {
                          const isOwnComment = localUser?.id_usuario
                            ? String(comment.usuarioId) ===
                              String(localUser.id_usuario)
                            : false;

                          return (
                            <div
                              key={comment.id}
                              className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm shadow-[#1E0A4E]/5"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="min-w-0 truncate font-body text-xs font-bold text-[#1E0A4E]">
                                  {comment.authorName ??
                                    (isOwnComment ? "Tú" : "Integrante")}
                                </p>
                                <p className="shrink-0 font-body text-[11px] text-[#64748B]">
                                  {formatCommentDate(comment.createdAt)}
                                </p>
                              </div>

                              <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-[#334155]">
                                {comment.contenido}
                              </p>

                              {canManageComment(comment) && (
                                <div className="mt-2 flex gap-3">
                                  <button
                                    onClick={() =>
                                      editComment(openCommentsFor, comment)
                                    }
                                    disabled={actionLoading !== null}
                                    className="font-body text-xs font-semibold text-[#1E6FD9] transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label="Editar comentario"
                                    title="Editar comentario"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteComment(openCommentsFor, comment)
                                    }
                                    disabled={actionLoading !== null}
                                    className="font-body text-xs font-semibold text-[#EF4444] transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label="Eliminar comentario"
                                    title="Eliminar comentario"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-[#E2E8F0] bg-white p-4">
                      <div className="flex gap-2">
                        <input
                          value={commentDrafts[openCommentsFor] ?? ""}
                          onChange={(event) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [openCommentsFor]: event.target.value,
                            }))
                          }
                          placeholder="Escribe un comentario..."
                          className="min-w-0 flex-1 rounded-2xl border border-[#DDE6F3] bg-white px-4 py-3 font-body text-sm outline-none transition-colors focus:border-[#7A4FD6] focus:ring-2 focus:ring-[#7A4FD6]/10"
                        />
                        <button
                          onClick={() => addComment(openCommentsFor)}
                          disabled={
                            actionLoading !== null ||
                            !(commentDrafts[openCommentsFor] ?? "").trim()
                          }
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] font-body text-xs font-bold text-white shadow-md shadow-[#1E6FD9]/20 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Enviar comentario"
                          title="Enviar"
                        >
                          {actionLoading === `${openCommentsFor}-comment` ? (
                            <InlineSpinner size={13} />
                          ) : (
                            <IconArrowRight size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              );
            })()}

          {filteredProposals.length === 1 && (
            <div className="border-t border-[#E2E8F0] p-4">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F0EEF8] p-4 text-center">
                <p className="inline-flex items-center justify-center gap-1.5 font-body text-sm text-[#6B7280]">
                  <IconArrowRight size={14} />
                  Agrega otra opción para comparar
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {hiddenIds.length > 0 && (
        <button
          onClick={() => setHiddenIds([])}
          className="rounded-xl border-2 border-dashed border-[#E2E8F0] py-4 font-body text-sm text-[#6B7280] transition-colors hover:border-[#1E6FD9]/30 hover:text-[#1E6FD9]"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <IconPlus size={14} />
            Mostrar opciones ocultas
          </span>
        </button>
      )}

      {selected !== null && exceedsBudget && (
        <div className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
          <span className="mt-0.5 shrink-0 text-[#EF4444]">
            <IconWarning size={14} />
          </span>
          <p className="font-body text-xs text-[#EF4444]">
            Esta opción cuesta {formatMoney(selectedPrice, selectedCurrency)} y
            supera el presupuesto disponible real del grupo (
            {formatMoney(budgetAvailable ?? 0, "MXN")}). El voto se registra,
            pero conviene revisarla antes de aprobarla.
          </p>
        </div>
      )}
    </div>
  );
}
