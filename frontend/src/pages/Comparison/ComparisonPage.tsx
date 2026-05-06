import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../context/useAuth";
import { getCurrentGroup } from "../../services/groups";
import {
  proposalsService,
  type Proposal,
  type ProposalComment,
  type ProposalDetailFlight,
  type ProposalDetailHotel,
  type VoteResult,
} from "../../services/proposals";

export interface ComparisonPageProps {
  onBack: () => void;
}

type ProposalFilter = "todas" | "vuelo" | "hospedaje";

const BUDGET_LIMIT = 5000;
const MAX_COMPARISON_COLUMNS = 4;

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

function TableRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start border-t border-[#E2E8F0]">
      <div className="flex w-28 shrink-0 items-center self-stretch py-3 pl-4 pr-2 font-body text-xs text-[#9CA3AF]">
        {label}
      </div>
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function ComparisonPage({ onBack }: ComparisonPageProps) {
  const { accessToken, localUser } = useAuth();
  const currentGroup = useMemo(() => getCurrentGroup(), []);
  const [filter, setFilter] = useState<ProposalFilter>("todas");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const groupId = currentGroup?.id ? String(currentGroup.id) : "";
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

  const selectedProposal = selected
    ? (filteredProposals.find((proposal) => proposal.id === selected) ?? null)
    : null;
  const selectedPrice = selectedProposal
    ? getPrice(selectedProposal)
    : Number.NaN;
  const selectedCurrency = selectedProposal
    ? getCurrency(selectedProposal)
    : "MXN";
  const exceedsBudget =
    Number.isFinite(selectedPrice) &&
    selectedCurrency === "MXN" &&
    selectedPrice > BUDGET_LIMIT;

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
      setLoading(true);
      setError(null);
      const [proposalsResponse, votesResponse] = await Promise.all([
        proposalsService.getGroupProposals(groupId, accessToken),
        proposalsService
          .getVoteResults(groupId, accessToken)
          .catch(() => ({ results: [] as VoteResult[] })),
      ]);
      setProposals(proposalsResponse.proposals);
      setVoteResults(votesResponse.results ?? []);
      setSelected(
        (prev) =>
          prev ??
          proposalsResponse.proposals.find(
            (proposal) =>
              proposal.tipo === "vuelo" || proposal.tipo === "hospedaje",
          )?.id ??
          null,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las propuestas.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManageProposal = (proposal: Proposal) => {
    return (
      isAdmin ||
      String(proposal.creadoPor ?? proposal.creado_por ?? "") === localUserId
    );
  };

  const canManageComment = (comment: ProposalComment) => {
    return isAdmin || String(comment.usuarioId) === localUserId;
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
      await proposalsService.addComment(
        groupId,
        proposalId,
        { contenido: draft },
        accessToken,
      );
      setCommentDrafts((prev) => ({ ...prev, [proposalId]: "" }));
      await loadComments(proposalId);
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
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center font-body text-sm text-[#6B7280]">
        Cargando propuestas para comparar...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-4 py-2 font-body text-sm text-[#1E0A4E] transition-colors hover:bg-[#F8FAFC]"
          >
            <IconArrowLeft size={14} />
            Regresar
          </button>
          <div>
            <h1 className="font-heading text-xl font-bold leading-tight text-[#1E0A4E]">
              Comparar opciones
            </h1>
            <p className="font-body text-xs text-[#6B7280]">
              Compara propuestas de vuelos y hospedajes con votos, comentarios y
              edición controlada.
            </p>
          </div>
        </div>

        {exceedsBudget ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-body text-sm text-[#EF4444]">
            <IconWarning size={14} />
            ¡Excede el presupuesto!
          </span>
        ) : (
          <span className="shrink-0 font-body text-sm text-[#6B7280]">
            Presupuesto disponible: $5,000 MXN
          </span>
        )}
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
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
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
              className="rounded-xl bg-[#1E6FD9] px-4 py-2 font-body text-xs font-semibold text-white disabled:opacity-60"
            >
              Guardar cambios
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

      <div className="flex flex-wrap gap-2">
        {(["todas", "vuelo", "hospedaje"] as ProposalFilter[]).map((item) => (
          <button
            key={item}
            onClick={() => {
              setFilter(item);
              setHiddenIds([]);
              setSelected(null);
            }}
            className={[
              "rounded-lg px-4 py-2 font-body text-xs font-semibold transition-colors",
              filter === item
                ? "bg-[#1E6FD9] text-white"
                : "border border-[#E2E8F0] bg-white text-[#6B7280] hover:bg-[#F8FAFC]",
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
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-max w-full">
              <div className="flex items-start gap-3 p-4">
                <div className="w-28 shrink-0" />
                {filteredProposals.map((proposal, index) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 pr-3 last:pr-0"
                  >
                    <div className="relative overflow-hidden rounded-xl">
                      <img
                        src={getImageUrl(proposal, index)}
                        alt={getTitle(proposal)}
                        className="h-[100px] w-full object-cover"
                        loading="lazy"
                      />
                      <button
                        onClick={() => removeOption(proposal.id)}
                        disabled={filteredProposals.length <= 1}
                        className={[
                          "absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1 transition-opacity",
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
                    <div
                      key={proposal.id}
                      className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                    >
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
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
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

              <TableRow label="Viajeros / huéspedes">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {getHotelOccupancyText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Ruta / ubicación">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {getRouteOrLocation(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Fechas">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {getOutboundText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Regreso / estancia">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {getStayOrReturnText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Habitación / tarifa">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {proposal.tipo === "hospedaje"
                        ? getHotelRoomText(proposal)
                        : getDurationText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Régimen / política">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {proposal.tipo === "hospedaje"
                        ? getHotelBoardText(proposal)
                        : getDurationText(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Calificación">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
                    <span className="font-body text-xs text-[#6B7280]">
                      {proposal.tipo === "hospedaje"
                        ? getHotelRatingText(proposal)
                        : getSubtitle(proposal)}
                    </span>
                  </div>
                ))}
              </TableRow>

              <TableRow label="Proveedor">
                {filteredProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                  >
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
                    <div
                      key={proposal.id}
                      className="min-w-56 flex-1 py-3 pr-3 last:pr-4"
                    >
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
                      className="min-w-56 flex-1 space-y-2 py-3 pr-3 last:pr-4"
                    >
                      <button
                        onClick={() => {
                          setSelected(proposal.id);
                          handleVote(proposal.id, "a_favor");
                        }}
                        disabled={actionLoading !== null || hasVoted}
                        className={[
                          "inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 font-body text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                          selectedColumn || result?.mi_voto === "a_favor"
                            ? "bg-[#1E6FD9] text-white"
                            : "border border-[#1E6FD9] text-[#1E6FD9] hover:bg-[#1E6FD9]/5",
                        ].join(" ")}
                      >
                        {(selectedColumn || result?.mi_voto === "a_favor") && (
                          <IconCheck size={12} />
                        )}
                        {result?.mi_voto === "a_favor"
                          ? "Seleccionada"
                          : "Votar a favor"}
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, "en_contra")}
                        disabled={actionLoading !== null || hasVoted}
                        className="w-full rounded-xl border border-[#EF4444] px-3 py-2 font-body text-xs font-semibold text-[#EF4444] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {result?.mi_voto === "en_contra"
                          ? "Votaste en contra"
                          : "Votar en contra"}
                      </button>

                      <button
                        onClick={() => toggleComments(proposal.id)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#7A4FD6] px-3 py-2 font-body text-xs font-semibold text-[#7A4FD6] transition-colors hover:bg-[#7A4FD6]/5"
                      >
                        <IconMessage />
                        {openCommentsFor === proposal.id
                          ? "Ocultar chat"
                          : "Abrir chat"}
                      </button>

                      {canManageProposal(proposal) && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => startEditProposal(proposal)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#CBD5E1] px-3 py-2 font-body text-[11px] font-semibold text-[#64748B] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <IconEdit />
                            Editar
                          </button>
                          <button
                            onClick={() => deleteProposal(proposal)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#FCA5A5] px-3 py-2 font-body text-[11px] font-semibold text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <IconTrash />
                            Borrar
                          </button>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              handleAdminDecision(proposal.id, "aprobar")
                            }
                            disabled={actionLoading !== null}
                            className="rounded-lg bg-[#35C56A] px-3 py-2 font-body text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() =>
                              handleAdminDecision(proposal.id, "rechazar")
                            }
                            disabled={actionLoading !== null}
                            className="rounded-lg border border-[#CBD5E1] px-3 py-2 font-body text-[11px] font-semibold text-[#64748B] disabled:cursor-not-allowed disabled:opacity-70"
                          >
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

          {openCommentsFor && (
            <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center gap-2 font-heading text-sm font-bold text-[#1E0A4E]">
                <IconMessage />
                Chat de propuesta
              </div>
              <div className="space-y-2">
                {(commentsByProposal[openCommentsFor] ?? []).length === 0 ? (
                  <p className="rounded-xl bg-white p-3 font-body text-xs text-[#94A3B8]">
                    Aún no hay comentarios en esta propuesta.
                  </p>
                ) : (
                  commentsByProposal[openCommentsFor].map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-[#E2E8F0] bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-body text-xs font-semibold text-[#1E0A4E]">
                            {comment.authorName ?? "Integrante"}
                          </p>
                          <p className="mt-1 font-body text-sm text-[#334155]">
                            {comment.contenido}
                          </p>
                        </div>
                        {canManageComment(comment) && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() =>
                                editComment(openCommentsFor, comment)
                              }
                              className="rounded-lg border border-[#E2E8F0] p-1.5 text-[#64748B] hover:bg-[#F8FAFC]"
                              aria-label="Editar comentario"
                            >
                              <IconEdit />
                            </button>
                            <button
                              onClick={() =>
                                deleteComment(openCommentsFor, comment)
                              }
                              className="rounded-lg border border-[#FCA5A5] p-1.5 text-[#EF4444] hover:bg-[#FEF2F2]"
                              aria-label="Eliminar comentario"
                            >
                              <IconTrash />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={commentDrafts[openCommentsFor] ?? ""}
                  onChange={(event) =>
                    setCommentDrafts((prev) => ({
                      ...prev,
                      [openCommentsFor]: event.target.value,
                    }))
                  }
                  placeholder="Escribe un comentario para el grupo..."
                  className="min-w-0 flex-1 rounded-xl border border-[#E2E8F0] px-3 py-2 font-body text-sm outline-none focus:border-[#1E6FD9]"
                />
                <button
                  onClick={() => addComment(openCommentsFor)}
                  disabled={
                    actionLoading !== null ||
                    !(commentDrafts[openCommentsFor] ?? "").trim()
                  }
                  className="rounded-xl bg-[#1E6FD9] px-4 py-2 font-body text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

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
            Esta opción excede el presupuesto disponible del grupo ($5,000 MXN).
            El voto se registra, pero conviene revisarla antes de aprobarla.
          </p>
        </div>
      )}
    </div>
  );
}
