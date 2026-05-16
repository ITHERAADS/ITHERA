import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "../../context/useAuth";
import {
  mapsService,
  type PlaceAutocompleteResult,
  type PlaceResult,
} from "../../services/maps";
import {
  budgetService,
  type BudgetCategory,
  type BudgetSplitType,
} from "../../services/budget";
import {
  documentsService,
  type TripDocumentCategory,
} from "../../services/documents";
import {
  subgroupScheduleService,
  type SubgroupMembership,
  type SubgroupSlot,
} from "../../services/subgroups";
import { ApiError } from "../../services/apiClient";
import {
  contextLinksService,
  type ContextEntityRef,
  type ContextEntitySummary,
  type ContextLink,
  type ContextLinkOptions,
} from "../../services/context-links";
import type { Group } from "../../types/groups";
import { SubgroupChatDrawer } from "../chat/SubgroupChatDrawer";
import { ExpenseDraftForm } from "../budget/ExpenseDraftForm";

interface Props {
  groupId: string | null;
  group?: Group | null;
  members?: Array<{
    usuario_id?: string | number | null;
    id?: string | number | null;
    nombre?: string | null;
    email?: string | null;
  }>;
  isAdmin: boolean;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onOpenBudget?: () => void;
  onOpenVault?: () => void;
  socket?: Socket | null;
  isSocketConnected?: boolean;
  currentUserId?: string | null;
  currentUserName?: string;
  editSlotRequest?: { slotId: number; nonce: number } | null;
  focusRequest?: {
    slotId: number;
    subgroupId?: number | null;
    nonce: number;
  } | null;
  onScheduleChanged?: (slots: SubgroupSlot[]) => void;
}

type RoutePreview = {
  routeDistanceText?: string | null;
  routeDurationText?: string | null;
  routeDistanceMeters?: number | null;
  routeDurationSeconds?: number | null;
};

type EnrichedPlaceResult = PlaceResult & RoutePreview;

type EnrichedPlaceAutocompleteResult = PlaceAutocompleteResult & RoutePreview;

type ActivityDraft = {
  query: string;
  description: string;
  timeValue: string;
  results: EnrichedPlaceResult[];
  suggestions: EnrichedPlaceAutocompleteResult[];
  showSuggestions: boolean;
  suggestionsLoading: boolean;
  selectedPlace: EnrichedPlaceResult | null;
  loading: boolean;
  selectedExpenseIds: string[];
  selectedDocumentIds: string[];
  expenseFilter: string;
  documentFilter: string;
  quickExpenseDescription: string;
  quickExpenseAmount: string;
  quickExpenseCategory: BudgetCategory;
  quickExpenseDate: string;
  quickExpensePaidBy: string;
  quickExpenseSplitType: BudgetSplitType;
  quickExpenseSplitAmounts: Record<string, string>;
  quickExpenseMemberIds: string[];
  quickDocumentFile: File | null;
  quickDocumentCategory: TripDocumentCategory;
  quickDocumentNotes: string;
};

type DraftActionModalMode = "expense" | "document" | null;

type DraftActionTab = "associate" | "create";

const EMPTY_LINK_OPTIONS: ContextLinkOptions = {
  expenses: [],
  documents: [],
  activities: [],
  subgroupActivities: [],
};

const documentCategoryLabels: Record<TripDocumentCategory, string> = {
  vuelo: "Vuelo",
  hospedaje: "Hospedaje",
  gasto: "Gasto",
  actividad: "Actividad",
  otro: "Otro",
};

const todayValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isDateBeforeToday = (dateKey?: string | null) =>
  Boolean(dateKey && dateKey < todayValue());

const isSlotInPastDay = (slot: Pick<SubgroupSlot, "starts_at">) =>
  isDateBeforeToday(toLocalInputValue(slot.starts_at).slice(0, 10));

const isSlotStillActionable = (slot: Pick<SubgroupSlot, "starts_at">) =>
  !isSlotInPastDay(slot);
const fallbackSubgroupImage =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";
const PLACE_SEARCH_RADIUS_METERS = 50000;
const LONG_ROUTE_THRESHOLD_SECONDS = 60 * 60;

function parseGoogleDurationSeconds(raw?: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Number(match[1]) : null;
}

function InlineSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <path
        d="M12 2a10 10 0 0110 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActionModal({
  open,
  title,
  subtitle,
  confirmLabel,
  confirmDisabled = false,
  confirmLoading = false,
  panelClassName = "max-w-lg",
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  panelClassName?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0820]/70 px-4"
      onClick={confirmLoading ? undefined : onClose}
    >
      <div
        className={`max-h-[84vh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <h3 className="font-heading text-lg font-bold text-[#1E0A4E]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end gap-3 border-t border-[#E2E8F0] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={confirmLoading}
            className="rounded-xl border border-[#D7DEEA] px-4 py-2.5 text-sm font-semibold text-[#3D4A5C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || confirmLoading}
            aria-busy={confirmLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLoading && <InlineSpinner size={15} />}
            {confirmLoading ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const entityKey = (entity: ContextEntityRef): string =>
  `${entity.type}:${entity.id}`;

const otherEntityForSubgroupActivity = (
  link: ContextLink,
  activityId: string,
): ContextEntitySummary | null => {
  if (
    link.entityA.type === "subgroup_activity" &&
    link.entityA.id === activityId
  )
    return link.entityB;
  if (
    link.entityB.type === "subgroup_activity" &&
    link.entityB.id === activityId
  )
    return link.entityA;
  return null;
};

const isSubgroupActivityContextType = (
  type: ContextEntityRef["type"],
): boolean => type === "expense" || type === "document";

const pickCreatedExpenseId = (
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    createdAt: string | null;
  }>,
  previousExpenseIds: Set<string>,
  expectedDescription: string,
  expectedAmount: number,
): string | null => {
  const newlyCreated = expenses.filter(
    (expense) => !previousExpenseIds.has(String(expense.id)),
  );
  const pool = newlyCreated.length > 0 ? newlyCreated : expenses;
  const candidates = pool.filter(
    (expense) =>
      expense.description === expectedDescription &&
      Number(expense.amount) === expectedAmount,
  );
  const sorted = [...(candidates.length > 0 ? candidates : pool)].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
  return sorted[0]?.id ?? null;
};

const dt = (value?: string | null) => {
  if (!value) return "Sin hora";
  const d = new Date(value);
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const slotTimestamp = (value?: string | null): number => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const slotDayKey = (value?: string | null): string =>
  toLocalInputValue(value).slice(0, 10) || "sin-fecha";

const slotDayLabel = (value?: string | null): string => {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const toLocalInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toLocalTimeValue = (value?: string | null) =>
  toLocalInputValue(value).slice(11, 16) || "12:00";

const toLocalMinuteKey = (value?: string | null) =>
  toLocalInputValue(value).slice(0, 16);

const isSameLocalDay = (first?: string | null, second?: string | null) =>
  toLocalInputValue(first).slice(0, 10) !== "" &&
  toLocalInputValue(first).slice(0, 10) ===
    toLocalInputValue(second).slice(0, 10);

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const dateKeyLabel = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const subtractThirtyMinutes = (value: string) => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const totalMinutes = hours * 60 + minutes - 30;
  if (totalMinutes < 0) return "00:00";
  const nextHours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const nextMinutes = String(totalMinutes % 60).padStart(2, "0");
  return `${nextHours}:${nextMinutes}`;
};

const isThirtyMinute = (value: string): boolean => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getMinutes() % 30 === 0 && d.getSeconds() === 0;
};

const isThirtyMinuteTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):(00|30)$/.test(value);

const splitLocalDate = (value: string): string =>
  value.includes("T") ? value.slice(0, 10) : "";

const splitLocalTime = (value: string): string => {
  const time = value.includes("T") ? value.slice(11, 16) : "";
  return isThirtyMinuteTime(time) ? time : "12:00";
};

const buildLocalDateTime = (date: string, time: string): string => {
  if (!date) return "";
  return `${date}T${isThirtyMinuteTime(time) ? time : "12:00"}`;
};

const setLocalDatePart = (
  value: string,
  currentValue: string,
  setter: (nextValue: string) => void,
) => {
  setter(value ? buildLocalDateTime(value, splitLocalTime(currentValue)) : "");
};

const setLocalTimePart = (
  value: string,
  currentValue: string,
  fallbackDate: string,
  setter: (nextValue: string) => void,
) => {
  if (!isThirtyMinuteTime(value)) return;
  const date = splitLocalDate(currentValue) || fallbackDate;
  setter(buildLocalDateTime(date, value));
};

const memberName = (membership: SubgroupMembership) =>
  membership.user?.nombre ||
  membership.usuarios?.nombre ||
  membership.user?.email ||
  membership.usuarios?.email ||
  `Usuario ${membership.user_id}`;

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "?";
};

function MemberCircles({ members }: { members: SubgroupMembership[] }) {
  if (members.length === 0) {
    return <span className="text-sm text-[#64748B]">Sin participantes</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {members.slice(0, 5).map((member) => {
          const name = memberName(member);
          return (
            <div
              key={member.id}
              title={name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#1E6FD9] text-xs font-bold text-white"
            >
              {initials(name)}
            </div>
          );
        })}
      </div>
      <span className="text-sm text-[#475569]">
        {members.length} {members.length === 1 ? "persona" : "personas"}
      </span>
    </div>
  );
}

const primaryActivity = (subgroup: SubgroupSlot["subgroups"][number]) =>
  subgroup.activities[0] ?? null;

export function SubgroupSchedulePanel({
  groupId,
  group,
  members = [],
  isAdmin,
  tripStartDate,
  tripEndDate,
  socket = null,
  isSocketConnected = false,
  currentUserId = null,
  currentUserName = "Usuario",
  editSlotRequest = null,
  focusRequest = null,
  onScheduleChanged,
}: Props) {
  const { accessToken } = useAuth();
  const [slots, setSlots] = useState<SubgroupSlot[]>([]);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);

  const [newSlotTitle, setNewSlotTitle] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [activityDraftBySlot, setActivityDraftBySlot] = useState<
    Record<number, ActivityDraft>
  >({});
  const [slotModal, setSlotModal] = useState<{
    mode: "create" | "edit";
    slotId?: number;
  } | null>(null);
  const [subgroupModal, setSubgroupModal] = useState<{
    mode: "create" | "edit";
    slotId: number;
    subgroupId?: number;
  } | null>(null);
  const [subgroupFormName, setSubgroupFormName] = useState("");
  const [subgroupFormTitle, setSubgroupFormTitle] = useState("");
  const [subgroupFormDescription, setSubgroupFormDescription] = useState("");
  const [subgroupFormLocation, setSubgroupFormLocation] = useState("");
  const [subgroupFormTime, setSubgroupFormTime] = useState("12:00");
  const [contextLinks, setContextLinks] = useState<ContextLink[]>([]);
  const [linkOptions, setLinkOptions] =
    useState<ContextLinkOptions>(EMPTY_LINK_OPTIONS);
  const [draftActionModal, setDraftActionModal] = useState<{
    slotId: number;
    mode: DraftActionModalMode;
    activityId?: number | null;
  } | null>(null);
  const [draftExpenseTab, setDraftExpenseTab] =
    useState<DraftActionTab>("associate");
  const [draftDocumentTab, setDraftDocumentTab] =
    useState<DraftActionTab>("associate");
  const [subgroupPhotoByActivityId, setSubgroupPhotoByActivityId] = useState<
    Record<number, string>
  >({});
  const [linkOptionsLoaded, setLinkOptionsLoaded] = useState(false);
  const [handledEditSlotRequestNonce, setHandledEditSlotRequestNonce] =
    useState<number | null>(null);
  const [handledFocusRequestNonce, setHandledFocusRequestNonce] = useState<
    number | null
  >(null);
  const [expandedSubgroupDay, setExpandedSubgroupDay] = useState<string | null>(
    null,
  );
  const [longRouteConfirmation, setLongRouteConfirmation] = useState<{
    slotId: number;
  } | null>(null);
  const [scheduleConflictMessage, setScheduleConflictMessage] = useState<
    string | null
  >(null);
  const didInitializeExpandedDayRef = useRef(false);
  const autocompleteBoxRef = useRef<HTMLDivElement | null>(null);
  const slotCardRefs = useRef<Record<number, HTMLElement | null>>({});
  const subgroupCardRefs = useRef<Record<string, HTMLElement | null>>({});

  const memberOptions = useMemo(
    () =>
      members
        .map((member) => {
          const id = String(member.usuario_id ?? member.id ?? "");
          return {
            id,
            label: member.nombre || member.email || `Usuario ${id}`,
          };
        })
        .filter((member) => member.id.length > 0),
    [members],
  );

  const safeMemberOptions = useMemo(() => {
    if (memberOptions.length > 0) return memberOptions;
    const fallbackId =
      currentUserId ?? (myUserId != null ? String(myUserId) : "");
    if (!fallbackId) return [];
    return [
      { id: fallbackId, label: currentUserName || `Usuario ${fallbackId}` },
    ];
  }, [currentUserId, currentUserName, memberOptions, myUserId]);

  const defaultExpensePayer = useMemo(() => {
    if (
      currentUserId &&
      safeMemberOptions.some((member) => member.id === currentUserId)
    ) {
      return currentUserId;
    }
    return safeMemberOptions[0]?.id ?? "";
  }, [currentUserId, safeMemberOptions]);

  const routeOrigin = useMemo(() => {
    if (
      group?.punto_partida_latitud != null &&
      group.punto_partida_longitud != null
    ) {
      return {
        lat: Number(group.punto_partida_latitud),
        lng: Number(group.punto_partida_longitud),
      };
    }

    if (group?.destino_latitud != null && group.destino_longitud != null) {
      return {
        lat: Number(group.destino_latitud),
        lng: Number(group.destino_longitud),
      };
    }

    return null;
  }, [
    group?.destino_latitud,
    group?.destino_longitud,
    group?.punto_partida_latitud,
    group?.punto_partida_longitud,
  ]);

  const routeOriginLabel =
    group?.punto_partida_tipo === "hotel_reservado"
      ? "tu hospedaje"
      : "el destino del viaje";

  // Chat drawer state
  const [chatSubgroup, setChatSubgroup] = useState<{
    slotId: number;
    subgroupId: number;
    name: string;
  } | null>(null);

  const loadContextLinks = useCallback(async () => {
    if (!groupId || !accessToken) {
      setContextLinks([]);
      return;
    }

    const linksResponse = await contextLinksService.list(groupId, accessToken);
    setContextLinks(linksResponse.links);
  }, [accessToken, groupId]);

  const loadLinkOptions = useCallback(
    async (force = false) => {
      if (!groupId || !accessToken) {
        setLinkOptions(EMPTY_LINK_OPTIONS);
        setLinkOptionsLoaded(false);
        return;
      }
      if (!force && linkOptionsLoaded) return;

      const optionsResponse = await contextLinksService.options(
        groupId,
        accessToken,
      );
      setLinkOptions(optionsResponse.options);
      setLinkOptionsLoaded(true);
    },
    [accessToken, groupId, linkOptionsLoaded],
  );

  useEffect(() => {
    setLinkOptions(EMPTY_LINK_OPTIONS);
    setLinkOptionsLoaded(false);
  }, [groupId]);

  const load = useCallback(async () => {
    if (!groupId || !accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const [response] = await Promise.all([
        subgroupScheduleService.getSchedule(groupId, accessToken),
        loadContextLinks(),
      ]);
      setSlots(response.slots ?? []);
      onScheduleChanged?.(response.slots ?? []);
      setMyUserId(response.myUserId ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el horario de subgrupos",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, groupId, loadContextLinks, onScheduleChanged]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket || !groupId) return;

    const handleDashboardUpdate = (payload: {
      groupId?: string | number;
      grupoId?: string | number;
      tipo?: string;
    }) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId;
      if (
        payloadGroupId !== undefined &&
        String(payloadGroupId) !== String(groupId)
      )
        return;

      const tipo = String(payload.tipo ?? "");
      if (
        tipo.startsWith("subgrupo_") ||
        tipo.startsWith("subgroup_") ||
        tipo === "documento_subido" ||
        tipo === "documento_eliminado" ||
        tipo === "gasto_creado" ||
        tipo === "gasto_actualizado" ||
        tipo === "gasto_eliminado"
      ) {
        void load();
      }
    };

    socket.on("dashboard_updated", handleDashboardUpdate);
    return () => {
      socket.off("dashboard_updated", handleDashboardUpdate);
    };
  }, [groupId, load, socket]);

  useEffect(() => {
    if (!accessToken || slots.length === 0 || group?.destino_photo_url) return;
    const missingActivities = slots
      .flatMap((slot) => slot.subgroups)
      .map((subgroup) => primaryActivity(subgroup))
      .filter((activity): activity is NonNullable<typeof activity> =>
        Boolean(
          activity &&
          activity.id != null &&
          !subgroupPhotoByActivityId[activity.id],
        ),
      );

    if (missingActivities.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missingActivities.map(async (activity) => {
        try {
          const response = await mapsService.searchPlacesByText(
            {
              textQuery: `${activity.title} ${activity.location ?? ""}`.trim(),
              latitude: group?.destino_latitud ?? undefined,
              longitude: group?.destino_longitud ?? undefined,
              radius: 7000,
              maxResultCount: 1,
            },
            accessToken,
          );
          const photoUrl = response.data?.[0]?.photoUrl ?? null;
          if (!cancelled && photoUrl) {
            setSubgroupPhotoByActivityId((prev) => ({
              ...prev,
              [activity.id]: photoUrl,
            }));
          }
        } catch {
          // optional enrichment only
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    group?.destino_latitud,
    group?.destino_longitud,
    group?.destino_photo_url,
    slots,
    subgroupPhotoByActivityId,
  ]);

  const runAction = async (
    action: () => Promise<void>,
    busyKey = "general",
  ) => {
    if (actionBusyKey) return;
    try {
      setActionBusyKey(busyKey);
      setError(null);
      await action();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setScheduleConflictMessage(
          "Ya hay una actividad en ese horario. Necesitas cambiar el horario de la otra actividad o el de esta para poder continuar.",
        );
        setError(null);
        return;
      }
      setError(
        err instanceof Error ? err.message : "No se pudo completar la accion",
      );
    } finally {
      setActionBusyKey(null);
    }
  };

  const setActivityDraft = useCallback(
    (slotId: number, patch: Partial<ActivityDraft>) => {
      setActivityDraftBySlot((prev) => ({
        ...prev,
        [slotId]: {
          query: prev[slotId]?.query ?? "",
          description: prev[slotId]?.description ?? "",
          timeValue: prev[slotId]?.timeValue ?? "12:00",
          results: prev[slotId]?.results ?? [],
          suggestions: prev[slotId]?.suggestions ?? [],
          showSuggestions: prev[slotId]?.showSuggestions ?? false,
          suggestionsLoading: prev[slotId]?.suggestionsLoading ?? false,
          selectedPlace: prev[slotId]?.selectedPlace ?? null,
          loading: prev[slotId]?.loading ?? false,
          selectedExpenseIds: prev[slotId]?.selectedExpenseIds ?? [],
          selectedDocumentIds: prev[slotId]?.selectedDocumentIds ?? [],
          expenseFilter: prev[slotId]?.expenseFilter ?? "",
          documentFilter: prev[slotId]?.documentFilter ?? "",
          quickExpenseDescription: prev[slotId]?.quickExpenseDescription ?? "",
          quickExpenseAmount: prev[slotId]?.quickExpenseAmount ?? "",
          quickExpenseCategory:
            prev[slotId]?.quickExpenseCategory ?? "actividad",
          quickExpenseDate: prev[slotId]?.quickExpenseDate ?? todayValue(),
          quickExpensePaidBy:
            prev[slotId]?.quickExpensePaidBy ?? defaultExpensePayer,
          quickExpenseSplitType:
            prev[slotId]?.quickExpenseSplitType ?? "equitativa",
          quickExpenseSplitAmounts:
            prev[slotId]?.quickExpenseSplitAmounts ?? {},
          quickExpenseMemberIds:
            prev[slotId]?.quickExpenseMemberIds ??
            safeMemberOptions.map((member) => member.id),
          quickDocumentFile: prev[slotId]?.quickDocumentFile ?? null,
          quickDocumentCategory:
            prev[slotId]?.quickDocumentCategory ?? "actividad",
          quickDocumentNotes: prev[slotId]?.quickDocumentNotes ?? "",
          ...patch,
        },
      }));
    },
    [defaultExpensePayer, safeMemberOptions],
  );

  const enrichPlaceWithRoute = useCallback(
    async (place: EnrichedPlaceResult): Promise<EnrichedPlaceResult> => {
      const enrichedPlace = { ...place };

      if (
        !accessToken ||
        !routeOrigin ||
        place.latitude == null ||
        place.longitude == null
      ) {
        return enrichedPlace;
      }

      try {
        const routeResponse = await mapsService.computeRoute(
          {
            originLat: routeOrigin.lat,
            originLng: routeOrigin.lng,
            destinationLat: place.latitude,
            destinationLng: place.longitude,
            travelMode: "DRIVE",
          },
          accessToken,
        );

        enrichedPlace.routeDistanceText =
          routeResponse.data?.distanceText ?? null;
        enrichedPlace.routeDurationText =
          routeResponse.data?.durationText ??
          routeResponse.data?.staticDurationText ??
          null;
        enrichedPlace.routeDistanceMeters =
          routeResponse.data?.distanceMeters ?? null;
        enrichedPlace.routeDurationSeconds = parseGoogleDurationSeconds(
          routeResponse.data?.duration ?? routeResponse.data?.staticDuration,
        );
      } catch {
        // La opcion puede continuar aunque la ruta no este disponible.
      }

      return enrichedPlace;
    },
    [accessToken, routeOrigin],
  );

  const buildEmptyDraft = useCallback(
    (slot?: SubgroupSlot): ActivityDraft => ({
      query: "",
      description: "",
      timeValue: toLocalTimeValue(slot?.starts_at),
      results: [],
      suggestions: [],
      showSuggestions: false,
      suggestionsLoading: false,
      selectedPlace: null,
      loading: false,
      selectedExpenseIds: [],
      selectedDocumentIds: [],
      expenseFilter: "",
      documentFilter: "",
      quickExpenseDescription: "",
      quickExpenseAmount: "",
      quickExpenseCategory: "actividad",
      quickExpenseDate: slot
        ? toLocalInputValue(slot.starts_at).slice(0, 10)
        : todayValue(),
      quickExpensePaidBy: defaultExpensePayer,
      quickExpenseSplitType: "equitativa",
      quickExpenseSplitAmounts: {},
      quickExpenseMemberIds: safeMemberOptions.map((member) => member.id),
      quickDocumentFile: null,
      quickDocumentCategory: "actividad",
      quickDocumentNotes: "",
    }),
    [defaultExpensePayer, safeMemberOptions],
  );

  const getLinksForSubgroupActivity = (activityId?: number | string | null) => {
    if (activityId == null) return [];
    const id = String(activityId);
    return contextLinks
      .map((link) => otherEntityForSubgroupActivity(link, id))
      .filter(
        (entity): entity is ContextEntitySummary =>
          entity !== null && isSubgroupActivityContextType(entity.type),
      );
  };

  const toggleDraftExpense = (slotId: number, expenseId: string) => {
    const current = activityDraftBySlot[slotId]?.selectedExpenseIds ?? [];
    setActivityDraft(slotId, {
      selectedExpenseIds: current.includes(expenseId)
        ? current.filter((id) => id !== expenseId)
        : [...current, expenseId],
    });
  };

  const toggleDraftDocument = (slotId: number, documentId: string) => {
    const current = activityDraftBySlot[slotId]?.selectedDocumentIds ?? [];
    setActivityDraft(slotId, {
      selectedDocumentIds: current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    });
  };

  const toggleDraftExpenseMember = (slotId: number, memberId: string) => {
    const draft = activityDraftBySlot[slotId];
    const currentIds =
      draft?.quickExpenseMemberIds ??
      safeMemberOptions.map((member) => member.id);
    const currentPayer = draft?.quickExpensePaidBy ?? defaultExpensePayer;
    const next = currentIds.includes(memberId)
      ? currentIds.filter((id) => id !== memberId)
      : [...currentIds, memberId];
    if (next.length === 0) return;
    setActivityDraft(slotId, {
      quickExpenseMemberIds: next,
      quickExpensePaidBy: next.includes(currentPayer)
        ? currentPayer
        : (next[0] ?? ""),
    });
  };

  const setDraftExpenseSplitAmount = (
    slotId: number,
    memberId: string,
    value: string,
  ) => {
    const draft = activityDraftBySlot[slotId];
    setActivityDraft(slotId, {
      quickExpenseSplitAmounts: {
        ...(draft?.quickExpenseSplitAmounts ?? {}),
        [memberId]: value,
      },
    });
  };

  const getDraftExpenseSplitError = (draft?: ActivityDraft) => {
    const totalAmount = parseFloat(draft?.quickExpenseAmount ?? "") || 0;
    if (
      (draft?.quickExpenseSplitType ?? "equitativa") !== "personalizada" ||
      totalAmount <= 0
    )
      return null;
    const selectedIds =
      draft?.quickExpenseMemberIds ??
      safeMemberOptions.map((member) => member.id);
    const splitSum = safeMemberOptions
      .filter((member) => selectedIds.includes(member.id))
      .reduce(
        (sum, member) =>
          sum +
          (parseFloat(draft?.quickExpenseSplitAmounts?.[member.id] ?? "0") ||
            0),
        0,
      );
    return Math.abs(splitSum - totalAmount) > 0.01
      ? "La division personalizada debe sumar el monto total."
      : null;
  };

  const findSubgroupActivityTimeConflict = (
    slot: SubgroupSlot,
    startsAt: string | Date | null,
    excludeActivityId?: number | string | null,
  ) => {
    const candidateKey = startsAt
      ? toLocalMinuteKey(
          startsAt instanceof Date ? startsAt.toISOString() : startsAt,
        )
      : "";
    if (!candidateKey) return null;

    for (const subgroup of slot.subgroups) {
      for (const activity of subgroup.activities) {
        if (
          excludeActivityId != null &&
          String(activity.id) === String(excludeActivityId)
        )
          continue;
        if (toLocalMinuteKey(activity.starts_at) === candidateKey)
          return activity;
      }
    }

    return null;
  };

  const closeDraftActionModal = () => setDraftActionModal(null);

  const openDraftActionModal = (
    slotId: number,
    mode: Exclude<DraftActionModalMode, null>,
    activityId?: number | null,
  ) => {
    void loadLinkOptions(true);
    const linked =
      activityId != null ? getLinksForSubgroupActivity(activityId) : [];
    const slot = slots.find((item) => item.id === slotId);
    setActivityDraft(slotId, {
      selectedExpenseIds:
        activityId != null
          ? linked
              .filter((entity) => entity.type === "expense")
              .map((entity) => entity.id)
          : [],
      selectedDocumentIds:
        activityId != null
          ? linked
              .filter((entity) => entity.type === "document")
              .map((entity) => entity.id)
          : [],
      expenseFilter: "",
      documentFilter: "",
      quickExpenseDescription: "",
      quickExpenseAmount: "",
      quickExpenseCategory: "actividad",
      quickExpenseDate: slot
        ? toLocalInputValue(slot.starts_at).slice(0, 10)
        : todayValue(),
      quickExpensePaidBy: defaultExpensePayer,
      quickExpenseSplitType: "equitativa",
      quickExpenseSplitAmounts: {},
      quickExpenseMemberIds: safeMemberOptions.map((member) => member.id),
      quickDocumentFile: null,
      quickDocumentCategory: "actividad",
      quickDocumentNotes: "",
    });
    setDraftActionModal({ slotId, mode, activityId });
  };

  const openCreateSlotModal = () => {
    if (tripEndDate && tripEndDate < todayValue()) {
      setError(
        "El viaje ya no tiene dias disponibles para crear horarios de subgrupos.",
      );
      return;
    }
    setNewSlotTitle("");
    setNewSlotStart("");
    setNewSlotEnd("");
    setSlotModal({ mode: "create" });
  };

  const openEditSlotModal = (slot: SubgroupSlot) => {
    if (isSlotInPastDay(slot)) {
      setError("Este dia ya paso. El horario solo puede consultarse.");
      return;
    }
    setNewSlotTitle(slot.title);
    setNewSlotStart(toLocalInputValue(slot.starts_at));
    setNewSlotEnd(toLocalInputValue(slot.ends_at));
    setSlotModal({ mode: "edit", slotId: slot.id });
  };

  useEffect(() => {
    if (!editSlotRequest) return;
    if (handledEditSlotRequestNonce === editSlotRequest.nonce) return;
    const slot = slots.find((item) => item.id === editSlotRequest.slotId);
    if (!slot) return;
    openEditSlotModal(slot);
    setHandledEditSlotRequestNonce(editSlotRequest.nonce);
  }, [editSlotRequest, handledEditSlotRequestNonce, slots]);

  useEffect(() => {
    if (!focusRequest) return;
    if (handledFocusRequestNonce === focusRequest.nonce) return;

    const slot = slots.find((item) => item.id === focusRequest.slotId);
    if (!slot) return;

    const dayKey = slotDayKey(slot.starts_at);
    setExpandedSubgroupDay(dayKey);
    setHandledFocusRequestNonce(focusRequest.nonce);

    const highlightElement = (element: HTMLElement) => {
      const originalOutline = element.style.outline;
      const originalOutlineOffset = element.style.outlineOffset;
      const originalTransition = element.style.transition;
      element.style.transition = "outline-color 220ms ease";
      element.style.outline = "2px solid #1E6FD9";
      element.style.outlineOffset = "3px";
      window.setTimeout(() => {
        element.style.outline = originalOutline;
        element.style.outlineOffset = originalOutlineOffset;
        element.style.transition = originalTransition;
      }, 1200);
    };

    const subgroupId = focusRequest.subgroupId ?? null;
    window.setTimeout(() => {
      const subgroupKey =
        subgroupId != null ? `${slot.id}:${subgroupId}` : null;
      const target =
        (subgroupKey ? subgroupCardRefs.current[subgroupKey] : null) ??
        slotCardRefs.current[slot.id] ??
        null;
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightElement(target);
    }, 120);
  }, [focusRequest, handledFocusRequestNonce, slots]);

  const closeSlotModal = () => setSlotModal(null);

  const openCreateSubgroupModal = (slot: SubgroupSlot) => {
    if (isSlotInPastDay(slot)) {
      setError(
        "Este dia ya paso. Solo puedes consultar los planes de subgrupo registrados.",
      );
      return;
    }
    setSubgroupModal({ mode: "create", slotId: slot.id });
    setSubgroupFormName("");
  };

  const openEditSubgroupModal = (
    slot: SubgroupSlot,
    subgroup: SubgroupSlot["subgroups"][number],
  ) => {
    if (isSlotInPastDay(slot)) {
      setError("Este dia ya paso. El plan de subgrupo solo puede consultarse.");
      return;
    }
    const details = primaryActivity(subgroup);
    setSubgroupModal({
      mode: "edit",
      slotId: slot.id,
      subgroupId: subgroup.id,
    });
    setSubgroupFormName(subgroup.name);
    setSubgroupFormTitle(details?.title ?? subgroup.name);
    setSubgroupFormDescription(details?.description ?? "");
    setSubgroupFormLocation(details?.location ?? "");
    setSubgroupFormTime(toLocalTimeValue(details?.starts_at ?? slot.starts_at));
  };

  const closeSubgroupModal = () => {
    setLongRouteConfirmation(null);
    setSubgroupModal(null);
  };

  const syncDraftLinksForActivity = async (
    activityId: number,
    type: "expense" | "document",
    desiredIds: string[],
  ) => {
    if (!groupId || !accessToken) return;

    const currentResponse = await contextLinksService.list(
      groupId,
      accessToken,
      {
        type: "subgroup_activity",
        id: String(activityId),
      },
    );

    const currentRelevant = currentResponse.links
      .map((link) => ({
        link,
        entity: otherEntityForSubgroupActivity(link, String(activityId)),
      }))
      .filter(
        (item): item is { link: ContextLink; entity: ContextEntitySummary } =>
          item.entity !== null && item.entity.type === type,
      );

    const currentIds = new Set(currentRelevant.map((item) => item.entity.id));
    const desiredIdSet = new Set(desiredIds);

    await Promise.all([
      ...currentRelevant
        .filter((item) => !desiredIdSet.has(item.entity.id))
        .map((item) =>
          contextLinksService.remove(groupId, item.link.id, accessToken),
        ),
      ...desiredIds
        .filter((id) => !currentIds.has(id))
        .map((id) =>
          contextLinksService.create(
            groupId,
            {
              source: { type: "subgroup_activity", id: String(activityId) },
              target: { type, id },
            },
            accessToken,
          ),
        ),
    ]);
  };

  const createExpenseFromDraft = async (
    slotId: number,
  ): Promise<string | null> => {
    const draft = activityDraftBySlot[slotId];
    const shouldCreateExpense =
      (draft?.quickExpenseAmount ?? "").trim().length > 0 ||
      (draft?.quickExpenseDescription ?? "").trim().length > 0;
    const amount = Number(draft?.quickExpenseAmount ?? "");
    if (!shouldCreateExpense) {
      setError("Captura al menos el monto o la descripcion del gasto.");
      return null;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("El monto del gasto rapido debe ser mayor a 0.");
      return null;
    }
    if (!(draft?.quickExpenseDescription ?? "").trim()) {
      setError("La descripcion del gasto es obligatoria.");
      return null;
    }
    if (!(draft?.quickExpensePaidBy ?? "").trim()) {
      setError("Selecciona quien pagara el gasto.");
      return null;
    }
    if ((draft?.quickExpenseMemberIds ?? []).length === 0) {
      setError("Selecciona al menos una persona para el gasto.");
      return null;
    }
    const splitError = getDraftExpenseSplitError(draft);
    if (splitError) {
      setError(splitError);
      return null;
    }
    setError(null);
    if (!groupId || !accessToken) return null;
    const previousExpenseIds = new Set(linkOptions.expenses.map((item) => item.id));

    const budgetResponse = await budgetService.createExpense(
      groupId,
      {
        paid_by_user_id: draft.quickExpensePaidBy,
        amount,
        description: draft.quickExpenseDescription.trim(),
        category: draft.quickExpenseCategory,
        split_type: draft.quickExpenseSplitType,
        member_ids: draft.quickExpenseMemberIds,
        split_amounts:
          draft.quickExpenseSplitType === "personalizada"
            ? Object.fromEntries(
                draft.quickExpenseMemberIds.map((memberId) => [
                  memberId,
                  parseFloat(draft.quickExpenseSplitAmounts[memberId] ?? "0") ||
                    0,
                ]),
              )
            : undefined,
        expense_date: draft.quickExpenseDate || todayValue(),
      },
      accessToken,
    );

    return pickCreatedExpenseId(
      budgetResponse.expenses,
      previousExpenseIds,
      draft.quickExpenseDescription.trim(),
      amount,
    );
  };

  const confirmDraftExpense = async (slotId: number) => {
    const createdExpenseId = await createExpenseFromDraft(slotId);
    if (createdExpenseId == null) return;

    if (draftActionModal?.activityId != null) {
      await contextLinksService.create(
        groupId!,
        {
          source: {
            type: "subgroup_activity",
            id: String(draftActionModal.activityId),
          },
          target: { type: "expense", id: createdExpenseId },
        },
        accessToken!,
      );
      await Promise.all([loadContextLinks(), loadLinkOptions(true)]);
    }

    closeDraftActionModal();
  };

  const createDocumentFromDraft = async (
    slotId: number,
  ): Promise<string | null> => {
    const draft = activityDraftBySlot[slotId];
    if (!draft?.quickDocumentFile) {
      setError("Selecciona un archivo para el documento.");
      return null;
    }
    if (!(draft.quickDocumentNotes ?? "").trim()) {
      setError("La nota del documento es obligatoria.");
      return null;
    }
    setError(null);
    if (!groupId || !accessToken) return null;

    const document = await documentsService.upload(
      groupId,
      draft.quickDocumentFile,
      draft.quickDocumentCategory,
      {
        notes: draft.quickDocumentNotes.trim() || null,
      },
      accessToken,
    );
    return document.id;
  };

  const confirmDraftDocument = async (slotId: number) => {
    const createdDocumentId = await createDocumentFromDraft(slotId);
    if (createdDocumentId == null) return;

    if (draftActionModal?.activityId != null) {
      await contextLinksService.create(
        groupId!,
        {
          source: {
            type: "subgroup_activity",
            id: String(draftActionModal.activityId),
          },
          target: { type: "document", id: createdDocumentId },
        },
        accessToken!,
      );
      await Promise.all([loadContextLinks(), loadLinkOptions(true)]);
    }

    closeDraftActionModal();
  };

  const effectiveMinDate =
    tripStartDate && tripStartDate > todayValue()
      ? tripStartDate
      : todayValue();
  const slotTimeValidationMessage = useMemo(() => {
    if (!slotModal || !newSlotStart || !newSlotEnd) return null;
    const start = new Date(newSlotStart);
    const end = new Date(newSlotEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return "Ingresa un rango de fecha y hora valido.";
    if (end <= start)
      return "La hora de fin debe ser posterior a la hora de inicio.";
    if (!isThirtyMinute(newSlotStart) || !isThirtyMinute(newSlotEnd))
      return "Usa horas cerradas: los minutos solo pueden ser 00 o 30.";
    if (tripStartDate && newSlotStart.slice(0, 10) < tripStartDate)
      return `La hora de inicio no puede ser menor al inicio del viaje (${tripStartDate}).`;
    if (isDateBeforeToday(newSlotStart.slice(0, 10)))
      return "No puedes crear o modificar horarios en dias anteriores al actual.";
    if (tripEndDate && newSlotEnd.slice(0, 10) > tripEndDate)
      return `La hora de fin no puede ser mayor al fin del viaje (${tripEndDate}).`;
    return null;
  }, [newSlotEnd, newSlotStart, slotModal, tripEndDate, tripStartDate]);

  const onCreateSlot = async () => {
    if (
      !groupId ||
      !accessToken ||
      !newSlotTitle.trim() ||
      !newSlotStart ||
      !newSlotEnd
    )
      return;
    const start = new Date(newSlotStart);
    const end = new Date(newSlotEnd);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      setError("Rango de fecha invalido para el horario");
      return;
    }
    if (!isThirtyMinute(newSlotStart) || !isThirtyMinute(newSlotEnd)) {
      setError(
        "Las horas deben ser cerradas: los minutos solo pueden ser 00 o 30",
      );
      return;
    }
    if (tripStartDate && newSlotStart.slice(0, 10) < tripStartDate) {
      setError(
        `La hora de inicio no puede ser menor al inicio del viaje (${tripStartDate})`,
      );
      return;
    }
    if (isDateBeforeToday(newSlotStart.slice(0, 10))) {
      setError("No puedes crear horarios en dias anteriores al actual.");
      return;
    }
    if (tripEndDate && newSlotEnd.slice(0, 10) > tripEndDate) {
      setError(
        `La hora de fin no puede ser mayor al fin del viaje (${tripEndDate})`,
      );
      return;
    }

    await runAction(async () => {
      await subgroupScheduleService.createSlot(
        groupId,
        {
          title: newSlotTitle.trim(),
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        },
        accessToken,
      );
      setNewSlotTitle("");
      setNewSlotStart("");
      setNewSlotEnd("");
      setSlotModal(null);
      await load();
    }, "slot");
  };

  const submitSlotModal = async () => {
    if (
      !groupId ||
      !accessToken ||
      !newSlotTitle.trim() ||
      !newSlotStart ||
      !newSlotEnd
    ) {
      setError("Completa nombre, inicio y fin del horario.");
      return;
    }

    const start = new Date(newSlotStart);
    const end = new Date(newSlotEnd);
    if (slotTimeValidationMessage) {
      setError(slotTimeValidationMessage);
      return;
    }

    if (slotModal?.mode === "edit" && slotModal.slotId) {
      await runAction(async () => {
        await subgroupScheduleService.updateSlot(
          groupId,
          slotModal.slotId!,
          {
            title: newSlotTitle.trim(),
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
          },
          accessToken,
        );
        setSlotModal(null);
        await load();
      }, "slot");
      return;
    }

    await onCreateSlot();
  };

  const onCreateSubgroup = async (
    slot: SubgroupSlot,
    skipLongRouteConfirmation = false,
  ) => {
    if (!groupId || !accessToken) return;
    if (isSlotInPastDay(slot)) {
      setError(
        "Este dia ya paso. Solo puedes consultar los subgrupos registrados.",
      );
      return;
    }
    const slotDate = toLocalInputValue(slot.starts_at).slice(0, 10);
    const draft = activityDraftBySlot[slot.id] ?? {
      query: "",
      description: "",
      timeValue: toLocalTimeValue(slot.starts_at),
      results: [],
      suggestions: [],
      showSuggestions: false,
      suggestionsLoading: false,
      selectedPlace: null,
      loading: false,
      selectedExpenseIds: [],
      selectedDocumentIds: [],
      expenseFilter: "",
      documentFilter: "",
      quickExpenseDescription: "",
      quickExpenseAmount: "",
      quickExpenseCategory: "actividad",
      quickExpenseDate: slotDate,
      quickExpensePaidBy: defaultExpensePayer,
      quickExpenseSplitType: "equitativa",
      quickExpenseSplitAmounts: {},
      quickExpenseMemberIds: safeMemberOptions.map((member) => member.id),
      quickDocumentFile: null,
      quickDocumentCategory: "actividad",
      quickDocumentNotes: "",
    };
    const selectedPlace = draft.selectedPlace;
    if (!selectedPlace) {
      setError("Selecciona un lugar para crear la actividad.");
      return;
    }
    if (
      selectedPlace.routeDurationSeconds != null &&
      selectedPlace.routeDurationSeconds > LONG_ROUTE_THRESHOLD_SECONDS &&
      !skipLongRouteConfirmation
    ) {
      setLongRouteConfirmation({ slotId: slot.id });
      return;
    }
    const title = selectedPlace.name || draft.query.trim();
    if (!title) return;
    if (!isThirtyMinuteTime(draft.timeValue)) {
      setError(
        "La hora estimada debe ser un multiplo exacto de 30 minutos (00 o 30).",
      );
      return;
    }
    const startsAt = new Date(`${slotDate}T${draft.timeValue}:00`);
    const slotStart = new Date(slot.starts_at);
    const slotEnd = new Date(slot.ends_at);
    if (
      Number.isNaN(startsAt.getTime()) ||
      startsAt < slotStart ||
      startsAt >= slotEnd
    ) {
      setError(
        "La hora estimada debe estar dentro del horario del admin y antes de la hora de termino",
      );
      return;
    }
    const timeConflict = findSubgroupActivityTimeConflict(slot, startsAt);
    if (timeConflict) {
      setScheduleConflictMessage(
        "Ya hay una actividad en ese horario. Necesitas cambiar el horario de la otra actividad o el de esta para poder continuar.",
      );
      setError(null);
      return;
    }
    if (draft.quickDocumentFile && !draft.quickDocumentNotes.trim()) {
      setError(
        "La nota del documento es obligatoria para subirlo a la boveda.",
      );
      return;
    }

    await runAction(async () => {
      const response = await subgroupScheduleService.createSubgroup(
        groupId,
        slot.id,
        {
          name: title,
          description: draft.description.trim() || null,
        },
        accessToken,
      );
      const createdActivity =
        await subgroupScheduleService.createSubgroupActivity(
          groupId,
          slot.id,
          response.subgroup.id,
          {
            title,
            description: draft.description.trim() || null,
            location: selectedPlace.formattedAddress || null,
            starts_at: startsAt.toISOString(),
          },
          accessToken,
        );
      const shouldCreateExpense =
        draft.quickExpenseAmount.trim().length > 0 ||
        draft.quickExpenseDescription.trim().length > 0;
      const quickExpenseValue = Number(draft.quickExpenseAmount);
      const payerId =
        draft.quickExpensePaidBy ||
        currentUserId ||
        (myUserId != null ? String(myUserId) : null);

      if (shouldCreateExpense) {
        if (!payerId)
          throw new Error(
            "No se encontro tu usuario para registrar el gasto rapido.",
          );
        if (!Number.isFinite(quickExpenseValue) || quickExpenseValue <= 0) {
          throw new Error("El monto del gasto rapido debe ser mayor a 0.");
        }
        if (!draft.quickExpenseDescription.trim()) {
          throw new Error("La descripcion del gasto es obligatoria.");
        }
        if ((draft.quickExpenseMemberIds ?? []).length === 0) {
          throw new Error("Selecciona al menos una persona para el gasto.");
        }
        const splitError = getDraftExpenseSplitError(draft);
        if (splitError) throw new Error(splitError);
      }

      const createdExpenseId =
        shouldCreateExpense && payerId
          ? await budgetService
              .createExpense(
                groupId,
                {
                  paid_by_user_id: payerId,
                  amount: quickExpenseValue,
                  description: draft.quickExpenseDescription.trim(),
                  category: draft.quickExpenseCategory,
                  split_type: draft.quickExpenseSplitType,
                  member_ids: draft.quickExpenseMemberIds,
                  split_amounts:
                    draft.quickExpenseSplitType === "personalizada"
                      ? Object.fromEntries(
                          draft.quickExpenseMemberIds.map((memberId) => [
                            memberId,
                            parseFloat(
                              draft.quickExpenseSplitAmounts[memberId] ?? "0",
                            ) || 0,
                          ]),
                        )
                      : undefined,
                  expense_date: draft.quickExpenseDate || slotDate,
                },
                accessToken,
              )
              .then((budgetResponse) => {
                const previousExpenseIds = new Set(
                  linkOptions.expenses.map((item) => item.id),
                );
                return pickCreatedExpenseId(
                  budgetResponse.expenses,
                  previousExpenseIds,
                  draft.quickExpenseDescription.trim(),
                  quickExpenseValue,
                );
              })
          : null;

      const createdDocumentId = draft.quickDocumentFile
        ? await documentsService
            .upload(
              groupId,
              draft.quickDocumentFile,
              draft.quickDocumentCategory,
              {
                notes: draft.quickDocumentNotes.trim() || null,
              },
              accessToken,
            )
            .then((document) => document.id)
        : null;

      await Promise.all([
        ...(draft.selectedExpenseIds ?? []).map((id) =>
          contextLinksService.create(
            groupId,
            {
              source: {
                type: "subgroup_activity",
                id: String(createdActivity.activity.id),
              },
              target: { type: "expense", id },
            },
            accessToken,
          ),
        ),
        ...(createdExpenseId
          ? [
              contextLinksService.create(
                groupId,
                {
                  source: {
                    type: "subgroup_activity",
                    id: String(createdActivity.activity.id),
                  },
                  target: { type: "expense", id: createdExpenseId },
                },
                accessToken,
              ),
            ]
          : []),
        ...(draft.selectedDocumentIds ?? []).map((id) =>
          contextLinksService.create(
            groupId,
            {
              source: {
                type: "subgroup_activity",
                id: String(createdActivity.activity.id),
              },
              target: { type: "document", id },
            },
            accessToken,
          ),
        ),
        ...(createdDocumentId
          ? [
              contextLinksService.create(
                groupId,
                {
                  source: {
                    type: "subgroup_activity",
                    id: String(createdActivity.activity.id),
                  },
                  target: { type: "document", id: createdDocumentId },
                },
                accessToken,
              ),
            ]
          : []),
      ]);
      setActivityDraftBySlot((prev) => ({
        ...prev,
        [slot.id]: {
          query: "",
          description: "",
          timeValue: toLocalTimeValue(slot.starts_at),
          results: [],
          suggestions: [],
          showSuggestions: false,
          suggestionsLoading: false,
          selectedPlace: null,
          loading: false,
          selectedExpenseIds: [],
          selectedDocumentIds: [],
          expenseFilter: "",
          documentFilter: "",
          quickExpenseDescription: "",
          quickExpenseAmount: "",
          quickExpenseCategory: "actividad",
          quickExpenseDate: slotDate,
          quickExpensePaidBy: defaultExpensePayer,
          quickExpenseSplitType: "equitativa",
          quickExpenseSplitAmounts: {},
          quickExpenseMemberIds: safeMemberOptions.map((member) => member.id),
          quickDocumentFile: null,
          quickDocumentCategory: "actividad",
          quickDocumentNotes: "",
        },
      }));
      setLongRouteConfirmation(null);
      setSubgroupModal(null);
      await load();
    }, `subgroup-create:${slot.id}`);
  };

  const onSearchPlace = async (slotId: number) => {
    if (!accessToken) {
      setError("Tu sesion expiro. Vuelve a iniciar sesion.");
      return;
    }
    const draft = activityDraftBySlot[slotId] ?? {
      query: "",
      description: "",
      timeValue: "12:00",
      results: [],
      suggestions: [],
      showSuggestions: false,
      suggestionsLoading: false,
      selectedPlace: null,
      loading: false,
      selectedExpenseIds: [],
      selectedDocumentIds: [],
      documentFilter: "",
      quickExpenseDescription: "",
      quickExpenseAmount: "",
      quickExpenseCategory: "actividad",
      quickDocumentFile: null,
      quickDocumentCategory: "actividad",
      quickDocumentNotes: "",
    };
    if (!draft.query.trim()) {
      setError("Escribe una actividad o lugar para buscar.");
      return;
    }

    try {
      setError(null);
      setActivityDraft(slotId, {
        loading: true,
        selectedPlace: null,
        results: [],
        suggestions: [],
        showSuggestions: false,
      });
      const response = await mapsService.searchPlacesByText(
        {
          textQuery: draft.query.trim(),
          latitude: routeOrigin?.lat,
          longitude: routeOrigin?.lng,
          radius: PLACE_SEARCH_RADIUS_METERS,
          maxResultCount: 10,
        },
        accessToken,
      );
      const results: EnrichedPlaceResult[] = routeOrigin
        ? await Promise.all(
            (response.data ?? []).map((place) => enrichPlaceWithRoute(place)),
          )
        : (response.data ?? []);
      results.sort(
        (left, right) =>
          (left.routeDistanceMeters ?? Infinity) -
          (right.routeDistanceMeters ?? Infinity),
      );
      setActivityDraft(slotId, { results, loading: false });
    } catch (err) {
      setActivityDraft(slotId, { loading: false });
      setError(
        err instanceof Error ? err.message : "No se pudieron buscar lugares.",
      );
    }
  };

  const onSelectSuggestion = async (
    slotId: number,
    suggestion: PlaceAutocompleteResult,
  ) => {
    if (!accessToken) {
      setError("Tu sesion expiro. Vuelve a iniciar sesion.");
      return;
    }

    try {
      setError(null);
      setActivityDraft(slotId, {
        loading: true,
        suggestions: [],
        showSuggestions: false,
        results: [],
        selectedPlace: null,
      });

      const response = await mapsService.getPlaceDetails(
        suggestion.placeId,
        accessToken,
      );
      const place = response.data;
      if (!place) {
        setError("No se pudo cargar el detalle de ese lugar.");
        setActivityDraft(slotId, { loading: false });
        return;
      }

      const enrichedPlace = await enrichPlaceWithRoute(place);
      setActivityDraft(slotId, {
        query:
          enrichedPlace.name || suggestion.mainText || suggestion.description,
        selectedPlace: enrichedPlace,
        loading: false,
      });
    } catch (err) {
      setActivityDraft(slotId, { loading: false });
      setError(
        err instanceof Error ? err.message : "No se pudo seleccionar el lugar.",
      );
    }
  };

  const onDeleteSlot = async (slotId: number) => {
    if (!groupId || !accessToken) return;
    if (!window.confirm("Eliminar este horario y todo su contenido?")) return;
    await runAction(async () => {
      await subgroupScheduleService.deleteSlot(groupId, slotId, accessToken);
      await load();
    }, `slot-delete:${slotId}`);
  };

  const onJoin = async (slotId: number, subgroupId: number | null) => {
    if (!groupId || !accessToken) return;
    await runAction(
      async () => {
        await subgroupScheduleService.joinSubgroup(
          groupId,
          slotId,
          subgroupId,
          accessToken,
        );
        await load();
      },
      `join:${slotId}:${subgroupId ?? "free"}`,
    );
  };

  const onDeleteActivity = async (slotId: number, activityId: number) => {
    if (!groupId || !accessToken) return;
    await runAction(async () => {
      await subgroupScheduleService.deleteSubgroupActivity(
        groupId,
        slotId,
        activityId,
        accessToken,
      );
      await load();
    }, `activity-delete:${slotId}:${activityId}`);
  };

  const submitSubgroupEdit = async () => {
    if (
      !groupId ||
      !accessToken ||
      !subgroupModal ||
      subgroupModal.mode !== "edit" ||
      !subgroupModal.subgroupId
    )
      return;
    if (!subgroupFormName.trim()) {
      setError("El nombre del subgrupo es obligatorio.");
      return;
    }

    const editingSlotId = subgroupModal.slotId;
    const editingSubgroupId = subgroupModal.subgroupId;
    const slot = slots.find((item) => item.id === editingSlotId);
    const subgroup = slot?.subgroups.find(
      (item) => item.id === editingSubgroupId,
    );
    const details = subgroup ? primaryActivity(subgroup) : null;
    const slotDate = slot ? toLocalInputValue(slot.starts_at).slice(0, 10) : "";
    const startsAt = slotDate
      ? new Date(`${slotDate}T${subgroupFormTime || "12:00"}:00`)
      : null;
    if (slot && startsAt) {
      const timeConflict = findSubgroupActivityTimeConflict(
        slot,
        startsAt,
        details?.id ?? null,
      );
      if (timeConflict) {
        setScheduleConflictMessage(
          "Ya hay una actividad en ese horario. Necesitas cambiar el horario de la otra actividad o el de esta para poder continuar.",
        );
        setError(null);
        return;
      }
    }

    await runAction(async () => {
      await subgroupScheduleService.updateSubgroup(
        groupId,
        editingSlotId,
        editingSubgroupId,
        {
          name: subgroupFormName.trim(),
        },
        accessToken,
      );

      if (details?.id != null) {
        await subgroupScheduleService.updateSubgroupActivity(
          groupId,
          editingSlotId,
          details.id,
          {
            title: subgroupFormTitle.trim() || subgroupFormName.trim(),
            description: subgroupFormDescription.trim() || null,
            location: subgroupFormLocation.trim() || null,
            starts_at: startsAt ? startsAt.toISOString() : null,
          },
          accessToken,
        );
      }

      setSubgroupModal(null);
      await load();
    }, `subgroup-edit:${editingSlotId}:${editingSubgroupId}`);
  };

  const onDeleteSubgroup = async (slotId: number, subgroupId: number) => {
    if (!groupId || !accessToken) return;
    if (!window.confirm("Eliminar esta actividad de subgrupo?")) return;
    await runAction(async () => {
      await subgroupScheduleService.deleteSubgroup(
        groupId,
        slotId,
        subgroupId,
        accessToken,
      );
      await load();
    }, `subgroup-delete:${slotId}:${subgroupId}`);
  };

  const modalSlotId = draftActionModal?.slotId ?? null;
  const modalDraft =
    modalSlotId != null ? activityDraftBySlot[modalSlotId] : null;
  const slotModalSaving = actionBusyKey === "slot";
  const subgroupCreateSaving =
    subgroupModal?.mode === "create" &&
    actionBusyKey === `subgroup-create:${subgroupModal.slotId}`;
  const subgroupEditSaving =
    subgroupModal?.mode === "edit" &&
    actionBusyKey ===
      `subgroup-edit:${subgroupModal.slotId}:${subgroupModal.subgroupId ?? "new"}`;
  const subgroupModalSlot = subgroupModal
    ? (slots.find((slot) => slot.id === subgroupModal.slotId) ?? null)
    : null;
  const subgroupModalDraft =
    subgroupModal?.mode === "create" && subgroupModalSlot
      ? (activityDraftBySlot[subgroupModal.slotId] ??
        buildEmptyDraft(subgroupModalSlot))
      : null;
  const subgroupCreateTimeMin =
    subgroupModal?.mode === "create" && subgroupModalSlot
      ? toLocalTimeValue(subgroupModalSlot.starts_at)
      : undefined;
  const subgroupCreateTimeMax =
    subgroupModal?.mode === "create" && subgroupModalSlot
      ? subtractThirtyMinutes(toLocalTimeValue(subgroupModalSlot.ends_at))
      : undefined;
  const subgroupCreateUsesSingleDayWindow =
    subgroupModal?.mode === "create" && subgroupModalSlot
      ? isSameLocalDay(subgroupModalSlot.starts_at, subgroupModalSlot.ends_at)
      : false;
  const subgroupModalEditSubgroup =
    subgroupModal?.mode === "edit" && subgroupModalSlot
      ? (subgroupModalSlot.subgroups.find(
          (item) => item.id === subgroupModal.subgroupId,
        ) ?? null)
      : null;
  const subgroupModalEditActivity = subgroupModalEditSubgroup
    ? primaryActivity(subgroupModalEditSubgroup)
    : null;
  const subgroupModalEditLinks =
    subgroupModalEditActivity?.id != null
      ? getLinksForSubgroupActivity(subgroupModalEditActivity.id)
      : [];

  useEffect(() => {
    if (subgroupModal?.mode !== "create" || !subgroupModalSlot || !accessToken)
      return;

    const slotId = subgroupModal.slotId;
    const draft = subgroupModalDraft ?? buildEmptyDraft(subgroupModalSlot);
    const trimmedQuery = draft.query.trim();
    const selectedName = draft.selectedPlace?.name?.trim();

    if (
      trimmedQuery.length < 3 ||
      (selectedName && trimmedQuery === selectedName)
    ) {
      setActivityDraft(slotId, {
        suggestions: [],
        showSuggestions: false,
        suggestionsLoading: false,
      });
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setActivityDraft(slotId, { suggestionsLoading: true });
        const response = await mapsService.autocompletePlaces(
          trimmedQuery,
          accessToken,
          {
            latitude: routeOrigin?.lat,
            longitude: routeOrigin?.lng,
            radius: PLACE_SEARCH_RADIUS_METERS,
          },
        );
        const rawSuggestions = response.data ?? [];
        const nextSuggestions: EnrichedPlaceAutocompleteResult[] = routeOrigin
          ? await Promise.all(
              rawSuggestions.slice(0, 6).map(async (suggestion) => {
                try {
                  const detailResponse = await mapsService.getPlaceDetails(
                    suggestion.placeId,
                    accessToken,
                  );
                  const place = detailResponse.data;
                  if (!place) return suggestion;
                  const enrichedPlace = await enrichPlaceWithRoute(place);
                  return {
                    ...suggestion,
                    routeDistanceText: enrichedPlace.routeDistanceText ?? null,
                    routeDurationText: enrichedPlace.routeDurationText ?? null,
                    routeDistanceMeters:
                      enrichedPlace.routeDistanceMeters ?? null,
                    routeDurationSeconds:
                      enrichedPlace.routeDurationSeconds ?? null,
                  };
                } catch {
                  return suggestion;
                }
              }),
            )
          : rawSuggestions;
        if (cancelled) return;
        setActivityDraft(slotId, {
          suggestions: nextSuggestions,
          showSuggestions: nextSuggestions.length > 0,
          suggestionsLoading: false,
        });
      } catch {
        if (cancelled) return;
        setActivityDraft(slotId, {
          suggestions: [],
          showSuggestions: false,
          suggestionsLoading: false,
        });
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    accessToken,
    buildEmptyDraft,
    routeOrigin,
    enrichPlaceWithRoute,
    setActivityDraft,
    subgroupModal?.mode,
    subgroupModal?.slotId,
    subgroupModalDraft,
    subgroupModalSlot,
  ]);

  const subgroupDayGroups = useMemo(() => {
    const sorted = [...slots].sort((left, right) => {
      const diff =
        slotTimestamp(left.starts_at) - slotTimestamp(right.starts_at);
      if (diff !== 0) return diff;
      return left.title.localeCompare(right.title, "es");
    });

    const slotsByDay = sorted.reduce<Record<string, SubgroupSlot[]>>(
      (acc, slot) => {
        const key = slotDayKey(slot.starts_at);
        acc[key] = [...(acc[key] ?? []), slot];
        return acc;
      },
      {},
    );

    const startKey = tripStartDate ? String(tripStartDate).slice(0, 10) : null;
    const endKey = tripEndDate ? String(tripEndDate).slice(0, 10) : startKey;
    if (startKey && endKey && startKey <= endKey) {
      const days: Array<{
        key: string;
        dayNumber: number;
        label: string;
        slots: SubgroupSlot[];
      }> = [];
      let currentKey = startKey;
      let dayNumber = 1;
      while (currentKey <= endKey && dayNumber <= 60) {
        days.push({
          key: currentKey,
          dayNumber,
          label: dateKeyLabel(currentKey),
          slots: slotsByDay[currentKey] ?? [],
        });
        currentKey = addDaysToDateKey(currentKey, 1);
        dayNumber += 1;
      }
      return days;
    }

    return Object.entries(slotsByDay)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, groupSlots], index) => ({
        key,
        dayNumber: index + 1,
        label:
          key === "sin-fecha"
            ? "Sin fecha"
            : slotDayLabel(groupSlots[0]?.starts_at),
        slots: groupSlots,
      }));
  }, [slots, tripEndDate, tripStartDate]);

  useEffect(() => {
    if (subgroupDayGroups.length === 0) {
      setExpandedSubgroupDay(null);
      didInitializeExpandedDayRef.current = false;
      return;
    }
    if (
      expandedSubgroupDay &&
      subgroupDayGroups.some((day) => day.key === expandedSubgroupDay)
    )
      return;
    if (didInitializeExpandedDayRef.current) return;

    const firstWithSlots = subgroupDayGroups.find(
      (day) => day.slots.length > 0,
    );
    setExpandedSubgroupDay((firstWithSlots ?? subgroupDayGroups[0]).key);
    didInitializeExpandedDayRef.current = true;
  }, [expandedSubgroupDay, subgroupDayGroups]);

  const actionableSlots = slots.filter(isSlotStillActionable);
  const actionableOptionCount = actionableSlots.reduce(
    (sum, slot) => sum + slot.subgroups.length,
    0,
  );

  return (
    <>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_20px_70px_rgba(30,10,78,0.08)]">
          <div className="relative overflow-hidden px-6 py-6 md:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(122,79,214,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(30,111,217,0.12),_transparent_30%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D9D5F8] bg-[#F6F2FF] px-3 py-1 text-xs font-semibold text-[#6D45C0]">
                  <span className="h-2 w-2 rounded-full bg-[#7A4FD6]" />
                  Momentos para dividirse y reencontrarse
                </div>
                <h2 className="font-heading text-[30px] leading-tight text-[#1E0A4E]">
                  Vista de subgrupos
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                  Organiza ratos libres del viaje para que cada quien elija
                  plan, vea quien ya esta dentro y vuelva al grupo con todo
                  claro.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#1E6FD9]">
                    {actionableSlots.length}{" "}
                    {actionableSlots.length === 1
                      ? "horario activo"
                      : "horarios activos"}
                  </span>
                  <span className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 text-xs font-semibold text-[#6D45C0]">
                    {actionableOptionCount} opciones disponibles
                  </span>
                  <span className="rounded-full border border-[#D7DEEA] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569]">
                    Cada persona puede elegir un plan o quedar libre
                  </span>
                </div>
              </div>
              {isAdmin && (!tripEndDate || tripEndDate >= todayValue()) && (
                <button
                  type="button"
                  onClick={openCreateSlotModal}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(30,111,217,0.28)] transition hover:translate-y-[-1px]"
                >
                  Crear horario
                </button>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading && (
          <p className="px-1 text-sm text-[#64748B]">Cargando subgrupos...</p>
        )}

        {!loading && slots.length === 0 && (
          <section className="rounded-[26px] border border-dashed border-[#CBD5E1] bg-white px-6 py-12 text-center shadow-[0_16px_40px_rgba(30,10,78,0.04)]">
            <h3 className="font-heading text-2xl text-[#1E0A4E]">
              Todavia no hay horarios de subgrupos
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
              Crea un bloque de tiempo para que el grupo proponga planes
              paralelos, se reparta con libertad y despues pueda volver a
              encontrarse sin perder el hilo del viaje.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreateSlotModal}
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white"
              >
                Crear primer horario
              </button>
            )}
          </section>
        )}

        <div className="space-y-3">
          {subgroupDayGroups.map((dayGroup) => {
            const expanded = expandedSubgroupDay === dayGroup.key;
            const optionCount = dayGroup.slots.reduce(
              (sum, slot) => sum + slot.subgroups.length,
              0,
            );

            return (
              <section
                key={dayGroup.key}
                className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSubgroupDay((current) =>
                      current === dayGroup.key ? null : dayGroup.key,
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#F8FAFC]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 rounded-full bg-[#EEF4FF] px-3 py-1 text-[11px] font-bold text-[#1E6FD9]">
                      DIA {dayGroup.dayNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body text-sm font-bold leading-tight text-[#1E0A4E]">
                        {dayGroup.label}
                      </p>
                      <p className="mt-0.5 font-body text-xs leading-tight text-[#64748B]">
                        {dayGroup.slots.length === 0
                          ? "Sin horarios de subgrupos"
                          : `${dayGroup.slots.length} horario${dayGroup.slots.length === 1 ? "" : "s"} · ${optionCount} opcion${optionCount === 1 ? "" : "es"}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[#64748B] transition-transform ${expanded ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-5 border-t border-[#E2E8F0] bg-[#FBFCFF] px-5 py-5">
                    {dayGroup.slots.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-5 py-8 text-center">
                        <p className="font-semibold text-[#1E0A4E]">
                          Sin horarios para este dia.
                        </p>
                        <p className="mt-1 text-sm text-[#64748B]">
                          Crea un horario de subgrupos cuando necesiten
                          dividirse.
                        </p>
                      </div>
                    ) : (
                      <>
                        {dayGroup.slots.map((slot) => {
                          const myMembership = slot.memberships.find(
                            (membership) => {
                              const mUid =
                                membership.user_id != null
                                  ? String(membership.user_id)
                                  : String(membership.usuarios?.id_usuario);
                              return String(mUid) === String(myUserId);
                            },
                          );
                          const mySubgroupId =
                            myMembership?.subgroup_id != null
                              ? String(myMembership.subgroup_id)
                              : null;
                          const mySubgroup = slot.subgroups.find(
                            (sg) =>
                              mySubgroupId != null &&
                              String(sg.id) === mySubgroupId,
                          );
                          const freeBusy =
                            actionBusyKey === `join:${slot.id}:free`;
                          const deleteSlotBusy =
                            actionBusyKey === `slot-delete:${slot.id}`;
                          const slotActionsBusy = actionBusyKey != null;

                          return (
                            <section
                              key={slot.id}
                              ref={(element) => {
                                slotCardRefs.current[slot.id] = element;
                              }}
                              className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_18px_52px_rgba(30,10,78,0.06)]"
                            >
                              <div className="border-b border-[#EEF2F7] bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(244,241,255,0.92))] px-6 py-5">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full border border-[#D7DEEA] bg-white px-3 py-1 text-xs font-semibold text-[#475569]">
                                        Horario libre
                                      </span>
                                      <span className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1 text-xs font-semibold text-[#6D45C0]">
                                        {dt(slot.starts_at)} -{" "}
                                        {dt(slot.ends_at)}
                                      </span>
                                    </div>
                                    <div>
                                      <h3 className="font-heading text-2xl text-[#1E0A4E]">
                                        {slot.title}
                                      </h3>
                                      <p className="mt-1 text-sm text-[#64748B]">
                                        Tu estado actual:{" "}
                                        <span className="font-semibold text-[#1E0A4E]">
                                          {mySubgroup
                                            ? `En ${mySubgroup.name}`
                                            : "Libre"}
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={slotActionsBusy}
                                      aria-busy={freeBusy}
                                      onClick={() => void onJoin(slot.id, null)}
                                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#D7DEEA] bg-white px-5 text-sm font-semibold text-[#1E0A4E] transition hover:border-[#1E6FD9] hover:text-[#1E6FD9] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {freeBusy && <InlineSpinner size={14} />}
                                      {freeBusy
                                        ? "Guardando..."
                                        : myMembership?.subgroup_id
                                          ? "Quedar libre"
                                          : "Estoy libre"}
                                    </button>
                                    {isAdmin && !isSlotInPastDay(slot) && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={slotActionsBusy}
                                          onClick={() =>
                                            openEditSlotModal(slot)
                                          }
                                          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-[#D7DEEA] bg-white px-5 text-sm font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          Editar horario
                                        </button>
                                        <button
                                          type="button"
                                          disabled={slotActionsBusy}
                                          aria-busy={deleteSlotBusy}
                                          onClick={() =>
                                            void onDeleteSlot(slot.id)
                                          }
                                          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-[#FFF5F5] px-5 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {deleteSlotBusy && (
                                            <InlineSpinner size={14} />
                                          )}
                                          {deleteSlotBusy
                                            ? "Eliminando..."
                                            : "Eliminar"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="px-6 py-6">
                                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <h4 className="font-heading text-lg text-[#1E0A4E]">
                                      Planes disponibles
                                    </h4>
                                    <p className="mt-1 text-sm text-[#64748B]">
                                      Cada opcion funciona como una mini
                                      actividad dentro de este bloque del viaje.
                                    </p>
                                  </div>
                                  {!isSlotInPastDay(slot) && (
                                    <button
                                      type="button"
                                      disabled={slotActionsBusy}
                                      onClick={() =>
                                        openCreateSubgroupModal(slot)
                                      }
                                      className="inline-flex items-center justify-center rounded-2xl bg-[#1E6FD9] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isAdmin
                                        ? "Agregar opcion"
                                        : "Proponer opcion"}
                                    </button>
                                  )}
                                </div>

                                {slot.subgroups.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-10 text-center">
                                    <p className="font-semibold text-[#1E0A4E]">
                                      Aun no hay planes dentro de este horario.
                                    </p>
                                    <p className="mt-1 text-sm text-[#64748B]">
                                      Abre el modal y agrega una opcion con
                                      lugar, hora y contexto para que el grupo
                                      elija facil.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="grid gap-5 xl:grid-cols-2">
                                    {slot.subgroups.map((subgroup) => {
                                      const canManageSubgroup =
                                        isAdmin ||
                                        Number(subgroup.created_by) ===
                                          Number(myUserId);
                                      const isMine =
                                        mySubgroupId != null &&
                                        String(mySubgroupId) ===
                                          String(subgroup.id);
                                      const joinBusy =
                                        actionBusyKey ===
                                        `join:${slot.id}:${subgroup.id}`;
                                      const deleteSubgroupBusy =
                                        actionBusyKey ===
                                        `subgroup-delete:${slot.id}:${subgroup.id}`;
                                      const expenseOpenBusy =
                                        actionBusyKey ===
                                        `expense-open:${slot.id}:${subgroup.id}`;
                                      const documentOpenBusy =
                                        actionBusyKey ===
                                        `document-open:${slot.id}:${subgroup.id}`;
                                      const chatOpenBusy =
                                        actionBusyKey ===
                                        `chat-open:${slot.id}:${subgroup.id}`;
                                      const details = primaryActivity(subgroup);
                                      const linkedContext =
                                        getLinksForSubgroupActivity(
                                          details?.id,
                                        );
                                      const linkedExpenses =
                                        linkedContext.filter(
                                          (entity) => entity.type === "expense",
                                        );
                                      const linkedDocuments =
                                        linkedContext.filter(
                                          (entity) =>
                                            entity.type === "document",
                                        );
                                      const coverImage =
                                        (details?.id != null
                                          ? subgroupPhotoByActivityId[
                                              details.id
                                            ]
                                          : null) ||
                                        group?.destino_photo_url ||
                                        fallbackSubgroupImage;
                                      const openEditWithContext = () =>
                                        openEditSubgroupModal(slot, subgroup);
                                      const openExpenseAssociationModal =
                                        () => {
                                          if (details?.id == null) return;
                                          setActionBusyKey(
                                            `expense-open:${slot.id}:${subgroup.id}`,
                                          );
                                          setDraftExpenseTab("associate");
                                          openDraftActionModal(
                                            slot.id,
                                            "expense",
                                            details.id,
                                          );
                                          window.setTimeout(
                                            () =>
                                              setActionBusyKey((current) =>
                                                current ===
                                                `expense-open:${slot.id}:${subgroup.id}`
                                                  ? null
                                                  : current,
                                              ),
                                            250,
                                          );
                                        };
                                      const openDocumentAssociationModal =
                                        () => {
                                          if (details?.id == null) return;
                                          setActionBusyKey(
                                            `document-open:${slot.id}:${subgroup.id}`,
                                          );
                                          setDraftDocumentTab("associate");
                                          openDraftActionModal(
                                            slot.id,
                                            "document",
                                            details.id,
                                          );
                                          window.setTimeout(
                                            () =>
                                              setActionBusyKey((current) =>
                                                current ===
                                                `document-open:${slot.id}:${subgroup.id}`
                                                  ? null
                                                  : current,
                                              ),
                                            250,
                                          );
                                        };
                                      const openChatForSubgroup = () => {
                                        setActionBusyKey(
                                          `chat-open:${slot.id}:${subgroup.id}`,
                                        );
                                        setChatSubgroup({
                                          slotId: slot.id,
                                          subgroupId: subgroup.id,
                                          name: subgroup.name,
                                        });
                                        window.setTimeout(
                                          () =>
                                            setActionBusyKey((current) =>
                                              current ===
                                              `chat-open:${slot.id}:${subgroup.id}`
                                                ? null
                                                : current,
                                            ),
                                          250,
                                        );
                                      };

                                      return (
                                        <article
                                          key={subgroup.id}
                                          ref={(element) => {
                                            subgroupCardRefs.current[
                                              `${slot.id}:${subgroup.id}`
                                            ] = element;
                                          }}
                                          className={`overflow-hidden rounded-[24px] border bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${
                                            isMine
                                              ? "border-[#1E6FD9]"
                                              : "border-[#E2E8F0]"
                                          }`}
                                        >
                                          <div className="relative min-h-[280px] overflow-hidden">
                                            <img
                                              src={coverImage}
                                              alt={
                                                details?.title ?? subgroup.name
                                              }
                                              className="absolute inset-0 h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,11,33,0.12),rgba(14,11,33,0.78))]" />
                                            <div className="relative flex h-full min-h-[280px] flex-col justify-between p-5 text-white">
                                              <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="flex flex-wrap gap-2">
                                                  <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold backdrop-blur">
                                                    Subgrupo
                                                  </span>
                                                  {details?.starts_at && (
                                                    <span className="rounded-full bg-white/16 px-3 py-1 text-xs font-semibold backdrop-blur">
                                                      {dt(details.starts_at)}
                                                    </span>
                                                  )}
                                                  {isMine && (
                                                    <span className="rounded-full bg-[#35C56A] px-3 py-1 text-xs font-semibold text-white">
                                                      Tu opcion
                                                    </span>
                                                  )}
                                                </div>
                                                {canManageSubgroup &&
                                                  !isSlotInPastDay(slot) && (
                                                    <div className="flex gap-2">
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          openEditSubgroupModal(
                                                            slot,
                                                            subgroup,
                                                          )
                                                        }
                                                        className="rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur"
                                                      >
                                                        Editar
                                                      </button>
                                                      <button
                                                        type="button"
                                                        disabled={
                                                          slotActionsBusy
                                                        }
                                                        aria-busy={
                                                          deleteSubgroupBusy
                                                        }
                                                        onClick={() =>
                                                          void onDeleteSubgroup(
                                                            slot.id,
                                                            subgroup.id,
                                                          )
                                                        }
                                                        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-[#8B1E3F]/60 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                                                      >
                                                        {deleteSubgroupBusy && (
                                                          <InlineSpinner
                                                            size={12}
                                                          />
                                                        )}
                                                        {deleteSubgroupBusy
                                                          ? "Eliminando..."
                                                          : "Eliminar"}
                                                      </button>
                                                    </div>
                                                  )}
                                              </div>

                                              <div>
                                                <h5 className="font-heading text-[28px] leading-tight">
                                                  {details?.title ??
                                                    subgroup.name}
                                                </h5>
                                                {details?.location && (
                                                  <p className="mt-2 max-w-xl text-sm text-white/88">
                                                    {details.location}
                                                  </p>
                                                )}
                                                {details?.description && (
                                                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/82">
                                                    {details.description}
                                                  </p>
                                                )}
                                              </div>

                                              <div className="flex flex-wrap items-center gap-3 pt-4">
                                                {!isSlotInPastDay(slot) && (
                                                  <button
                                                    type="button"
                                                    disabled={slotActionsBusy}
                                                    aria-busy={joinBusy}
                                                    onClick={() =>
                                                      void onJoin(
                                                        slot.id,
                                                        subgroup.id,
                                                      )
                                                    }
                                                    className={`inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold shadow-[0_14px_28px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 ${
                                                      isMine
                                                        ? "bg-white text-[#1E0A4E]"
                                                        : "bg-[#1E6FD9] text-white"
                                                    }`}
                                                  >
                                                    {joinBusy && (
                                                      <InlineSpinner
                                                        size={14}
                                                      />
                                                    )}
                                                    {joinBusy
                                                      ? "Guardando..."
                                                      : isMine
                                                        ? "Estoy aqui"
                                                        : "Unirme a este plan"}
                                                  </button>
                                                )}
                                                <div className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3 text-sm text-white/88 backdrop-blur">
                                                  {subgroup.members.length === 0
                                                    ? "Aun nadie se suma"
                                                    : `${subgroup.members.length} ${subgroup.members.length === 1 ? "persona ya esta dentro" : "personas ya estan dentro"}`}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-4 px-5 py-5">
                                            <section className="rounded-2xl bg-[#F8FAFC] px-4 py-4">
                                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                                                Personas dentro
                                              </p>
                                              <MemberCircles
                                                members={subgroup.members}
                                              />
                                              {subgroup.members.length > 0 && (
                                                <p className="mt-3 text-sm leading-6 text-[#475569]">
                                                  {subgroup.members
                                                    .map(memberName)
                                                    .join(", ")}
                                                </p>
                                              )}
                                            </section>

                                            <div className="grid gap-2 sm:grid-cols-3">
                                              <button
                                                type="button"
                                                disabled={slotActionsBusy}
                                                aria-busy={expenseOpenBusy}
                                                onClick={
                                                  details?.id != null
                                                    ? openExpenseAssociationModal
                                                    : openEditWithContext
                                                }
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#CFE0FF] bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#1E6FD9] disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                {expenseOpenBusy && (
                                                  <InlineSpinner size={14} />
                                                )}
                                                {expenseOpenBusy
                                                  ? "Abriendo..."
                                                  : linkedExpenses.length > 0
                                                    ? "Elegir gasto"
                                                    : "Agregar gasto"}
                                              </button>
                                              <button
                                                type="button"
                                                disabled={slotActionsBusy}
                                                aria-busy={documentOpenBusy}
                                                onClick={
                                                  details?.id != null
                                                    ? openDocumentAssociationModal
                                                    : openEditWithContext
                                                }
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D8C8FF] bg-[#F3EEFF] px-4 py-3 text-sm font-semibold text-[#6D45C0] disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                {documentOpenBusy && (
                                                  <InlineSpinner size={14} />
                                                )}
                                                {documentOpenBusy
                                                  ? "Abriendo..."
                                                  : linkedDocuments.length > 0
                                                    ? "Elegir comprobante"
                                                    : "Agregar comprobante"}
                                              </button>
                                              <button
                                                type="button"
                                                disabled={slotActionsBusy}
                                                aria-busy={chatOpenBusy}
                                                onClick={openChatForSubgroup}
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#B9F0CB] bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#0A8A3E] disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                {chatOpenBusy && (
                                                  <InlineSpinner size={14} />
                                                )}
                                                {chatOpenBusy
                                                  ? "Abriendo..."
                                                  : "Abrir chat"}
                                              </button>
                                            </div>

                                            <section className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4">
                                              <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                                                    Asociaciones confirmadas
                                                  </p>
                                                  <p className="mt-1 text-sm text-[#64748B]">
                                                    Estos gastos y comprobantes
                                                    ya estan vinculados a este
                                                    elemento.
                                                  </p>
                                                </div>
                                              </div>

                                              {linkedContext.length === 0 ? (
                                                <p className="mt-4 rounded-xl bg-[#F8FAFC] px-3 py-3 text-sm text-[#64748B]">
                                                  Aun no hay asociaciones
                                                  confirmadas.
                                                </p>
                                              ) : (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                  {linkedExpenses.map(
                                                    (entity) => (
                                                      <button
                                                        key={entityKey(entity)}
                                                        type="button"
                                                        onClick={
                                                          openExpenseAssociationModal
                                                        }
                                                        className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#1E6FD9]"
                                                        title={entity.label}
                                                      >
                                                        Gasto: {entity.label}
                                                      </button>
                                                    ),
                                                  )}
                                                  {linkedDocuments.map(
                                                    (entity) => (
                                                      <button
                                                        key={entityKey(entity)}
                                                        type="button"
                                                        onClick={
                                                          openDocumentAssociationModal
                                                        }
                                                        className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 text-xs font-semibold text-[#6D45C0]"
                                                        title={entity.label}
                                                      >
                                                        Documento:{" "}
                                                        {entity.label}
                                                      </button>
                                                    ),
                                                  )}
                                                </div>
                                              )}
                                            </section>

                                            {subgroup.activities.slice(1)
                                              .length > 0 && (
                                              <section className="rounded-2xl bg-[#F8FAFC] px-4 py-4">
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                                                    Planes internos
                                                  </p>
                                                  <span className="text-xs text-[#94A3B8]">
                                                    {
                                                      subgroup.activities.slice(
                                                        1,
                                                      ).length
                                                    }{" "}
                                                    notas
                                                  </span>
                                                </div>
                                                <div className="space-y-2">
                                                  {subgroup.activities
                                                    .slice(1)
                                                    .map((activity) => (
                                                      <div
                                                        key={activity.id}
                                                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-3 text-sm text-[#334155]"
                                                      >
                                                        <div>
                                                          <p className="font-semibold text-[#1E0A4E]">
                                                            {activity.title}
                                                          </p>
                                                          {activity.description && (
                                                            <p className="mt-1 text-xs text-[#64748B]">
                                                              {
                                                                activity.description
                                                              }
                                                            </p>
                                                          )}
                                                        </div>
                                                        {(isAdmin ||
                                                          Number(
                                                            activity.created_by,
                                                          ) ===
                                                            Number(
                                                              myUserId,
                                                            )) && (
                                                          <button
                                                            type="button"
                                                            disabled={
                                                              slotActionsBusy
                                                            }
                                                            aria-busy={
                                                              actionBusyKey ===
                                                              `activity-delete:${slot.id}:${activity.id}`
                                                            }
                                                            onClick={() =>
                                                              void onDeleteActivity(
                                                                slot.id,
                                                                activity.id,
                                                              )
                                                            }
                                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                          >
                                                            {actionBusyKey ===
                                                              `activity-delete:${slot.id}:${activity.id}` && (
                                                              <InlineSpinner
                                                                size={12}
                                                              />
                                                            )}
                                                            {actionBusyKey ===
                                                            `activity-delete:${slot.id}:${activity.id}`
                                                              ? "Eliminando..."
                                                              : "Eliminar"}
                                                          </button>
                                                        )}
                                                      </div>
                                                    ))}
                                                </div>
                                              </section>
                                            )}
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </section>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <ActionModal
        open={scheduleConflictMessage !== null}
        title="Conflicto de horario"
        subtitle="No se puede guardar la actividad con esa hora."
        confirmLabel="Cambiar horario"
        onClose={() => setScheduleConflictMessage(null)}
        onConfirm={() => setScheduleConflictMessage(null)}
      >
        <p className="text-sm leading-relaxed text-[#475569]">
          {scheduleConflictMessage}
        </p>
      </ActionModal>

      <ActionModal
        open={slotModal !== null}
        title={slotModal?.mode === "edit" ? "Editar horario" : "Crear horario"}
        subtitle="Define el bloque de tiempo donde las personas podran separarse y elegir un plan."
        confirmLabel={
          slotModal?.mode === "edit" ? "Guardar horario" : "Crear horario"
        }
        confirmDisabled={
          slotModalSaving ||
          !newSlotTitle.trim() ||
          !newSlotStart ||
          !newSlotEnd ||
          Boolean(slotTimeValidationMessage)
        }
        confirmLoading={slotModalSaving}
        panelClassName="max-w-2xl"
        onClose={slotModalSaving ? () => {} : closeSlotModal}
        onConfirm={() => void submitSlotModal()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Nombre
            </span>
            <input
              className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
              placeholder="Ej: Tarde libre en la costera"
              value={newSlotTitle}
              onChange={(event) => setNewSlotTitle(event.target.value)}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Fecha de inicio
            </span>
            <input
              className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
              type="date"
              min={effectiveMinDate}
              max={tripEndDate ?? undefined}
              value={splitLocalDate(newSlotStart)}
              onChange={(event) =>
                setLocalDatePart(
                  event.target.value,
                  newSlotStart,
                  setNewSlotStart,
                )
              }
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Hora de inicio
            </span>
            <input
              className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
              type="time"
              step={1800}
              value={newSlotStart ? splitLocalTime(newSlotStart) : "12:00"}
              onChange={(event) =>
                setLocalTimePart(
                  event.target.value,
                  newSlotStart,
                  effectiveMinDate,
                  setNewSlotStart,
                )
              }
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Fecha de fin
            </span>
            <input
              className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
              type="date"
              min={effectiveMinDate}
              max={tripEndDate ?? undefined}
              value={splitLocalDate(newSlotEnd)}
              onChange={(event) =>
                setLocalDatePart(event.target.value, newSlotEnd, setNewSlotEnd)
              }
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Hora de fin
            </span>
            <input
              className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
              type="time"
              step={1800}
              value={newSlotEnd ? splitLocalTime(newSlotEnd) : "12:30"}
              onChange={(event) =>
                setLocalTimePart(
                  event.target.value,
                  newSlotEnd,
                  splitLocalDate(newSlotStart) || effectiveMinDate,
                  setNewSlotEnd,
                )
              }
            />
          </label>
          {slotTimeValidationMessage && (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {slotTimeValidationMessage}
            </div>
          )}
          <p className="md:col-span-2 text-xs text-[#64748B]">
            Por consistencia del itinerario, los horarios solo aceptan horas
            cerradas: minutos 00 o 30, y deben quedar dentro de las fechas del
            viaje.
          </p>
        </div>
      </ActionModal>

      <ActionModal
        open={
          subgroupModal?.mode === "create" &&
          subgroupModalSlot != null &&
          subgroupModalDraft != null
        }
        title={
          subgroupModalSlot
            ? `Agregar opcion para ${subgroupModalSlot.title}`
            : "Agregar opcion"
        }
        subtitle="Busca un lugar, define una hora aproximada y agrega contexto si quieres dejar listo el plan."
        confirmLabel="Crear opcion"
        confirmDisabled={
          subgroupCreateSaving || !subgroupModalDraft?.selectedPlace
        }
        confirmLoading={subgroupCreateSaving}
        panelClassName="max-w-4xl"
        onClose={subgroupCreateSaving ? () => {} : closeSubgroupModal}
        onConfirm={() => {
          if (subgroupModalSlot) void onCreateSubgroup(subgroupModalSlot);
        }}
      >
        {subgroupModalSlot && subgroupModalDraft && (
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  Buscar lugar o actividad
                </label>
                <div
                  ref={autocompleteBoxRef}
                  className="relative"
                  onBlur={(event) => {
                    if (
                      !autocompleteBoxRef.current?.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setActivityDraft(subgroupModalSlot.id, {
                        showSuggestions: false,
                      });
                    }
                  }}
                >
                  <input
                    className="w-full rounded-2xl border border-[#D7DEEA] px-4 py-3 pr-10 text-sm outline-none focus:border-[#1E6FD9]"
                    placeholder="Ej: restaurante, playa, museo..."
                    value={subgroupModalDraft.query}
                    onChange={(event) => {
                      const value = event.target.value;
                      setActivityDraft(subgroupModalSlot.id, {
                        query: value,
                        selectedPlace: null,
                        results: [],
                        showSuggestions: value.trim().length >= 3,
                      });
                    }}
                    onFocus={() => {
                      setActivityDraft(subgroupModalSlot.id, {
                        showSuggestions:
                          subgroupModalDraft.query.trim().length >= 3 &&
                          subgroupModalDraft.suggestions.length > 0,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (subgroupModalDraft.suggestions[0]) {
                          void onSelectSuggestion(
                            subgroupModalSlot.id,
                            subgroupModalDraft.suggestions[0],
                          );
                        } else {
                          void onSearchPlace(subgroupModalSlot.id);
                        }
                      }
                    }}
                  />
                  {(subgroupModalDraft.suggestionsLoading ||
                    subgroupModalDraft.loading) && (
                    <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#D7DEEA] border-t-[#1E6FD9]" />
                  )}
                  {subgroupModalDraft.showSuggestions &&
                    subgroupModalDraft.suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-1 shadow-xl">
                        {subgroupModalDraft.suggestions.map((suggestion) => (
                          <button
                            key={suggestion.placeId || suggestion.description}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() =>
                              void onSelectSuggestion(
                                subgroupModalSlot.id,
                                suggestion,
                              )
                            }
                            className="block w-full rounded-xl px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                          >
                            <p className="text-sm font-semibold text-[#1E0A4E]">
                              {suggestion.mainText || suggestion.description}
                            </p>
                            <p className="mt-0.5 text-xs text-[#64748B]">
                              {suggestion.secondaryText ||
                                suggestion.description}
                            </p>
                            {(suggestion.routeDistanceText ||
                              suggestion.routeDurationText) && (
                              <p className="mt-2 inline-flex rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[11px] font-semibold text-[#1E6FD9]">
                                {suggestion.routeDistanceText ??
                                  "Distancia no disponible"}
                                {suggestion.routeDurationText
                                  ? ` · ${suggestion.routeDurationText}`
                                  : ""}{" "}
                                desde {routeOriginLabel}
                              </p>
                            )}
                            {suggestion.routeDurationSeconds != null &&
                              suggestion.routeDurationSeconds >
                                LONG_ROUTE_THRESHOLD_SECONDS && (
                                <p className="mt-1 text-[11px] font-semibold text-red-700">
                                  Traslado largo: mas de 1 hora
                                </p>
                              )}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {subgroupModalDraft.selectedPlace && (
                <div className="rounded-2xl border border-[#CFE0FF] bg-[#EEF4FF] px-4 py-4">
                  <p className="text-sm font-semibold text-[#1E0A4E]">
                    {subgroupModalDraft.selectedPlace.name ||
                      "Lugar sin nombre"}
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {subgroupModalDraft.selectedPlace.formattedAddress ||
                      "Direccion no disponible"}
                  </p>
                  {subgroupModalDraft.selectedPlace.routeDurationSeconds !=
                    null &&
                    subgroupModalDraft.selectedPlace.routeDurationSeconds >
                      LONG_ROUTE_THRESHOLD_SECONDS && (
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-red-800">
                        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-100 text-red-700">
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M12 8v5"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                            <path
                              d="M12 17h.01"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <path
                              d="M10.3 4.1 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-bold">Traslado largo</p>
                          <p className="mt-0.5 text-xs">
                            Este lugar queda a mas de 1 hora desde{" "}
                            {routeOriginLabel}
                            {subgroupModalDraft.selectedPlace.routeDurationText
                              ? ` (${subgroupModalDraft.selectedPlace.routeDurationText})`
                              : ""}
                            . Te pediremos confirmar antes de crear la opcion.
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    Hora estimada
                  </span>
                  <input
                    className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                    type="time"
                    min={
                      subgroupCreateUsesSingleDayWindow
                        ? subgroupCreateTimeMin
                        : undefined
                    }
                    max={
                      subgroupCreateUsesSingleDayWindow
                        ? subgroupCreateTimeMax
                        : undefined
                    }
                    step={1800}
                    value={subgroupModalDraft.timeValue}
                    onChange={(event) => {
                      setActivityDraft(subgroupModalSlot.id, {
                        timeValue: event.target.value,
                      });
                      if (
                        event.target.value &&
                        !isThirtyMinuteTime(event.target.value)
                      ) {
                        setError(
                          "La hora estimada debe estar en intervalos de 30 minutos exactos.",
                        );
                      } else {
                        setError(null);
                      }
                    }}
                  />
                  {subgroupCreateUsesSingleDayWindow &&
                    subgroupCreateTimeMin &&
                    subgroupCreateTimeMax && (
                      <p className="text-xs text-[#64748B]">
                        Elige una hora entre {subgroupCreateTimeMin} y{" "}
                        {subgroupCreateTimeMax} para este bloque, usando minutos
                        00 o 30.
                      </p>
                    )}
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    Descripcion
                  </span>
                  <textarea
                    className="min-h-[110px] resize-none rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                    placeholder="Ej: comida rapida, llevar traje de bano, llegar con tiempo..."
                    value={subgroupModalDraft.description}
                    onChange={(event) =>
                      setActivityDraft(subgroupModalSlot.id, {
                        description: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  Resultados
                </p>
                {subgroupModalDraft.results.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#D7DEEA] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
                    Busca un lugar para seleccionar la opcion que quieres
                    proponer.
                  </div>
                ) : (
                  <>
                    {subgroupModalDraft.selectedPlace && (
                      <p className="mb-2 text-xs text-[#64748B]">
                        Opcion seleccionada. Si quieres cambiarla, realiza una
                        nueva busqueda.
                      </p>
                    )}
                    <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white">
                    {(subgroupModalDraft.selectedPlace
                      ? [subgroupModalDraft.selectedPlace]
                      : subgroupModalDraft.results
                    ).map((place) => {
                      const isSelected =
                        subgroupModalDraft.selectedPlace?.id === place.id;
                      return (
                        <button
                          key={
                            place.id ||
                            `${place.name}-${place.formattedAddress}`
                          }
                          type="button"
                          onClick={() =>
                            setActivityDraft(subgroupModalSlot.id, {
                              selectedPlace: place,
                            })
                          }
                          className={`block w-full border-b border-[#EEF2F7] px-4 py-4 text-left last:border-b-0 ${
                            isSelected ? "bg-[#EEF4FF]" : "hover:bg-[#F8FAFC]"
                          }`}
                        >
                          <p className="text-sm font-semibold text-[#1E0A4E]">
                            {place.name || "Lugar sin nombre"}
                          </p>
                          <p className="mt-1 text-sm text-[#64748B]">
                            {place.formattedAddress ||
                              "Direccion no disponible"}
                          </p>
                          {place.routeDurationSeconds != null &&
                            place.routeDurationSeconds >
                              LONG_ROUTE_THRESHOLD_SECONDS && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                                <span className="text-red-600">
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M12 8v5"
                                      stroke="currentColor"
                                      strokeWidth="2.4"
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d="M12 17h.01"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d="M10.3 4.1 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                                A mas de 1 hora
                                {place.routeDurationText
                                  ? ` (${place.routeDurationText})`
                                  : ""}
                              </p>
                            )}
                          {place.primaryCategory && (
                            <p className="mt-2 text-xs font-semibold text-[#1E6FD9]">
                              {place.primaryCategory}
                            </p>
                          )}
                        </button>
                      );
                    })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                <p className="text-sm font-semibold text-[#1E0A4E]">
                  Agregar gasto o comprobante
                </p>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">
                  Relaciona gastos (taxi, entradas, comida) y comprobantes
                  (tickets, reservaciones, recibos) para esta opcion.
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftExpenseTab("associate");
                      openDraftActionModal(subgroupModalSlot.id, "expense");
                    }}
                    className="rounded-2xl border border-[#CFE0FF] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E6FD9]"
                  >
                    Agregar o elegir gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftDocumentTab("associate");
                      openDraftActionModal(subgroupModalSlot.id, "document");
                    }}
                    className="rounded-2xl border border-[#D8C8FF] bg-white px-4 py-3 text-left text-sm font-semibold text-[#6D45C0]"
                  >
                    Agregar o elegir comprobante
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4">
                <p className="text-sm font-semibold text-[#1E0A4E]">
                  Resumen del plan
                </p>
                <div className="mt-3 space-y-2 text-sm text-[#475569]">
                  <p>
                    <span className="font-semibold text-[#1E0A4E]">
                      Horario:
                    </span>{" "}
                    {dt(subgroupModalSlot.starts_at)} -{" "}
                    {dt(subgroupModalSlot.ends_at)}
                  </p>
                  <p>
                    <span className="font-semibold text-[#1E0A4E]">
                      Hora estimada:
                    </span>{" "}
                    {subgroupModalDraft.timeValue || "12:00"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#1E0A4E]">Lugar:</span>{" "}
                    {subgroupModalDraft.selectedPlace?.name ||
                      "Sin seleccionar"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {subgroupModalDraft.selectedExpenseIds.map((expenseId) => {
                    const expense = linkOptions.expenses.find(
                      (item) => item.id === expenseId,
                    );
                    if (!expense) return null;
                    return (
                      <span
                        key={expenseId}
                        className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#1E6FD9]"
                      >
                        Gasto: {expense.label}
                      </span>
                    );
                  })}
                  {(subgroupModalDraft.quickExpenseAmount.trim() ||
                    subgroupModalDraft.quickExpenseDescription.trim()) && (
                    <span className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#1E6FD9]">
                      Gasto nuevo:{" "}
                      {subgroupModalDraft.quickExpenseDescription.trim() ||
                        "Sin descripcion"}
                    </span>
                  )}
                  {subgroupModalDraft.selectedDocumentIds.map((documentId) => {
                    const document = linkOptions.documents.find(
                      (item) => item.id === documentId,
                    );
                    if (!document) return null;
                    return (
                      <span
                        key={documentId}
                        className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 text-xs font-semibold text-[#6D45C0]"
                      >
                        Documento: {document.label}
                      </span>
                    );
                  })}
                  {subgroupModalDraft.quickDocumentFile && (
                    <span className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 text-xs font-semibold text-[#6D45C0]">
                      Documento nuevo:{" "}
                      {subgroupModalDraft.quickDocumentFile.name}
                    </span>
                  )}
                  {subgroupModalDraft.selectedExpenseIds.length === 0 &&
                    subgroupModalDraft.selectedDocumentIds.length === 0 &&
                    !subgroupModalDraft.quickExpenseAmount.trim() &&
                    !subgroupModalDraft.quickExpenseDescription.trim() &&
                    !subgroupModalDraft.quickDocumentFile && (
                      <span className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#7A8799]">
                        Sin contexto agregado por ahora.
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}
      </ActionModal>

      <ActionModal
        open={subgroupModal?.mode === "edit"}
        title="Editar subgrupo"
        subtitle="Ajusta nombre, lugar, descripcion y hora estimada del plan."
        confirmLabel="Guardar cambios"
        confirmDisabled={subgroupEditSaving || !subgroupFormName.trim()}
        confirmLoading={subgroupEditSaving}
        panelClassName="max-w-3xl"
        onClose={subgroupEditSaving ? () => {} : closeSubgroupModal}
        onConfirm={() => void submitSubgroupEdit()}
      >
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                Nombre del subgrupo
              </span>
              <input
                className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                value={subgroupFormName}
                onChange={(event) => setSubgroupFormName(event.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                Titulo del plan
              </span>
              <input
                className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                value={subgroupFormTitle}
                onChange={(event) => setSubgroupFormTitle(event.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                Ubicacion
              </span>
              <input
                className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                value={subgroupFormLocation}
                onChange={(event) =>
                  setSubgroupFormLocation(event.target.value)
                }
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                Hora estimada
              </span>
              <input
                className="rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                type="time"
                value={subgroupFormTime}
                onChange={(event) => setSubgroupFormTime(event.target.value)}
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                Descripcion
              </span>
              <textarea
                className="min-h-[140px] resize-none rounded-2xl border border-[#D7DEEA] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                value={subgroupFormDescription}
                onChange={(event) =>
                  setSubgroupFormDescription(event.target.value)
                }
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
              <p className="text-sm font-semibold text-[#1E0A4E]">
                Contexto del plan
              </p>
              <p className="mt-1 text-sm leading-6 text-[#64748B]">
                Ajusta las relaciones de gasto y documento para esta actividad
                de subgrupo sin salir del modal.
              </p>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={subgroupModalEditActivity?.id == null}
                  onClick={() => {
                    if (
                      !subgroupModalSlot ||
                      subgroupModalEditActivity?.id == null
                    )
                      return;
                    setDraftExpenseTab("associate");
                    openDraftActionModal(
                      subgroupModalSlot.id,
                      "expense",
                      subgroupModalEditActivity.id,
                    );
                  }}
                  className="rounded-2xl border border-[#CFE0FF] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E6FD9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Agregar o elegir gasto
                </button>
                <button
                  type="button"
                  disabled={subgroupModalEditActivity?.id == null}
                  onClick={() => {
                    if (
                      !subgroupModalSlot ||
                      subgroupModalEditActivity?.id == null
                    )
                      return;
                    setDraftDocumentTab("associate");
                    openDraftActionModal(
                      subgroupModalSlot.id,
                      "document",
                      subgroupModalEditActivity.id,
                    );
                  }}
                  className="rounded-2xl border border-[#D8C8FF] bg-white px-4 py-3 text-left text-sm font-semibold text-[#6D45C0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Agregar o elegir comprobante
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4">
              <p className="text-sm font-semibold text-[#1E0A4E]">
                Asociaciones confirmadas
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {subgroupModalEditLinks.map((entity) => (
                  <span
                    key={entityKey(entity)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      entity.type === "expense"
                        ? "border border-[#CFE0FF] bg-[#EEF4FF] text-[#1E6FD9]"
                        : "border border-[#D8C8FF] bg-[#F3EEFF] text-[#6D45C0]"
                    }`}
                  >
                    {entity.type === "expense" ? "Gasto" : "Documento"}:{" "}
                    {entity.label}
                  </span>
                ))}
                {subgroupModalEditLinks.length === 0 && (
                  <span className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#7A8799]">
                    Este plan todavia no tiene gastos ni documentos asociados.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </ActionModal>

      <ActionModal
        open={draftActionModal?.mode === "expense" && modalDraft != null}
        title={
          draftActionModal?.activityId != null
            ? "Agregar gasto o comprobante"
            : "Agregar gasto o comprobante"
        }
        subtitle={
          draftActionModal?.activityId != null
            ? "Relaciona un gasto existente o crea uno nuevo para esta opcion, por ejemplo taxi, entradas o comida."
            : "Relaciona un gasto existente o crea uno nuevo, por ejemplo taxi, entradas o comida."
        }
        confirmLabel={
          draftExpenseTab === "associate"
            ? "Guardar seleccion"
            : "Guardar gasto"
        }
        confirmLoading={actionBusyKey === "draft-expense"}
        onClose={closeDraftActionModal}
        onConfirm={() => {
          if (draftExpenseTab === "associate") {
            if (draftActionModal?.activityId != null && modalDraft) {
              void runAction(async () => {
                await syncDraftLinksForActivity(
                  draftActionModal.activityId!,
                  "expense",
                  modalDraft.selectedExpenseIds ?? [],
                );
                await loadContextLinks();
                closeDraftActionModal();
              }, "draft-expense");
            } else {
              closeDraftActionModal();
            }
          } else if (modalSlotId != null) {
            void runAction(async () => {
              await confirmDraftExpense(modalSlotId);
            }, "draft-expense");
          }
        }}
      >
        <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-[#F8FAFC] p-1">
          <button
            type="button"
            disabled={actionBusyKey === "draft-expense"}
            onClick={() => setDraftExpenseTab("associate")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${draftExpenseTab === "associate" ? "bg-[#1E6FD9] text-white" : "text-[#475569]"}`}
          >
            Asociar
          </button>
          <button
            type="button"
            disabled={actionBusyKey === "draft-expense"}
            onClick={() => setDraftExpenseTab("create")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${draftExpenseTab === "create" ? "bg-[#1E6FD9] text-white" : "text-[#475569]"}`}
          >
            Crear
          </button>
        </div>
        {draftExpenseTab === "associate" ? (
          linkOptions.expenses.length === 0 ? (
            <p className="text-sm text-[#64748B]">
              No hay gastos registrados para asociar.
            </p>
          ) : (
            <div className="space-y-3">
              <input
                value={modalDraft?.expenseFilter ?? ""}
                onChange={(event) =>
                  modalSlotId != null &&
                  setActivityDraft(modalSlotId, {
                    expenseFilter: event.target.value,
                  })
                }
                placeholder="Filtrar gastos"
                className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1E6FD9]"
              />
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {linkOptions.expenses
                  .filter((expense) => {
                    const filter = (modalDraft?.expenseFilter ?? "")
                      .trim()
                      .toLowerCase();
                    if (!filter) return true;
                    return `${expense.label} ${expense.subtitle ?? ""}`
                      .toLowerCase()
                      .includes(filter);
                  })
                  .map((expense) => {
                    const selected = modalDraft?.selectedExpenseIds.includes(
                      expense.id,
                    );
                    return (
                      <button
                        key={expense.id}
                        type="button"
                        onClick={() =>
                          modalSlotId != null &&
                          toggleDraftExpense(modalSlotId, expense.id)
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-[#1E6FD9] bg-[#1E6FD9] text-white" : "border-[#D7DEEA] bg-white text-[#3D4A5C]"}`}
                        title={expense.subtitle ?? expense.label}
                      >
                        {expense.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          )
        ) : (
          <ExpenseDraftForm
            amount={modalDraft?.quickExpenseAmount ?? ""}
            description={modalDraft?.quickExpenseDescription ?? ""}
            date={modalDraft?.quickExpenseDate ?? todayValue()}
            category={modalDraft?.quickExpenseCategory ?? "actividad"}
            paidBy={modalDraft?.quickExpensePaidBy ?? defaultExpensePayer}
            splitType={modalDraft?.quickExpenseSplitType ?? "equitativa"}
            splitAmounts={modalDraft?.quickExpenseSplitAmounts ?? {}}
            selectedMemberIds={
              modalDraft?.quickExpenseMemberIds ??
              safeMemberOptions.map((member) => member.id)
            }
            members={safeMemberOptions}
            onAmountChange={(value) =>
              modalSlotId != null &&
              setActivityDraft(modalSlotId, { quickExpenseAmount: value })
            }
            onDescriptionChange={(value) =>
              modalSlotId != null &&
              setActivityDraft(modalSlotId, { quickExpenseDescription: value })
            }
            onDateChange={(value) =>
              modalSlotId != null &&
              setActivityDraft(modalSlotId, { quickExpenseDate: value })
            }
            onCategoryChange={(value) =>
              modalSlotId != null &&
              setActivityDraft(modalSlotId, { quickExpenseCategory: value })
            }
            onPaidByChange={(value) =>
              modalSlotId != null &&
              setActivityDraft(modalSlotId, { quickExpensePaidBy: value })
            }
            onSplitTypeChange={(value) =>
              modalSlotId != null &&
              setActivityDraft(modalSlotId, { quickExpenseSplitType: value })
            }
            onSplitAmountChange={(memberId, value) =>
              modalSlotId != null &&
              setDraftExpenseSplitAmount(modalSlotId, memberId, value)
            }
            onToggleMember={(memberId) =>
              modalSlotId != null &&
              toggleDraftExpenseMember(modalSlotId, memberId)
            }
          />
        )}
      </ActionModal>

      <ActionModal
        open={draftActionModal?.mode === "document" && modalDraft != null}
        title={
          draftActionModal?.activityId != null
            ? "Agregar gasto o comprobante"
            : "Agregar gasto o comprobante"
        }
        subtitle={
          draftActionModal?.activityId != null
            ? "Relaciona un comprobante existente o sube uno nuevo para esta opcion, por ejemplo ticket, reservacion o recibo."
            : "Relaciona un comprobante existente o sube uno nuevo, por ejemplo ticket, reservacion o recibo."
        }
        confirmLabel={
          draftDocumentTab === "associate"
            ? "Guardar seleccion"
            : "Guardar documento"
        }
        confirmLoading={actionBusyKey === "draft-document"}
        onClose={closeDraftActionModal}
        onConfirm={() => {
          if (draftDocumentTab === "associate") {
            if (draftActionModal?.activityId != null && modalDraft) {
              void runAction(async () => {
                await syncDraftLinksForActivity(
                  draftActionModal.activityId!,
                  "document",
                  modalDraft.selectedDocumentIds ?? [],
                );
                await loadContextLinks();
                closeDraftActionModal();
              }, "draft-document");
            } else {
              closeDraftActionModal();
            }
          } else if (modalSlotId != null) {
            void runAction(async () => {
              await confirmDraftDocument(modalSlotId);
            }, "draft-document");
          }
        }}
      >
        <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-[#F8FAFC] p-1">
          <button
            type="button"
            disabled={actionBusyKey === "draft-document"}
            onClick={() => setDraftDocumentTab("associate")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${draftDocumentTab === "associate" ? "bg-[#7A4FD6] text-white" : "text-[#475569]"}`}
          >
            Asociar
          </button>
          <button
            type="button"
            disabled={actionBusyKey === "draft-document"}
            onClick={() => setDraftDocumentTab("create")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${draftDocumentTab === "create" ? "bg-[#7A4FD6] text-white" : "text-[#475569]"}`}
          >
            Crear
          </button>
        </div>
        {draftDocumentTab === "associate" ? (
          linkOptions.documents.length === 0 ? (
            <p className="text-sm text-[#64748B]">
              No hay documentos en la boveda para asociar.
            </p>
          ) : (
            <div className="space-y-3">
              <input
                value={modalDraft?.documentFilter ?? ""}
                onChange={(event) =>
                  modalSlotId != null &&
                  setActivityDraft(modalSlotId, {
                    documentFilter: event.target.value,
                  })
                }
                placeholder="Filtrar documentos"
                className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7A4FD6]"
              />
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {linkOptions.documents
                  .filter((document) => {
                    const filter = (modalDraft?.documentFilter ?? "")
                      .trim()
                      .toLowerCase();
                    if (!filter) return true;
                    return `${document.label} ${document.subtitle ?? ""}`
                      .toLowerCase()
                      .includes(filter);
                  })
                  .map((document) => {
                    const selected = modalDraft?.selectedDocumentIds.includes(
                      document.id,
                    );
                    return (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() =>
                          modalSlotId != null &&
                          toggleDraftDocument(modalSlotId, document.id)
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? "border-[#7A4FD6] bg-[#7A4FD6] text-white" : "border-[#D7DEEA] bg-white text-[#3D4A5C]"}`}
                        title={document.subtitle ?? document.label}
                      >
                        {document.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          )
        ) : (
          <div className="grid gap-3">
            <input
              type="file"
              onChange={(event) =>
                modalSlotId != null &&
                setActivityDraft(modalSlotId, {
                  quickDocumentFile: event.target.files?.[0] ?? null,
                })
              }
              className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-sm text-[#3D4A5C] outline-none focus:border-[#7A4FD6]"
            />
            <select
              value={modalDraft?.quickDocumentCategory ?? "actividad"}
              onChange={(event) =>
                modalSlotId != null &&
                setActivityDraft(modalSlotId, {
                  quickDocumentCategory: event.target
                    .value as TripDocumentCategory,
                })
              }
              className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7A4FD6]"
            >
              {(
                Object.keys(documentCategoryLabels) as TripDocumentCategory[]
              ).map((category) => (
                <option key={category} value={category}>
                  {documentCategoryLabels[category]}
                </option>
              ))}
            </select>
            <textarea
              value={modalDraft?.quickDocumentNotes ?? ""}
              onChange={(event) =>
                modalSlotId != null &&
                setActivityDraft(modalSlotId, {
                  quickDocumentNotes: event.target.value,
                })
              }
              placeholder="Nota obligatoria del documento"
              rows={3}
              className="w-full resize-none rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7A4FD6]"
            />
          </div>
        )}
      </ActionModal>

      <ActionModal
        open={longRouteConfirmation !== null}
        title="Confirmar traslado largo"
        subtitle="La opcion seleccionada puede quedar demasiado lejos para el grupo."
        confirmLabel="Si, crear de todos modos"
        onClose={() => setLongRouteConfirmation(null)}
        onConfirm={() => {
          const pending = longRouteConfirmation;
          setLongRouteConfirmation(null);
          const slot = pending
            ? slots.find((item) => item.id === pending.slotId)
            : null;
          if (slot) void onCreateSubgroup(slot, true);
        }}
      >
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-red-100 text-red-700">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 8v5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M12 17h.01"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M10.3 4.1 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold">
              {longRouteConfirmation
                ? activityDraftBySlot[longRouteConfirmation.slotId]
                    ?.selectedPlace?.name || "Este lugar"
                : "Este lugar"}{" "}
              esta a mas de 1 hora desde {routeOriginLabel}.
            </p>
            <p className="mt-1 text-sm">
              {longRouteConfirmation &&
              activityDraftBySlot[longRouteConfirmation.slotId]?.selectedPlace
                ?.routeDurationText
                ? `Google estima aproximadamente ${activityDraftBySlot[longRouteConfirmation.slotId]?.selectedPlace?.routeDurationText} de traslado.`
                : "El traslado estimado supera el limite recomendado."}{" "}
              Confirma solo si esta distancia tiene sentido para este bloque de
              subgrupo.
            </p>
          </div>
        </div>
      </ActionModal>

      {chatSubgroup && (
        <SubgroupChatDrawer
          open={chatSubgroup !== null}
          onClose={() => setChatSubgroup(null)}
          groupId={groupId}
          slotId={chatSubgroup.slotId}
          subgroupId={chatSubgroup.subgroupId}
          subgroupName={chatSubgroup.name}
          socket={socket}
          isSocketConnected={isSocketConnected}
          accessToken={accessToken}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          participants={(
            slots
              .find((s) => s.id === chatSubgroup.slotId)
              ?.subgroups.find((sg) => sg.id === chatSubgroup.subgroupId)
              ?.members ?? []
          ).map((m, i) => ({
            id: String(m.user_id),
            name: m.usuarios?.nombre ?? `Usuario ${m.user_id}`,
            color: [
              "#7A4FD6",
              "#1E6FD9",
              "#35C56A",
              "#F59E0B",
              "#EF4444",
              "#06B6D4",
            ][i % 6],
            avatarUrl: m.usuarios?.avatar_url ?? null,
          }))}
        />
      )}
    </>
  );
}
