import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  clearCurrentGroup,
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
} from "../../services/groups";
import type { ItineraryDay } from "../../services/groups";
import { mapsService } from "../../services/maps";
import {
  proposalsService,
  type ProposalComment,
  type VoteResult,
} from "../../services/proposals";
import { useAuth } from "../../context/useAuth";
import {
  AppLayout,
  RightPanelDashboard,
  SidebarDashboard,
} from "../../components/layout/AppLayout";
import { ChatDrawer } from "../../components/chat/ChatDrawer";
import { DayView } from "../../components/ui/DayView";
import type {
  Activity as DayActivity,
  DayViewHandle,
} from "../../components/ui/DayView";
import { ComparisonPage } from "../Comparison/ComparisonPage";
import { ProposalDetailModal } from "../../components/ProposalDetailModal/ProposalDetailModal";
import { ConfirmProposalModal } from "../../components/ConfirmProposalModal/ConfirmProposalModal";
import { ActivityProposalModal } from "../../components/ActivityProposalModal/ActivityProposalModal";
import { BudgetDashboard } from "../../components/budget/BudgetDashboard";
import { budgetService, type BudgetSummary } from "../../services/budget";
import {
  contextLinksService,
  type ContextEntityRef,
  type ContextEntitySummary,
  type ContextLink,
} from "../../services/context-links";
import { DocumentVaultPanel } from "../../components/documents/DocumentVaultPanel";
import { SubgroupSchedulePanel } from "../../components/subgroups/SubgroupSchedulePanel";
import {
  subgroupScheduleService,
  type SubgroupSlot,
} from "../../services/subgroups";
import { useSocket } from "../../hooks/useSocket";
import type { Group, TravelStartLocation } from "../../types/groups";

function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <polyline
        points="7 10 12 15 17 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="15"
        x2="12"
        y2="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
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

function IconInfo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <line
        x1="12"
        y1="8"
        x2="12"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="16"
        x2="12.01"
        y2="16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface SwitchingGroupState {
  id?: string | number;
  nombre?: string | null;
  destino?: string | null;
  destino_formatted_address?: string | null;
  destino_photo_url?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  myRole?: string | null;
}

function DashboardSwitchLoading({
  group,
}: {
  group?: SwitchingGroupState | Group | null;
}) {
  const title = group?.nombre || "Cargando viaje";
  const destination =
    group?.destino ||
    group?.destino_formatted_address ||
    "Preparando información del destino";
  const imageUrl = group?.destino_photo_url;
  const typedGroup = group as Group | SwitchingGroupState | null | undefined;
  const startDate = typedGroup?.fecha_inicio
    ? new Date(typedGroup.fecha_inicio)
    : null;
  const endDate = typedGroup?.fecha_fin ? new Date(typedGroup.fecha_fin) : null;
  const tripDays =
    startDate && endDate
      ? Math.max(
          1,
          Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) +
            1,
        )
      : null;
  const memberCount =
    Number((typedGroup as Group | undefined)?.memberCount ?? 0) || null;
  const maxMembers =
    Number((typedGroup as Group | undefined)?.maximo_miembros ?? 0) || null;
  const totalBudgetRaw = (typedGroup as Group | undefined)?.presupuesto_total;
  const totalBudget =
    totalBudgetRaw != null && totalBudgetRaw !== ""
      ? Number(totalBudgetRaw)
      : null;
  const loadingDetails = [
    {
      label: "Itinerario",
      value:
        tripDays != null
          ? `${tripDays} dia${tripDays === 1 ? "" : "s"}`
          : "Fechas en preparacion",
      hint:
        startDate && endDate
          ? `${typedGroup?.fecha_inicio} -> ${typedGroup?.fecha_fin}`
          : "Calculando rango del viaje",
    },
    {
      label: "Participantes",
      value:
        memberCount != null && maxMembers != null
          ? `${memberCount} / ${maxMembers}`
          : memberCount != null
            ? `${memberCount} personas`
            : "Sin conteo disponible",
      hint:
        maxMembers != null
          ? "Integrantes actuales y capacidad"
          : "Cargando miembros del grupo",
    },
    {
      label: "Presupuesto",
      value:
        totalBudget != null && Number.isFinite(totalBudget)
          ? `$${totalBudget.toLocaleString("es-MX")}`
          : "Sin presupuesto",
      hint:
        totalBudget != null && Number.isFinite(totalBudget)
          ? "Monto total definido para el viaje"
          : "Cargando presupuesto del grupo",
    },
  ];

  return (
    <div className="flex flex-1 items-center justify-center bg-[#F0EEF8] px-6 py-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_60px_rgba(30,10,78,0.14)]">
        <div className="relative h-48 overflow-hidden bg-purpleNavbar">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={destination}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E6FD9] via-[#7A4FD6] to-[#1E0A4E]">
              <span className="font-heading text-6xl font-bold text-white/70">
                {title[0] ?? "V"}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E0A4E]/95 via-[#1E0A4E]/45 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6">
            <p className="font-body text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
              Cambiando de grupo
            </p>
            <h2 className="mt-1 truncate font-heading text-2xl font-bold text-white">
              {title}
            </h2>
            <p className="mt-1 line-clamp-2 font-body text-sm text-white/70">
              {destination}
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-bluePrimary/10 text-bluePrimary">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </div>
            <div>
              <p className="font-heading text-base font-bold text-purpleNavbar">
                Cargando información del viaje...
              </p>
              <p className="mt-1 font-body text-sm leading-relaxed text-gray500">
                Estamos actualizando itinerario, participantes, presupuesto y
                chat del grupo seleccionado.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {loadingDetails.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"
              >
                <p className="font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                  {item.label}
                </p>
                <p className="mt-1 font-heading text-base font-bold text-[#1E0A4E]">
                  {item.value}
                </p>
                <p className="mt-1 font-body text-xs text-[#64748B]">
                  {item.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-bluePrimary/10">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          className="text-bluePrimary"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="16"
            y1="2"
            x2="16"
            y2="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="2"
            x2="8"
            y2="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="3"
            y1="10"
            x2="21"
            y2="10"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1="8"
            y1="14"
            x2="16"
            y2="14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="18"
            x2="12"
            y2="18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="mb-2 font-heading text-lg font-bold text-purpleNavbar">
        Tu itinerario está vacío
      </h3>
      <p className="mb-6 max-w-xs font-body text-sm leading-relaxed text-gray500">
        Empieza proponiendo actividades, vuelos u hoteles para este día. El
        grupo podrá votar y confirmar.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-bluePrimary px-5 py-3 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <IconPlus size={14} />
        Proponer primera actividad
      </button>
    </div>
  );
}

function HeroCard({
  activeDay,
  totalDays,
  selectedDay,
  group,
  onAdd,
  onExportPdf,
  canManageSubgroups,
  onOpenSubgroups,
}: {
  activeDay: number | null;
  totalDays: number;
  selectedDay?: ItineraryDay;
  group: ReturnType<typeof getCurrentGroup> | null;
  onAdd: () => void;
  onExportPdf: () => void;
  canManageSubgroups?: boolean;
  onOpenSubgroups?: () => void;
}) {
  const activities = selectedDay?.activities ?? [];
  const pending = activities.filter(
    (activity) => activity.status === "pendiente",
  ).length;
  const destination =
    group?.destino || group?.destino_formatted_address || "Destino pendiente";
  const dateLabel =
    selectedDay?.date?.toUpperCase() ||
    group?.fecha_inicio ||
    "Fecha pendiente";
  const heroImage =
    group?.destino_photo_url ||
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=400&fit=crop";

  return (
    <div className="relative mb-4 h-52 shrink-0 overflow-hidden rounded-2xl">
      <img
        src={heroImage}
        alt={destination}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="absolute left-4 top-4 flex gap-2">
        <span className="rounded-full bg-white/20 px-3 py-1 font-body text-[11px] font-bold text-white backdrop-blur-sm">
          {activeDay !== null
            ? `DÍA ${activeDay} / ${totalDays}`
            : `${destination.toUpperCase()}`}
        </span>
        <span className="rounded-full bg-white/20 px-3 py-1 font-body text-[11px] font-bold text-white backdrop-blur-sm">
          {dateLabel}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
        <h1 className="mb-1 font-heading text-[28px] font-bold leading-tight text-white">
          {activeDay !== null ? `Día ${activeDay}` : destination}
        </h1>
        <p className="mb-3 font-body text-[13px] text-white/70">
          {activities.length} actividad{activities.length !== 1 ? "es" : ""}{" "}
          planeada{activities.length !== 1 ? "s" : ""} · {pending} pendiente
          {pending !== 1 ? "s" : ""} de confirmación
        </p>
        <div className="flex gap-2">
          <button
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            <IconDownload size={13} />
            Exportar PDF
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-greenAccent px-4 py-2 font-body text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <IconPlus size={13} />
            Proponer actividad
          </button>
          {canManageSubgroups && onOpenSubgroups && (
            <button
              onClick={onOpenSubgroups}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/50 bg-white/10 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Horario subgrupos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineStrip({
  activeDay,
  date,
  activities = [],
}: {
  activeDay: number | null;
  date?: string;
  activities?: DayActivity[];
}) {
  if (activeDay === null) {
    return (
      <div className="mb-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bluePrimary/10">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="text-bluePrimary"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="18"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="16"
              y1="2"
              x2="16"
              y2="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="2"
              x2="8"
              y2="6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="3"
              y1="10"
              x2="21"
              y2="10"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
        <p className="text-center font-body text-sm text-gray500">
          Selecciona un día para ver su progreso
        </p>
      </div>
    );
  }

  const confirmed = activities.filter(
    (activity) => activity.status === "confirmada",
  ).length;
  const pending = activities.filter(
    (activity) => activity.status === "pendiente",
  ).length;
  const total = activities.length;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const transport = activities.filter(
    (activity) => activity.category === "transporte",
  ).length;
  const lodging = activities.filter(
    (activity) => activity.category === "hospedaje",
  ).length;
  const acts = activities.filter(
    (activity) => activity.category === "actividad",
  ).length;
  const sortedActivities = [...activities].sort((left, right) => {
    const leftTime = left.startsAt
      ? new Date(left.startsAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const rightTime = right.startsAt
      ? new Date(right.startsAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.title.localeCompare(right.title, "es");
  });
  const firstActivity = sortedActivities[0];
  const lastActivity = sortedActivities[sortedActivities.length - 1];

  return (
    <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4">
      <div className="flex items-start gap-5">
        <div className="shrink-0">
          <span className="inline-flex rounded-full bg-bluePrimary/10 px-3 py-1 font-body text-[11px] font-bold leading-none text-bluePrimary">
            DÍA {activeDay}
            {date ? ` · ${date.toUpperCase()}` : ""}
          </span>
          <p className="mt-2 font-heading text-sm font-bold leading-none text-purpleNavbar">
            Progreso del día
          </p>
          <p className="mt-1 font-body text-xs leading-none text-gray500">
            {confirmed} de {total} actividades confirmadas
          </p>
        </div>

        <div className="flex-1 pt-0.5">
          <div className="h-3 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, #1E6FD9, #35C56A)",
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-greenAccent" />
              Confirmadas · {confirmed}
            </span>
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-purpleMedium" />
              Por confirmar · {pending}
            </span>
          </div>
        </div>
      </div>

      {(transport > 0 || lodging > 0 || acts > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {transport > 0 && (
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] leading-none text-bluePrimary">
              {transport} traslado{transport !== 1 ? "s" : ""}
            </span>
          )}
          {lodging > 0 && (
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] leading-none text-bluePrimary">
              {lodging} hospedaje{lodging !== 1 ? "s" : ""}
            </span>
          )}
          {acts > 0 && (
            <span className="rounded-full bg-surface px-3 py-1 font-body text-[11px] leading-none text-purpleMedium">
              {acts} actividad{acts !== 1 ? "es" : ""}
            </span>
          )}
          {firstActivity && (
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] leading-none text-bluePrimary">
              Primera: {firstActivity.time}
            </span>
          )}
          {lastActivity && lastActivity.id !== firstActivity?.id && (
            <span className="rounded-full bg-[#F3EEFF] px-3 py-1 font-body text-[11px] leading-none text-purpleMedium">
              Ultima: {lastActivity.time}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function toDateKey(value?: string | null): string | null {
  if (!value) return null;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function formatSlotTimeRange(startsAt: string, endsAt: string): string {
  const format = (value: string) =>
    new Date(value).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Mexico_City",
    });
  return `${format(startsAt)} - ${format(endsAt)}`;
}

function subgroupSlotsByDay(
  slots: SubgroupSlot[],
  tripStartDate?: string | null,
  currentUserId?: string | number | null,
): Record<number, DayActivity[]> {
  const startKey = toDateKey(tripStartDate);
  if (!startKey) return {};

  return slots.reduce<Record<number, DayActivity[]>>((acc, slot) => {
    const slotDayKey = toDateKey(slot.starts_at);
    if (!slotDayKey) return acc;

    const start = new Date(`${startKey}T00:00:00.000Z`).getTime();
    const current = new Date(`${slotDayKey}T00:00:00.000Z`).getTime();
    const diffDays = Math.floor((current - start) / 86_400_000);
    if (!Number.isFinite(diffDays) || diffDays < 0) return acc;

    const dayNumber = diffDays + 1;
    const participantCount = new Set(
      slot.memberships.map((membership) => String(membership.user_id)),
    ).size;
    const currentMembership = slot.memberships.find(
      (membership) =>
        String(membership.user_id) === String(currentUserId ?? ""),
    );
    const targetSubgroupId =
      currentMembership?.subgroup_id != null
        ? Number(currentMembership.subgroup_id)
        : (slot.subgroups[0]?.id ?? null);
    const activity: DayActivity = {
      id: `subgroup-slot-${slot.id}`,
      kind: "subgroup-slot",
      title: slot.title || "Horario de subgrupos",
      description:
        slot.description || "Bloque reservado para planes por subgrupo.",
      category: "actividad",
      status: "confirmada",
      price: 0,
      currency: "MXN",
      time: formatSlotTimeRange(slot.starts_at, slot.ends_at),
      image: "",
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      createdBy: String(slot.created_by),
      subgroupSlot: {
        slotId: slot.id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        groupCount: slot.subgroups.length,
        participantCount,
        targetSubgroupId,
      },
    };
    acc[dayNumber] = [...(acc[dayNumber] ?? []), activity];
    return acc;
  }, {});
}

function mergeSubgroupSlotsIntoDays(
  days: ItineraryDay[],
  slots: SubgroupSlot[],
  tripStartDate?: string | null,
  currentUserId?: string | number | null,
): ItineraryDay[] {
  const byDay = subgroupSlotsByDay(slots, tripStartDate, currentUserId);
  return days.map((day) => ({
    ...day,
    activities: [...day.activities, ...(byDay[day.dayNumber] ?? [])],
  }));
}

function addDaysToDateKey(dateKey: string, daysToAdd: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastItineraryDay(
  tripStartDate: string | null | undefined,
  dayNumber: number,
): boolean {
  const startKey = toDateKey(tripStartDate);
  if (!startKey) return false;
  const dayKey = addDaysToDateKey(startKey, Math.max(0, dayNumber - 1));
  return dayKey < getTodayDateKey();
}

function InfoBanner({ memberCount }: { memberCount: number }) {
  const isSoloTrip = memberCount <= 1;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-bluePrimary/20 bg-[#EEF4FF] px-4 py-3">
      <span className="mt-0.5 shrink-0 text-bluePrimary">
        <IconInfo size={16} />
      </span>
      <div>
        <p className="font-body text-sm font-semibold leading-tight text-gray700">
          {isSoloTrip
            ? "Tus propuestas se confirman automaticamente"
            : "Acepta propuestas para confirmarlas"}
        </p>
        <p className="mt-0.5 font-body text-xs leading-relaxed text-gray500">
          {isSoloTrip
            ? "Como eres el unico integrante, cada propuesta nueva se aprueba en cuanto la creas."
            : "Las actividades con votos necesitan tu aprobacion para ser incluidas en el itinerario final del grupo."}
        </p>
      </div>
    </div>
  );
}

function BottomNavbar({
  activeTab,
  onTabChange,
  isReadOnly = false,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isReadOnly?: boolean;
}) {
  const tabs = [
    {
      id: "inicio",
      label: "Inicio",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="9 22 9 12 15 12 15 22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "buscar",
      label: "Buscar",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M21 21l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "comparar",
      label: "Comparar",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M18 20V10M12 20V4M6 20v-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "mapas",
      label: "Mapas",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <polygon
            points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="8"
            y1="2"
            x2="8"
            y2="18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="16"
            y1="6"
            x2="16"
            y2="22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "pagar",
      label: "Finanzas",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <line
            x1="12"
            y1="1"
            x2="12"
            y2="23"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "boveda",
      label: "Bóveda",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M21 8a2 2 0 00-2-2h-3l-2-2H10L8 6H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V8z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  const visibleTabs = isReadOnly
    ? tabs.filter((tab) => ["inicio", "pagar", "boveda"].includes(tab.id))
    : tabs;

  return (
    <div className="flex h-14 shrink-0 items-center justify-around border-t border-[#E2E8F0] bg-white px-4">
      {visibleTabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              "rounded-lg px-3 py-1 font-body text-[10px] font-medium transition-colors",
              isActive ? "text-bluePrimary" : "text-gray500 hover:text-gray700",
            ].join(" ")}
          >
            <span className="flex flex-col items-center gap-0.5">
              {tab.icon}
              <span>{tab.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MapsTabView({ days }: { days: ItineraryDay[] }) {
  const activities = days.flatMap((day) =>
    day.activities.map((activity) => ({
      ...activity,
      dayNumber: day.dayNumber,
      dayDate: day.date,
    })),
  );

  const withCoords = activities.filter(
    (activity) => activity.latitude != null && activity.longitude != null,
  );

  if (withCoords.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
        <p className="font-body text-sm text-gray500">
          No hay actividades con ubicacion para mostrar en mapas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {withCoords.map((activity) => (
        <div
          key={activity.id}
          className="rounded-2xl border border-[#E2E8F0] bg-white p-4"
        >
          <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-bluePrimary">
            Dia {activity.dayNumber} · {activity.dayDate}
          </p>
          <h3 className="mt-1 font-heading text-base font-bold text-purpleNavbar">
            {activity.title}
          </h3>
          <p className="mt-1 font-body text-sm text-gray500">
            {activity.location || "Ubicacion no disponible"}
          </p>
          {activity.routeDistanceText && activity.routeDurationText && (
            <p className="mt-2 font-body text-xs text-gray700">
              Ruta estimada: {activity.routeDistanceText} ·{" "}
              {activity.routeDurationText}
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-body text-xs font-semibold text-bluePrimary hover:underline"
          >
            Abrir en Google Maps →
          </a>
        </div>
      ))}
    </div>
  );
}

const ROUTE_TRAVEL_MODE = "DRIVE" as const;
const ROUTE_REQUEST_TIMEOUT_MS = 4500;
const DASHBOARD_AUX_REQUEST_TIMEOUT_MS = 6500;
const DASHBOARD_MAIN_REQUEST_TIMEOUT_MS = 8500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("La peticion tardo demasiado en responder"));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

function resolveRouteOrigin(
  group: Group | null,
  startLocation?: TravelStartLocation | null,
) {
  const startLat = startLocation?.latitude;
  const startLng = startLocation?.longitude;

  if (startLat != null && startLng != null) {
    return {
      lat: Number(startLat),
      lng: Number(startLng),
    };
  }

  if (
    group?.punto_partida_tipo === "hotel_reservado" &&
    group.punto_partida_latitud != null &&
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
}

async function enrichDaysWithRoutes(
  itineraryDays: ItineraryDay[],
  group: Group | null,
  token: string,
  startLocation?: TravelStartLocation | null,
): Promise<ItineraryDay[]> {
  const origin = resolveRouteOrigin(group, startLocation);

  if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) {
    return itineraryDays;
  }

  const routeTasks = itineraryDays.flatMap((day) =>
    day.activities
      .filter(
        (activity) => activity.latitude != null && activity.longitude != null,
      )
      .map(async (activity) => {
        try {
          const response = await withTimeout(
            mapsService.computeRoute(
              {
                originLat: origin.lat,
                originLng: origin.lng,
                destinationLat: Number(activity.latitude),
                destinationLng: Number(activity.longitude),
                travelMode: ROUTE_TRAVEL_MODE,
              },
              token,
            ),
            ROUTE_REQUEST_TIMEOUT_MS,
          );

          return {
            activityId: activity.id,
            routeDistanceText: response.data?.distanceText ?? null,
            routeDurationText:
              response.data?.durationText ??
              response.data?.staticDurationText ??
              null,
            routeTravelMode: ROUTE_TRAVEL_MODE,
          };
        } catch {
          return {
            activityId: activity.id,
            routeDistanceText: null,
            routeDurationText: null,
            routeTravelMode: null,
          };
        }
      }),
  );

  const routeResults = await Promise.all(routeTasks);
  const routeMap = new Map(routeResults.map((item) => [item.activityId, item]));

  return itineraryDays.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => {
      const route = routeMap.get(activity.id);
      if (!route) return activity;

      return {
        ...activity,
        routeDistanceText: route.routeDistanceText,
        routeDurationText: route.routeDurationText,
        routeTravelMode: route.routeTravelMode,
      };
    }),
  }));
}

interface DashboardUpdatedSocketPayload {
  grupoId?: number | string;
  groupId?: number | string;
  tipo?: string;
  entidadTipo?: string | null;
  entidadId?: number | string | null;
  actorUsuarioId?: number | string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

interface ProposalCommentSocketPayload {
  grupoId?: number | string;
  groupId?: number | string;
  proposalId?: number | string;
  entidadId?: number | string | null;
  comment?: Record<string, unknown> | null;
  commentId?: number | string | null;
}

const normalizeRealtimeProposalComment = (
  raw: Record<string, unknown> | null | undefined,
): ProposalComment | null => {
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
};

const otherEntityForActivity = (
  link: ContextLink,
  activityId: string,
): ContextEntitySummary | null => {
  if (link.entityA.type === "activity" && link.entityA.id === activityId)
    return link.entityB;
  if (link.entityB.type === "activity" && link.entityB.id === activityId)
    return link.entityA;
  return null;
};

const isActivityContextType = (type: ContextEntityRef["type"]): boolean =>
  type === "expense" || type === "document";

const applyVoteResultsToDays = (
  itineraryDays: ItineraryDay[],
  voteResultsByProposal: Record<string, VoteResult>,
): ItineraryDay[] =>
  itineraryDays.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => {
      const voteResult = activity.proposalId
        ? voteResultsByProposal[String(activity.proposalId)]
        : null;
      if (!voteResult) return activity;
      return {
        ...activity,
        hasVoted: Boolean(voteResult.mi_voto),
        myVote: voteResult.mi_voto ?? null,
      };
    }),
  }));

export function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { localUser, accessToken } = useAuth();
  const { socket, isConnected: isSocketConnected } = useSocket(accessToken);

  const location = useLocation();
  const routeState = location.state as {
    groupId?: string | number;
    switchingGroup?: SwitchingGroupState;
    activeTab?: string;
  } | null;
  const groupIdFromState =
    routeState?.groupId !== undefined && routeState?.groupId !== null
      ? String(routeState.groupId)
      : null;
  const switchingGroupFromState = routeState?.switchingGroup;

  const groupId = searchParams.get("groupId");
  const currentGroup = getCurrentGroup();

  const userName = localUser?.nombre || localUser?.email || "Usuario";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(routeState?.activeTab ?? "inicio");
  const [dashboardView, setDashboardView] = useState<"general" | "subgrupos">(
    "general",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [, setSubgroupSlots] = useState<SubgroupSlot[]>([]);
  const [editSubgroupSlotRequest, setEditSubgroupSlotRequest] = useState<{
    slotId: number;
    nonce: number;
  } | null>(null);
  const [focusSubgroupRequest, setFocusSubgroupRequest] = useState<{
    slotId: number;
    subgroupId?: number | null;
    nonce: number;
  } | null>(null);
  const [group, setGroup] = useState<typeof currentGroup>(currentGroup);
  const loadingGroupSnapshot = useMemo(() => {
    const current = currentGroup ?? null;
    const loaded = group ?? null;
    const switching = switchingGroupFromState ?? null;
    if (!current && !loaded && !switching) return null;
    return {
      ...(current ?? {}),
      ...(loaded ?? {}),
      ...(switching ?? {}),
    } as Group & SwitchingGroupState;
  }, [currentGroup, group, switchingGroupFromState]);
  const [members, setMembers] = useState<
    Parameters<typeof RightPanelDashboard>[0]["members"]
  >([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(
    null,
  );
  const dayRefs = useRef<Record<number, DayViewHandle | null>>({});
  const collaborativeRefreshTimerRef = useRef<number | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivityDay, setSelectedActivityDay] = useState<number | null>(
    null,
  );
  const [editingActivity, setEditingActivity] = useState<DayActivity | null>(
    null,
  );
  const [, setAcceptErrorActivityIds] = useState<Record<string, boolean>>({});
  const [, setLockedProposalIds] = useState<Record<string, boolean>>({});
  const [, setLockErrorActivityIds] = useState<Record<string, boolean>>({});
  const [voteResultByProposal, setVoteResultByProposal] = useState<
    Record<string, VoteResult>
  >({});
  const [adminDecisionBusyProposalId, setAdminDecisionBusyProposalId] =
    useState<string | null>(null);
  const [adminDecisionBusyType, setAdminDecisionBusyType] = useState<
    "aprobar" | "rechazar" | null
  >(null);
  const [subgroupQuickBusyKey, setSubgroupQuickBusyKey] = useState<
    string | null
  >(null);
  const [selectedProposal, setSelectedProposal] = useState<DayActivity | null>(
    null,
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedCommentsProposalId, setExpandedCommentsProposalId] = useState<
    string | null
  >(null);
  const [voteHistoryActivity, setVoteHistoryActivity] =
    useState<DayActivity | null>(null);
  const [chatProposalActivity, setChatProposalActivity] =
    useState<DayActivity | null>(null);
  const [commentsByProposal, setCommentsByProposal] = useState<
    Record<string, ProposalComment[]>
  >({});
  const [commentDraftByProposal, setCommentDraftByProposal] = useState<
    Record<string, string>
  >({});
  const [loadingCommentsProposalId, setLoadingCommentsProposalId] = useState<
    string | null
  >(null);
  const [sendingCommentProposalId, setSendingCommentProposalId] = useState<
    string | null
  >(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [visibleCommentsCountByProposal, setVisibleCommentsCountByProposal] =
    useState<Record<string, number>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [contextLinks, setContextLinks] = useState<ContextLink[]>([]);
  const chatOpenRef = useRef(chatOpen);

  // Keep ref in sync so the unread socket listener never captures stale chatOpen
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  // Increment unread badge when a chat message arrives while the drawer is closed
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => {
      if (!chatOpenRef.current) setChatUnread((c) => c + 1);
    };
    socket.on("chat_message", handleNewMessage);
    return () => {
      socket.off("chat_message", handleNewMessage);
    };
  }, [socket]);

  const handleDayChange = useCallback(
    (dayNumber: number) => {
      const next = activeDay === dayNumber ? null : dayNumber;
      setActiveDay(next);
      setExpandedDay(next);
    },
    [activeDay],
  );

  const openActivityModalForDay = useCallback((dayNumber: number) => {
    setActiveDay(dayNumber);
    setExpandedDay(dayNumber);
    setSelectedActivityDay(dayNumber);
    setShowActivityModal(true);
  }, []);

  // const handleDayExpand = useCallback((dayNumber: number) => {
  //   setExpandedDay((prev) => prev === dayNumber ? null : dayNumber)
  // }, [])

  const isEmpty = days.length === 0;
  const resolvedGroupId =
    groupIdFromState ||
    groupId ||
    (currentGroup?.id ? String(currentGroup.id) : null);
  const safeMembers = useMemo(
    () =>
      (Array.isArray(members) ? members : []).filter(
        (member): member is NonNullable<NonNullable<typeof members>[number]> =>
          Boolean(member),
      ),
    [members],
  );
  const uniqueMemberCount = new Set(
    safeMembers.map((member) => String(member.usuario_id ?? member.id)),
  ).size;
  const currentMember = safeMembers.find(
    (member) =>
      String(member.usuario_id ?? member.id) === String(localUser?.id_usuario),
  );
  const currentUserRole =
    currentMember?.rol ?? group?.myRole ?? currentGroup?.myRole ?? "viajero";
  const isCurrentUserAdmin =
    currentUserRole === "admin" || currentUserRole === "organizador";

  // Modo solo lectura: viaje cerrado, archivado o finalizado (CU-2.10 / CU-2.11)
  const isReadOnly = ["cerrado", "archivado", "finalizado"].includes(
    String(group?.estado ?? currentGroup?.estado ?? "").toLowerCase(),
  );

  useEffect(() => {
    if (!isReadOnly) return;
    if (["buscar", "comparar", "mapas"].includes(activeTab)) {
      setActiveTab("inicio");
    }
    if (dashboardView === "subgrupos") {
      setDashboardView("general");
    }
  }, [activeTab, dashboardView, isReadOnly]);
  const budgetFromSummary = Number(budgetSummary?.totalBudget ?? NaN);
  const hasSummaryBudget = Number.isFinite(budgetFromSummary);
  const groupBudgetRaw =
    group?.presupuesto_total ?? currentGroup?.presupuesto_total ?? 0;
  const groupBudgetValue = Number(groupBudgetRaw ?? 0);
  const effectiveBudgetValue = hasSummaryBudget
    ? budgetFromSummary
    : groupBudgetValue;
  const requiresInitialBudget =
    !Number.isFinite(effectiveBudgetValue) || effectiveBudgetValue <= 0;
  const handleSubgroupScheduleChanged = useCallback((slots: SubgroupSlot[]) => {
    setSubgroupSlots(slots);
  }, []);

  const chatParticipants = useMemo(() => {
    const colors = ["#1E6FD9", "#35C56A", "#7A4FD6", "#F59E0B"];
    const seen = new Set<string>();
    return safeMembers
      .filter((m) => {
        const key = String(m.usuario_id ?? m.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m, i) => ({
        id: String(m.usuario_id ?? m.id),
        name: m.nombre || m.email || "Usuario",
        color: colors[i % colors.length],
        avatarUrl: m.avatar_url ?? null,
      }));
  }, [safeMembers]);

  const getLinksForActivity = useCallback(
    (activityId: string) => {
      return contextLinks
        .map((link) => otherEntityForActivity(link, activityId))
        .filter(
          (entity): entity is ContextEntitySummary =>
            entity !== null && isActivityContextType(entity.type),
        );
    },
    [contextLinks],
  );

  const daysWithContext = useMemo(
    () =>
      days.map((day) => ({
        ...day,
        activities: day.activities.map((activity) => ({
          ...activity,
          linkedContext: getLinksForActivity(activity.id),
        })),
      })),
    [days, getLinksForActivity],
  );

  const selectedDayWithContext =
    activeDay !== null
      ? daysWithContext.find((day) => day.dayNumber === activeDay)
      : undefined;

  const openActivityEditor = (activity: DayActivity) => {
    lockProposalForActivity(activity);
    setEditingActivity(activity);
    setShowActivityModal(true);
  };

  useEffect(() => {
    const resolvedGroupId =
      groupIdFromState ||
      groupId ||
      (currentGroup?.id ? String(currentGroup.id) : null);

    if (!resolvedGroupId) {
      navigate("/my-trips");
      return;
    }

    if (!accessToken) return;

    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);

        const itineraryRes = await withTimeout(
          groupsService.getItinerary(resolvedGroupId, accessToken),
          DASHBOARD_MAIN_REQUEST_TIMEOUT_MS,
        );
        const [
          groupResult,
          membersResult,
          votesResult,
          budgetResult,
          contextResult,
          travelContextResult,
          subgroupResult,
        ] = await Promise.allSettled([
          withTimeout(
            groupsService.getGroupDetails(resolvedGroupId, accessToken),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
          withTimeout(
            groupsService.getMembers(resolvedGroupId, accessToken),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
          withTimeout(
            proposalsService.getVoteResults(
              String(resolvedGroupId),
              accessToken,
            ),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
          withTimeout(
            budgetService.getDashboard(String(resolvedGroupId), accessToken),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
          withTimeout(
            Promise.all([
              contextLinksService.list(resolvedGroupId, accessToken),
              contextLinksService.options(resolvedGroupId, accessToken),
            ]),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
          withTimeout(
            groupsService.getTravelContext(resolvedGroupId, accessToken),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
          withTimeout(
            subgroupScheduleService.getSchedule(
              String(resolvedGroupId),
              accessToken,
            ),
            DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
          ),
        ]);

        const groupData =
          groupResult.status === "fulfilled" ? groupResult.value.group : null;

        const startLocation =
          travelContextResult.status === "fulfilled"
            ? travelContextResult.value.data?.startLocation
            : null;
        const daysWithRoutes = await enrichDaysWithRoutes(
          itineraryRes.days,
          groupData,
          accessToken,
          startLocation,
        );
        const nextVotesMap = (
          votesResult.status === "fulfilled" ? votesResult.value.results : []
        ).reduce<Record<string, VoteResult>>((acc, item: VoteResult) => {
          acc[String(item.id_propuesta)] = item;
          return acc;
        }, {});

        if (isMounted) {
          if (groupResult.status === "fulfilled") {
            setGroup(groupResult.value.group);
            saveCurrentGroup(groupResult.value.group);
          }
          if (membersResult.status === "fulfilled") {
            setMembers(membersResult.value.members ?? []);
          }
          const nextSubgroupSlots =
            subgroupResult.status === "fulfilled"
              ? (subgroupResult.value.slots ?? [])
              : [];
          setSubgroupSlots(nextSubgroupSlots);
          setDays(
            mergeSubgroupSlotsIntoDays(
              applyVoteResultsToDays(daysWithRoutes, nextVotesMap),
              nextSubgroupSlots,
              groupData?.fecha_inicio ?? currentGroup?.fecha_inicio ?? null,
              localUser?.id_usuario ?? null,
            ),
          );
          setVoteResultByProposal(nextVotesMap);
          if (budgetResult.status === "fulfilled") {
            setBudgetSummary(budgetResult.value.summary);
          }
          if (contextResult.status === "fulfilled") {
            setContextLinks(contextResult.value[0].links);
          }
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [
    groupIdFromState,
    groupId,
    currentGroup?.id,
    currentGroup?.fecha_inicio,
    localUser?.id_usuario,
    accessToken,
    navigate,
  ]);

  const reloadDashboard = useCallback(async () => {
    const resolvedGroupId =
      groupIdFromState ||
      groupId ||
      (currentGroup?.id ? String(currentGroup.id) : null);

    if (!resolvedGroupId || !accessToken) return;

    const itineraryRes = await withTimeout(
      groupsService.getItinerary(resolvedGroupId, accessToken),
      DASHBOARD_MAIN_REQUEST_TIMEOUT_MS,
    );
    const [
      groupResult,
      membersResult,
      votesResult,
      budgetResult,
      contextResult,
      travelContextResult,
      subgroupResult,
    ] = await Promise.allSettled([
      withTimeout(
        groupsService.getGroupDetails(resolvedGroupId, accessToken),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
      withTimeout(
        groupsService.getMembers(resolvedGroupId, accessToken),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
      withTimeout(
        proposalsService.getVoteResults(String(resolvedGroupId), accessToken),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
      withTimeout(
        budgetService.getDashboard(String(resolvedGroupId), accessToken),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
      withTimeout(
        Promise.all([
          contextLinksService.list(resolvedGroupId, accessToken),
          contextLinksService.options(resolvedGroupId, accessToken),
        ]),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
      withTimeout(
        groupsService.getTravelContext(resolvedGroupId, accessToken),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
      withTimeout(
        subgroupScheduleService.getSchedule(
          String(resolvedGroupId),
          accessToken,
        ),
        DASHBOARD_AUX_REQUEST_TIMEOUT_MS,
      ),
    ]);

    const groupData =
      groupResult.status === "fulfilled" ? groupResult.value.group : null;

    const startLocation =
      travelContextResult.status === "fulfilled"
        ? travelContextResult.value.data?.startLocation
        : null;
    const daysWithRoutes = await enrichDaysWithRoutes(
      itineraryRes.days,
      groupData,
      accessToken,
      startLocation,
    );
    const nextVotesMap = (
      votesResult.status === "fulfilled" ? votesResult.value.results : []
    ).reduce<Record<string, VoteResult>>((acc, item: VoteResult) => {
      acc[String(item.id_propuesta)] = item;
      return acc;
    }, {});

    if (groupResult.status === "fulfilled") {
      setGroup(groupResult.value.group);
      saveCurrentGroup(groupResult.value.group);
    }
    if (membersResult.status === "fulfilled") {
      setMembers(membersResult.value.members ?? []);
    }
    const nextSubgroupSlots =
      subgroupResult.status === "fulfilled"
        ? (subgroupResult.value.slots ?? [])
        : [];
    setSubgroupSlots(nextSubgroupSlots);
    setDays(
      mergeSubgroupSlotsIntoDays(
        applyVoteResultsToDays(daysWithRoutes, nextVotesMap),
        nextSubgroupSlots,
        groupData?.fecha_inicio ?? currentGroup?.fecha_inicio ?? null,
        localUser?.id_usuario ?? null,
      ),
    );
    if (budgetResult.status === "fulfilled") {
      setBudgetSummary(budgetResult.value.summary);
    }
    if (contextResult.status === "fulfilled") {
      setContextLinks(contextResult.value[0].links);
    }
    setVoteResultByProposal(nextVotesMap);
  }, [
    groupIdFromState,
    groupId,
    currentGroup?.id,
    currentGroup?.fecha_inicio,
    localUser?.id_usuario,
    accessToken,
  ]);

  const refreshCommentsForProposal = useCallback(
    async (proposalId: string) => {
      if (!accessToken || !resolvedGroupId) return;

      try {
        setLoadingCommentsProposalId((current) => current ?? proposalId);
        const response = await proposalsService.getComments(
          String(resolvedGroupId),
          proposalId,
          accessToken,
        );
        setCommentsByProposal((prev) => ({
          ...prev,
          [proposalId]: response.comments ?? [],
        }));
      } catch (error) {
        console.error("Error actualizando comentarios colaborativos:", error);
      } finally {
        setLoadingCommentsProposalId((current) =>
          current === proposalId ? null : current,
        );
      }
    },
    [accessToken, resolvedGroupId],
  );

  useEffect(() => {
    if (!socket || !resolvedGroupId || !accessToken) return;

    const scheduleCollaborativeRefresh = (
      payload?: DashboardUpdatedSocketPayload,
    ) => {
      const payloadGroupId = payload?.grupoId ?? payload?.groupId;
      if (
        payloadGroupId !== undefined &&
        String(payloadGroupId) !== String(resolvedGroupId)
      )
        return;

      if (collaborativeRefreshTimerRef.current !== null) {
        window.clearTimeout(collaborativeRefreshTimerRef.current);
      }

      collaborativeRefreshTimerRef.current = window.setTimeout(() => {
        void (async () => {
          try {
            await reloadDashboard();

            const tipo = String(payload?.tipo ?? "");
            const isCommentEvent =
              tipo.startsWith("comentario_") ||
              payload?.entidadTipo === "comentario";
            const proposalId =
              payload?.entidadTipo === "propuesta" &&
              payload?.entidadId !== null &&
              payload?.entidadId !== undefined
                ? String(payload.entidadId)
                : null;

            if (
              isCommentEvent &&
              proposalId &&
              expandedCommentsProposalId === proposalId
            ) {
              await refreshCommentsForProposal(proposalId);
            }
          } catch (error) {
            console.error("Error actualizando dashboard colaborativo:", error);
          }
        })();
      }, 250);
    };

    const handleDashboardUpdated = (payload: DashboardUpdatedSocketPayload) => {
      const tipo = String(payload?.tipo ?? "");
      if (tipo === "grupo_eliminado") {
        clearCurrentGroup();
        alert(
          "Este grupo fue eliminado por el administrador. Te enviaremos a Mis viajes.",
        );
        navigate("/my-trips");
        return;
      }
      scheduleCollaborativeRefresh(payload);
    };

    const handleVoteUpdated = (payload: DashboardUpdatedSocketPayload) => {
      scheduleCollaborativeRefresh(payload);
    };

    socket.on("dashboard_updated", handleDashboardUpdated);
    socket.on("vote_updated", handleVoteUpdated);
    socket.on("checkout_updated", handleDashboardUpdated);
    socket.on("group_deleted", handleDashboardUpdated);

    return () => {
      if (collaborativeRefreshTimerRef.current !== null) {
        window.clearTimeout(collaborativeRefreshTimerRef.current);
        collaborativeRefreshTimerRef.current = null;
      }
      socket.off("dashboard_updated", handleDashboardUpdated);
      socket.off("vote_updated", handleVoteUpdated);
      socket.off("checkout_updated", handleDashboardUpdated);
      socket.off("group_deleted", handleDashboardUpdated);
    };
  }, [
    socket,
    resolvedGroupId,
    accessToken,
    reloadDashboard,
    expandedCommentsProposalId,
    refreshCommentsForProposal,
    navigate,
  ]);

  useEffect(() => {
    if (!socket || !resolvedGroupId) return;

    const belongsToGroup = (payload: ProposalCommentSocketPayload) => {
      const payloadGroupId = payload.grupoId ?? payload.groupId;
      return (
        payloadGroupId === undefined ||
        String(payloadGroupId) === String(resolvedGroupId)
      );
    };

    const getProposalId = (payload: ProposalCommentSocketPayload) =>
      String(payload.proposalId ?? payload.entidadId ?? "");

    const handleCommentCreated = (payload: ProposalCommentSocketPayload) => {
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

    const handleCommentUpdated = (payload: ProposalCommentSocketPayload) => {
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

    const handleCommentDeleted = (payload: ProposalCommentSocketPayload) => {
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

    socket.on("proposal_comment_created", handleCommentCreated);
    socket.on("proposal_comment_updated", handleCommentUpdated);
    socket.on("proposal_comment_deleted", handleCommentDeleted);

    return () => {
      socket.off("proposal_comment_created", handleCommentCreated);
      socket.off("proposal_comment_updated", handleCommentUpdated);
      socket.off("proposal_comment_deleted", handleCommentDeleted);
    };
  }, [socket, resolvedGroupId]);

  const handleDeleteActivity = useCallback(
    async (activityId: string) => {
      const resolvedGroupId =
        groupIdFromState ||
        groupId ||
        (currentGroup?.id ? String(currentGroup.id) : null);

      if (!resolvedGroupId || !accessToken) return;

      await groupsService.deleteActivity(
        String(resolvedGroupId),
        activityId,
        accessToken,
      );
      await reloadDashboard();
    },
    [groupIdFromState, groupId, currentGroup?.id, accessToken, reloadDashboard],
  );

  const handleOpenSubgroupSlot = useCallback(
    (slotId: number, subgroupId?: number | null) => {
      setActiveTab("inicio");
      setDashboardView("subgrupos");
      setFocusSubgroupRequest({
        slotId,
        subgroupId: subgroupId ?? null,
        nonce: Date.now(),
      });
    },
    [],
  );

  const handleEditSubgroupSlot = useCallback((slotId: number) => {
    setActiveTab("inicio");
    setDashboardView("subgrupos");
    setEditSubgroupSlotRequest({ slotId, nonce: Date.now() });
  }, []);

  const handleDeleteSubgroupSlot = useCallback(
    async (slotId: number) => {
      const resolvedGroupId =
        groupIdFromState ||
        groupId ||
        (currentGroup?.id ? String(currentGroup.id) : null);
      const busyKey = `slot-delete:${slotId}`;
      if (!resolvedGroupId || !accessToken || subgroupQuickBusyKey) return;
      if (!window.confirm("Eliminar este horario de subgrupos?")) return;
      try {
        setSubgroupQuickBusyKey(busyKey);
        await subgroupScheduleService.deleteSlot(
          String(resolvedGroupId),
          slotId,
          accessToken,
        );
        await reloadDashboard();
      } finally {
        setSubgroupQuickBusyKey(null);
      }
    },
    [
      groupIdFromState,
      groupId,
      currentGroup?.id,
      accessToken,
      reloadDashboard,
      subgroupQuickBusyKey,
    ],
  );

  const lockProposalForActivity = useCallback(
    (activity: DayActivity | null) => {
      if (!socket || !activity?.proposalId) return;
      socket.emit("item_lock", {
        propuestaId: activity.proposalId,
        tripId: groupId || currentGroup?.id,
      });
    },
    [socket, groupId, currentGroup?.id],
  );

  const unlockProposalForActivity = useCallback(
    (activity: DayActivity | null) => {
      if (!socket || !activity?.proposalId) return;
      socket.emit("item_unlock", {
        propuestaId: activity.proposalId,
        tripId: groupId || currentGroup?.id,
      });
    },
    [socket, groupId, currentGroup?.id],
  );

  const handleAcceptActivity = useCallback(
    async (activityId: string) => {
      const resolvedGroupId =
        groupIdFromState ||
        groupId ||
        (currentGroup?.id ? String(currentGroup.id) : null);

      if (!resolvedGroupId || !accessToken) return;

      const activity = days
        .flatMap((day) => day.activities)
        .find((item) => item.id === activityId);
      const proposalId = activity?.proposalId;

      if (!proposalId) {
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: true }));
        return;
      }

      try {
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: false }));

        await proposalsService.voteProposal(
          String(resolvedGroupId),
          proposalId,
          { voto: "a_favor" },
          accessToken,
        );
        await reloadDashboard();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        setAcceptErrorActivityIds((prev) => ({
          ...prev,
          [activityId]: !message.toLowerCase().includes("se mantiene igual"),
        }));
      }
    },
    [
      groupIdFromState,
      groupId,
      currentGroup?.id,
      accessToken,
      days,
      reloadDashboard,
    ],
  );

  const handleRejectActivity = useCallback(
    async (activityId: string) => {
      const resolvedGroupId =
        groupIdFromState ||
        groupId ||
        (currentGroup?.id ? String(currentGroup.id) : null);

      if (!resolvedGroupId || !accessToken) return;

      const activity = days
        .flatMap((day) => day.activities)
        .find((item) => item.id === activityId);
      const proposalId = activity?.proposalId;

      if (!proposalId) {
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: true }));
        return;
      }

      try {
        setAcceptErrorActivityIds((prev) => ({ ...prev, [activityId]: false }));
        await proposalsService.voteProposal(
          String(resolvedGroupId),
          proposalId,
          { voto: "en_contra" },
          accessToken,
        );
        await reloadDashboard();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        setAcceptErrorActivityIds((prev) => ({
          ...prev,
          [activityId]: !message.toLowerCase().includes("se mantiene igual"),
        }));
      }
    },
    [
      groupIdFromState,
      groupId,
      currentGroup?.id,
      accessToken,
      days,
      reloadDashboard,
    ],
  );

  const handleAdminDecision = useCallback(
    async (proposalId: string, decision: "aprobar" | "rechazar") => {
      const resolvedGroupId =
        groupIdFromState ||
        groupId ||
        (currentGroup?.id ? String(currentGroup.id) : null);
      if (!resolvedGroupId || !accessToken || adminDecisionBusyProposalId)
        return;
      try {
        setAdminDecisionBusyProposalId(proposalId);
        setAdminDecisionBusyType(decision);
        await proposalsService.applyAdminDecision(
          String(resolvedGroupId),
          proposalId,
          { decision },
          accessToken,
        );
        await reloadDashboard();
      } finally {
        setAdminDecisionBusyProposalId(null);
        setAdminDecisionBusyType(null);
      }
    },
    [
      groupIdFromState,
      groupId,
      currentGroup?.id,
      accessToken,
      reloadDashboard,
      adminDecisionBusyProposalId,
    ],
  );

  const openVoteHistoryModal = useCallback((activity: DayActivity) => {
    setVoteHistoryActivity(activity);
  }, []);

  const openChatModal = useCallback(
    async (activity: DayActivity) => {
      if (!activity.proposalId || !accessToken || !resolvedGroupId) return;

      setChatProposalActivity(activity);
      setExpandedCommentsProposalId(activity.proposalId);
      setVisibleCommentsCountByProposal((prev) => ({
        ...prev,
        [activity.proposalId!]: prev[activity.proposalId!] ?? 6,
      }));

      if (commentsByProposal[activity.proposalId]) return;

      try {
        setLoadingCommentsProposalId(activity.proposalId);
        const response = await proposalsService.getComments(
          String(resolvedGroupId),
          activity.proposalId,
          accessToken,
        );
        setCommentsByProposal((prev) => ({
          ...prev,
          [activity.proposalId!]: response.comments ?? [],
        }));
      } finally {
        setLoadingCommentsProposalId(null);
      }
    },
    [accessToken, resolvedGroupId, commentsByProposal],
  );

  const handleCreateComment = useCallback(
    async (proposalId: string) => {
      const content = commentDraftByProposal[proposalId]?.trim();
      if (!content || !accessToken || !resolvedGroupId) return;

      try {
        setSendingCommentProposalId(proposalId);
        const response = await proposalsService.addComment(
          String(resolvedGroupId),
          proposalId,
          { contenido: content },
          accessToken,
        );
        setCommentsByProposal((prev) => ({
          ...prev,
          [proposalId]: (prev[proposalId] ?? []).some(
            (item) => item.id === response.comment.id,
          )
            ? (prev[proposalId] ?? [])
            : [...(prev[proposalId] ?? []), response.comment],
        }));
        setCommentDraftByProposal((prev) => ({ ...prev, [proposalId]: "" }));
      } finally {
        setSendingCommentProposalId(null);
      }
    },
    [commentDraftByProposal, accessToken, resolvedGroupId],
  );

  const handleStartEditComment = useCallback((comment: ProposalComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.contenido);
  }, []);

  const handleCancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
  }, []);

  const handleSaveEditComment = useCallback(
    async (proposalId: string, commentId: string) => {
      const content = editingCommentText.trim();
      if (!content || !accessToken || !resolvedGroupId) return;

      const response = await proposalsService.updateComment(
        String(resolvedGroupId),
        proposalId,
        commentId,
        { contenido: content },
        accessToken,
      );

      setCommentsByProposal((prev) => ({
        ...prev,
        [proposalId]: (prev[proposalId] ?? []).map((item) =>
          item.id === commentId ? response.comment : item,
        ),
      }));
      setEditingCommentId(null);
      setEditingCommentText("");
    },
    [editingCommentText, accessToken, resolvedGroupId],
  );

  const handleDeleteComment = useCallback(
    async (proposalId: string, commentId: string) => {
      if (!accessToken || !resolvedGroupId) return;

      await proposalsService.deleteComment(
        String(resolvedGroupId),
        proposalId,
        commentId,
        accessToken,
      );
      setCommentsByProposal((prev) => ({
        ...prev,
        [proposalId]: (prev[proposalId] ?? []).filter(
          (item) => item.id !== commentId,
        ),
      }));
    },
    [accessToken, resolvedGroupId],
  );

  const handleExportConfirmedItineraryPdf = useCallback(() => {
    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const confirmedByDay = days
      .map((day) => ({
        dayNumber: day.dayNumber,
        date: day.date,
        activities: day.activities.filter(
          (activity) => activity.status === "confirmada",
        ),
      }))
      .filter((day) => day.activities.length > 0);

    if (confirmedByDay.length === 0) {
      window.alert("No hay actividades confirmadas para exportar.");
      return;
    }

    const generatedAt = new Date().toLocaleString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const sectionsHtml = confirmedByDay
      .map((day) => {
        const items = day.activities
          .map((activity, index) => {
            const routeText =
              activity.routeDistanceText && activity.routeDurationText
                ? `${activity.routeDistanceText} · ${activity.routeDurationText}`
                : "Ruta no disponible";

            return `
              <article class="activity-card">
                <div class="activity-index">${index + 1}</div>
                <div class="activity-content">
                  <h4>${escapeHtml(activity.title)}</h4>
                  <p class="desc">${escapeHtml(activity.description || "Sin descripción")}</p>
                  <div class="chips">
                    <span>Hora: ${escapeHtml(activity.time || "Hora pendiente")}</span>
                    <span>${escapeHtml(activity.location || "Ubicación no disponible")}</span>
                    <span>${escapeHtml(routeText)}</span>
                  </div>
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <section class="day-section">
            <div class="day-header">
              <h3>Día ${day.dayNumber}</h3>
              <span>${escapeHtml(day.date)}</span>
            </div>
            ${items}
          </section>
        `;
      })
      .join("");

    const tripName = escapeHtml(group?.nombre || "Itinerario");
    const tripDestination = escapeHtml(
      group?.destino || group?.destino_formatted_address || "Destino pendiente",
    );
    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Itinerario Confirmado - ${tripName}</title>
          <style>
            :root {
              --ink:#1E0A4E;
              --ink-soft:#2E1767;
              --blue:#1E6FD9;
              --blue-soft:#EEF4FF;
              --purple:#7A4FD6;
              --purple-soft:#F3EEFF;
              --green:#35C56A;
              --paper:#FFFFFF;
              --text:#243247;
              --muted:#64748B;
            }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body {
              margin:0;
              font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;
              color:var(--text);
              background:linear-gradient(145deg,#EBE6FA 0%,#EAF2FF 100%);
              padding:24px;
            }
            .sheet {
              max-width:900px;
              margin:0 auto;
              background:var(--paper);
              border:1px solid #D9E4F7;
              border-radius:20px;
              overflow:hidden;
              box-shadow:0 24px 56px rgba(30,10,78,0.18);
            }
            .hero {
              background:
                radial-gradient(circle at top right, rgba(122,79,214,.24), transparent 44%),
                radial-gradient(circle at top left, rgba(30,111,217,.22), transparent 38%),
                linear-gradient(120deg,var(--ink),var(--ink-soft));
              color:#fff;
              padding:28px 30px;
            }
            .hero h1 { margin:0; font-size:30px; line-height:1.05; letter-spacing:0; }
            .hero p { margin:9px 0 0; font-size:14px; color:rgba(255,255,255,.9); }
            .meta { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
            .meta span {
              background:rgba(255,255,255,.14);
              border:1px solid rgba(255,255,255,.28);
              padding:6px 10px;
              border-radius:999px;
              font-size:11px;
              font-weight:600;
            }
            .content { padding:18px 20px 26px; background:linear-gradient(180deg,#FAFCFF 0%,#FFFFFF 18%); }
            .day-section + .day-section { margin-top:14px; }
            .day-section {
              border:1px solid #DEE7FB;
              border-radius:16px;
              background:#fff;
              overflow:hidden;
            }
            .day-header {
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:10px;
              padding:12px 14px;
              background:linear-gradient(90deg,var(--purple-soft),#F8FAFF);
              border-bottom:1px solid #E5ECFA;
            }
            .day-header h3 { margin:0; color:var(--ink); font-size:16px; }
            .day-header span { color:#4B5F86; font-size:12px; font-weight:700; }
            .activity-card {
              display:flex;
              gap:12px;
              background:#fff;
              border-left:4px solid var(--blue);
              border-bottom:1px solid #EEF2FB;
              padding:12px 14px;
              margin:0;
            }
            .day-section .activity-card:last-child { border-bottom:0; }
            .activity-index {
              width:28px;
              height:28px;
              border-radius:999px;
              background:linear-gradient(140deg,var(--blue),#4A8DF0);
              color:#fff;
              display:grid;
              place-items:center;
              font-size:12px;
              font-weight:800;
              flex-shrink:0;
              box-shadow:0 6px 14px rgba(30,111,217,.26);
            }
            .activity-content h4 { margin:0; color:var(--ink); font-size:15px; }
            .activity-content .desc { margin:4px 0 0; color:#4A5C77; font-size:12px; line-height:1.45; }
            .chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:9px; }
            .chips span {
              background:var(--purple-soft);
              border:1px solid #DCCEFF;
              color:#452A84;
              font-size:10.5px;
              padding:4px 8px;
              border-radius:999px;
              font-weight:600;
            }
            .footer {
              border-top:1px solid #E5ECFA;
              background:#FAFCFF;
              padding:12px 20px;
              color:var(--muted);
              font-size:11px;
              display:flex;
              justify-content:space-between;
              align-items:center;
            }
            .dot { width:8px; height:8px; border-radius:999px; background:var(--green); display:inline-block; margin-right:6px; }
            @media print {
              body { background:#EEE8FB; padding:0; }
              .sheet { border:0; border-radius:0; box-shadow:none; max-width:100%; }
              @page { size:A4; margin:10mm; }
            }
          </style>
        </head>
        <body>
          <main class="sheet">
            <header class="hero">
              <h1>Itinerario confirmado</h1>
              <p>${tripName} · ${tripDestination}</p>
              <div class="meta">
                <span>${confirmedByDay.length} día(s) con actividades confirmadas</span>
                <span>${confirmedByDay.reduce((acc, day) => acc + day.activities.length, 0)} actividad(es) confirmada(s)</span>
              </div>
            </header>
            <section class="content">${sectionsHtml}</section>
            <footer class="footer">
              <span><i class="dot"></i>Generado por ITHERA</span>
              <span>${escapeHtml(generatedAt)}</span>
            </footer>
          </main>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, "_blank");

    if (!win) {
      URL.revokeObjectURL(blobUrl);
      window.alert(
        "No se pudo abrir la ventana de exportación. Revisa el bloqueador de ventanas.",
      );
      return;
    }

    const cleanup = () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // noop
      }
    };

    const onLoad = () => {
      try {
        win.focus();
        win.print();
      } finally {
        cleanup();
      }
    };

    try {
      win.addEventListener("load", onLoad, { once: true });
    } catch {
      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } finally {
          cleanup();
        }
      }, 700);
    }
  }, [days, group]);

  useEffect(() => {
    if (!socket) return;

    const handleItemLocked = (payload: { propuestaId?: string }) => {
      if (!payload?.propuestaId) return;
      setLockedProposalIds((prev) => ({
        ...prev,
        [payload.propuestaId!]: true,
      }));
    };

    const handleItemUnlocked = (payload: { propuestaId?: string }) => {
      if (!payload?.propuestaId) return;
      setLockedProposalIds((prev) => ({
        ...prev,
        [payload.propuestaId!]: false,
      }));
      setLockErrorActivityIds({});
    };

    const handleLockError = (payload: { propuestaId?: string }) => {
      const proposalId = payload?.propuestaId;
      if (!proposalId) return;
      const activity = days
        .flatMap((day) => day.activities)
        .find((item) => item.proposalId === proposalId);
      if (!activity) return;
      setLockErrorActivityIds((prev) => ({ ...prev, [activity.id]: true }));
      setLockedProposalIds((prev) => ({ ...prev, [proposalId]: true }));
    };

    socket.on("item_locked", handleItemLocked);
    socket.on("item_unlocked", handleItemUnlocked);
    socket.on("lock_error", handleLockError);

    return () => {
      socket.off("item_locked", handleItemLocked);
      socket.off("item_unlocked", handleItemUnlocked);
      socket.off("lock_error", handleLockError);
    };
  }, [socket, days]);

  const renderProposalQuickActions = (activity: DayActivity) => {
    if (activity.kind === "subgroup-slot" && activity.subgroupSlot) {
      const slotId = activity.subgroupSlot.slotId;
      const targetSubgroupId = activity.subgroupSlot.targetSubgroupId ?? null;
      const openBusy = subgroupQuickBusyKey === `slot-open:${slotId}`;
      const editBusy = subgroupQuickBusyKey === `slot-edit:${slotId}`;
      const deleteBusy = subgroupQuickBusyKey === `slot-delete:${slotId}`;
      const subgroupActionsBusy = Boolean(subgroupQuickBusyKey);
      return (
        <>
          <button
            type="button"
            disabled={subgroupActionsBusy}
            aria-busy={openBusy}
            onClick={(event) => {
              event.stopPropagation();
              setSubgroupQuickBusyKey(`slot-open:${slotId}`);
              handleOpenSubgroupSlot(slotId, targetSubgroupId);
              window.setTimeout(() => setSubgroupQuickBusyKey(null), 250);
            }}
            className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-xl bg-[#1E0A4E] px-3 font-body text-xs font-semibold text-white transition-colors hover:bg-[#2E1767] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {openBusy && <IconSpinner size={13} />}
            {openBusy ? "Abriendo..." : "Subgrupos"}
          </button>
          {isCurrentUserAdmin && (
            <>
              <button
                type="button"
                disabled={subgroupActionsBusy}
                aria-busy={editBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  setSubgroupQuickBusyKey(`slot-edit:${slotId}`);
                  handleEditSubgroupSlot(slotId);
                  window.setTimeout(() => setSubgroupQuickBusyKey(null), 250);
                }}
                className="inline-flex h-10 min-w-[84px] items-center justify-center gap-1.5 rounded-xl border border-[#D8C8FF] bg-white px-3 font-body text-xs font-semibold text-[#6D45C0] transition-colors hover:bg-[#F7F2FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editBusy && <IconSpinner size={13} />}
                {editBusy ? "Abriendo..." : "Editar"}
              </button>
              <button
                type="button"
                disabled={subgroupActionsBusy}
                aria-busy={deleteBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDeleteSubgroupSlot(slotId);
                }}
                className="inline-flex h-10 min-w-[84px] items-center justify-center gap-1.5 rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-3 font-body text-xs font-semibold text-[#C03535] transition-colors hover:bg-[#FFEAEA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteBusy && <IconSpinner size={13} />}
                {deleteBusy ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          )}
        </>
      );
    }

    const isAdminDecisionBusy =
      adminDecisionBusyProposalId === activity.proposalId;
    const isApproveBusy =
      isAdminDecisionBusy && adminDecisionBusyType === "aprobar";
    const isRejectBusy =
      isAdminDecisionBusy && adminDecisionBusyType === "rechazar";

    return activity.proposalId ? (
      <>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openVoteHistoryModal(activity);
          }}
          className="inline-flex h-9 min-w-[86px] items-center justify-center rounded-xl border border-[#D9E2F2] bg-white px-3 font-body text-xs font-semibold text-[#1E0A4E] transition-colors hover:bg-[#F8FAFF]"
        >
          Resumen
        </button>
        {isCurrentUserAdmin && activity.status === "pendiente" && (
          <>
            <button
              type="button"
              disabled={isAdminDecisionBusy}
              aria-busy={isAdminDecisionBusy}
              onClick={(event) => {
                event.stopPropagation();
                void handleAdminDecision(activity.proposalId!, "aprobar");
              }}
              className="inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-xl border border-[#A8E6BF] bg-[#EAFBF1] px-3 font-body text-xs font-semibold text-[#1E7A45] transition-colors hover:bg-[#DCFCE7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApproveBusy && <IconSpinner size={13} />}
              {isApproveBusy ? "Aprobando..." : "Admin aprobar"}
            </button>
            <button
              type="button"
              disabled={isAdminDecisionBusy}
              aria-busy={isAdminDecisionBusy}
              onClick={(event) => {
                event.stopPropagation();
                void handleAdminDecision(activity.proposalId!, "rechazar");
              }}
              className="inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-3 font-body text-xs font-semibold text-[#C03535] transition-colors hover:bg-[#FFEAEA] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRejectBusy && <IconSpinner size={13} />}
              {isRejectBusy ? "Rechazando..." : "Admin rechazar"}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={loadingCommentsProposalId === activity.proposalId}
          aria-busy={loadingCommentsProposalId === activity.proposalId}
          onClick={(event) => {
            event.stopPropagation();
            void openChatModal(activity);
          }}
          className="inline-flex h-9 min-w-[86px] items-center justify-center gap-1.5 rounded-xl border border-[#CFE0FF] bg-white px-3 font-body text-xs font-semibold text-bluePrimary transition-colors hover:bg-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingCommentsProposalId === activity.proposalId && (
            <IconSpinner size={13} />
          )}
          {loadingCommentsProposalId === activity.proposalId
            ? "Abriendo..."
            : "Chat"}
          <span className="rounded-full bg-bluePrimary/10 px-1.5 py-0.5 text-[10px] font-bold text-bluePrimary">
            {commentsByProposal[activity.proposalId]?.length ?? 0}
          </span>
        </button>
      </>
    ) : null;
  };

  return (
    <AppLayout
      trip={{
        name: group?.nombre || "Itinerario",
        subtitle: group?.destino || "Destino pendiente",
        dates: `${group?.fecha_inicio || "—"} – ${group?.fecha_fin || "—"}`,
        people: group?.maximo_miembros
          ? `${group.maximo_miembros} personas máx.`
          : "Miembros por definir",
      }}
      user={{
        name: userName,
        role: isCurrentUserAdmin ? "Organizador" : "Viajero",
        initials,
        color: "#1E6FD9",
      }}
      isOnline
      sidebarContent={
        <SidebarDashboard
          activeDay={activeDay}
          days={days}
          group={group}
          onDayChange={handleDayChange}
          onOpenGroupPanel={() =>
            navigate(
              `/grouppanel?groupId=${encodeURIComponent(groupId || currentGroup?.id || "")}`,
            )
          }
          onOpenGroupSettings={() =>
            navigate(
              `/group-settings?groupId=${encodeURIComponent(groupId || currentGroup?.id || "")}`,
            )
          }
        />
      }
      rightPanel={
        <RightPanelDashboard
          members={members}
          group={group}
          isLoading={isLoading}
          socket={socket}
          onOpenChat={() => {
            setChatOpen(true);
            setChatUnread(0);
          }}
          unreadCount={chatUnread}
          totalBudget={budgetSummary?.totalBudget}
          committedBudget={budgetSummary?.committed}
        />
      }
    >
      {isLoading ? (
        <DashboardSwitchLoading group={loadingGroupSnapshot} />
      ) : requiresInitialBudget && activeTab !== "pagar" ? (
        <div className="flex flex-1 items-center justify-center bg-surface px-6 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
            <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
              Presupuesto requerido
            </h2>
            <p className="mt-2 font-body text-sm text-[#7A8799]">
              Este viaje necesita un presupuesto inicial para continuar.
            </p>
            {isCurrentUserAdmin ? (
              <button
                type="button"
                onClick={() => setActiveTab("pagar")}
                className="mt-4 rounded-xl bg-[#1E6FD9] px-5 py-3 font-body text-sm font-semibold text-white hover:bg-[#2C8BE6]"
              >
                Definir presupuesto ahora
              </button>
            ) : (
              <p className="mt-4 font-body text-sm text-[#7A8799]">
                Solo un administrador puede definir el presupuesto inicial.
              </p>
            )}
          </div>
        </div>
      ) : isEmpty &&
        !(activeTab === "inicio" && dashboardView === "subgrupos") ? (
        <EmptyState
          onAdd={isReadOnly ? () => {} : () => setShowActivityModal(true)}
        />
      ) : activeTab === "comparar" ? (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <ComparisonPage onBack={() => setActiveTab("pagar")} />
        </div>
      ) : activeTab === "mapas" ? (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          <MapsTabView days={days} />
        </div>
      ) : activeTab === "pagar" ? (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          {isReadOnly && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-0.5 shrink-0 text-[#64748B]"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
              <p className="font-body text-[12px] text-[#64748B] leading-relaxed">
                Presupuesto en modo lectura. Puedes consultar balances y deudas,
                pero no registrar nuevos gastos.
              </p>
            </div>
          )}
          <BudgetDashboard
            groupId={resolvedGroupId ?? null}
            onSummaryChange={setBudgetSummary}
            onOpenVault={() => setActiveTab("boveda")}
            onOpenItinerary={() => {
              setDashboardView("general");
              setActiveTab("inicio");
            }}
            onOpenSubgroups={() => {
              setDashboardView("subgrupos");
              setActiveTab("inicio");
            }}
            isReadOnly={isReadOnly}
          />
        </div>
      ) : activeTab === "boveda" ? (
        <DocumentVaultPanel
          groupId={resolvedGroupId ?? null}
          members={members}
          currentUser={localUser ?? null}
          onOpenBudget={() => setActiveTab("pagar")}
          onOpenItinerary={() => {
            setDashboardView("general");
            setActiveTab("inicio");
          }}
          onOpenSubgroups={() => {
            setDashboardView("subgrupos");
            setActiveTab("inicio");
          }}
          isReadOnly={isReadOnly}
        />
      ) : activeTab === "inicio" && dashboardView === "subgrupos" ? (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-white p-1">
            <button
              type="button"
              onClick={() => setDashboardView("general")}
              className="rounded-md px-3 py-1.5 text-sm text-[#475569]"
            >
              Vista general
            </button>
            <button
              type="button"
              onClick={() => setDashboardView("subgrupos")}
              className="rounded-md bg-[#1E6FD9] px-3 py-1.5 text-sm text-white"
            >
              Vista subgrupos
            </button>
          </div>
          <SubgroupSchedulePanel
            groupId={resolvedGroupId ?? null}
            group={group}
            members={members}
            isAdmin={isCurrentUserAdmin}
            tripStartDate={group?.fecha_inicio ?? null}
            tripEndDate={group?.fecha_fin ?? null}
            onOpenBudget={() => setActiveTab("pagar")}
            onOpenVault={() => setActiveTab("boveda")}
            socket={socket}
            isSocketConnected={isSocketConnected}
            currentUserId={
              localUser?.id_usuario != null
                ? String(localUser.id_usuario)
                : null
            }
            currentUserName={userName}
            editSlotRequest={editSubgroupSlotRequest}
            focusRequest={focusSubgroupRequest}
            onScheduleChanged={handleSubgroupScheduleChanged}
          />
        </div>
      ) : activeTab === "buscar" ? (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-8">
          <h2 className="font-heading font-bold text-[#1E0A4E] text-xl mb-1">
            Buscar
          </h2>
          <p className="font-body text-sm text-gray-500 mb-6">
            {group?.destino
              ? `Opciones para ${group.destino}`
              : "Encuentra opciones para tu viaje"}
          </p>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() =>
                navigate("/search/flights-hotels", {
                  state: { destino: group?.destino, group },
                })
              }
              className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 text-left shadow-sm hover:border-[#1E6FD9]/40 hover:bg-[#F0EEF8] transition-colors group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #1E6FD9, #2C8BE6)",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 11l18-8-8 18-2-8-8-2z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-none">
                  Vuelos y Hoteles
                </p>
                <p className="font-body text-xs text-gray-500 mt-1">
                  Busca y propone opciones al grupo
                </p>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-gray-400 group-hover:text-[#1E6FD9] transition-colors shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/search/map-places", { state: { group } })
              }
              className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 text-left shadow-sm hover:border-[#7A4FD6]/40 hover:bg-[#F0EEF8] transition-colors group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #7A4FD6, #9B72F0)",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 22s7-5.2 7-12a7 7 0 10-14 0c0 6.8 7 12 7 12z"
                    fill="white"
                  />
                  <circle cx="12" cy="10" r="2.5" fill="#7A4FD6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-none">
                  Lugares de interés
                </p>
                <p className="font-body text-xs text-gray-500 mt-1">
                  Explora atracciones y actividades
                </p>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-gray-400 group-hover:text-[#7A4FD6] transition-colors shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/search/routes-weather", {
                  state: { destino: group?.destino, group },
                })
              }
              className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 text-left shadow-sm hover:border-[#35C56A]/40 hover:bg-[#F0EEF8] transition-colors group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #35C56A, #22A85A)",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <polygon
                    points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="18"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="16"
                    y1="6"
                    x2="16"
                    y2="22"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-none">
                  Rutas y Clima
                </p>
                <p className="font-body text-xs text-gray-500 mt-1">
                  Cómo llegar y pronóstico del tiempo
                </p>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-gray-400 group-hover:text-[#35C56A] transition-colors shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-surface px-6 py-6">
          <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-white p-1">
            <button
              type="button"
              onClick={() => setDashboardView("general")}
              className={`rounded-md px-3 py-1.5 text-sm ${dashboardView === "general" ? "bg-[#1E6FD9] text-white" : "text-[#475569]"}`}
            >
              Vista general
            </button>
            <button
              type="button"
              onClick={() => setDashboardView("subgrupos")}
              className={`rounded-md px-3 py-1.5 text-sm ${dashboardView === "subgrupos" ? "bg-[#1E6FD9] text-white" : "text-[#475569]"}`}
            >
              Vista subgrupos
            </button>
          </div>
          <HeroCard
            activeDay={activeDay}
            totalDays={daysWithContext.length}
            selectedDay={selectedDayWithContext}
            group={group}
            onAdd={
              isReadOnly
                ? () => {}
                : () =>
                    openActivityModalForDay(
                      activeDay ?? daysWithContext[0]?.dayNumber ?? 1,
                    )
            }
            onExportPdf={handleExportConfirmedItineraryPdf}
            canManageSubgroups={isCurrentUserAdmin && !isReadOnly}
            onOpenSubgroups={() => setDashboardView("subgrupos")}
          />
          {/* ── Banner modo solo lectura (ERR-211-002 / CU-2.10) ── */}
          {isReadOnly && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-0.5 shrink-0 text-[#64748B]"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
              <p className="font-body text-[12px] text-[#64748B] leading-relaxed">
                Este viaje ya finalizó. Puedes consultar el itinerario y el
                resumen financiero en modo lectura.
              </p>
            </div>
          )}
          <InfoBanner memberCount={uniqueMemberCount} />
          <TimelineStrip
            activeDay={activeDay}
            date={selectedDayWithContext?.date}
            activities={selectedDayWithContext?.activities}
          />
          <div className="flex flex-col gap-3">
            {daysWithContext.map((day) => {
              const isPastDay = isPastItineraryDay(
                group?.fecha_inicio ?? currentGroup?.fecha_inicio ?? null,
                day.dayNumber,
              );

              return (
                <DayView
                  key={day.dayNumber}
                  ref={(handle) => {
                    dayRefs.current[day.dayNumber] = handle;
                  }}
                  dayNumber={day.dayNumber}
                  date={day.date}
                  activities={day.activities}
                  currentUserId={localUser?.id_usuario}
                  currentUserRole={currentUserRole}
                  isActive={day.dayNumber === activeDay}
                  isExpanded={day.dayNumber === expandedDay}
                  onSelect={handleDayChange}
                  onAddActivity={
                    isReadOnly || isPastDay
                      ? undefined
                      : openActivityModalForDay
                  }
                  onManageContext={
                    isReadOnly || isPastDay ? undefined : openActivityEditor
                  }
                  onOpenBudget={() => setActiveTab("pagar")}
                  onOpenVault={() => setActiveTab("boveda")}
                  onAccept={
                    isReadOnly || isPastDay ? undefined : handleAcceptActivity
                  }
                  onReject={
                    isReadOnly || isPastDay ? undefined : handleRejectActivity
                  }
                  onDelete={
                    isReadOnly || isPastDay ? undefined : handleDeleteActivity
                  }
                  onEdit={
                    isReadOnly || isPastDay
                      ? undefined
                      : (id) => {
                          const activity = days
                            .flatMap((d) => d.activities)
                            .find((a) => a.id === id);
                          if (!activity) return;
                          openActivityEditor(activity);
                        }
                  }
                  renderConfirmedActions={
                    isReadOnly || isPastDay
                      ? undefined
                      : renderProposalQuickActions
                  }
                  renderPendingActions={
                    isReadOnly || isPastDay
                      ? undefined
                      : renderProposalQuickActions
                  }
                  isPastDay={isPastDay}
                />
              );
            })}
          </div>
        </div>
      )}

      <ActivityProposalModal
        open={showActivityModal && !isReadOnly}
        group={group}
        token={accessToken}
        selectedDayNumber={selectedActivityDay}
        isCurrentUserAdmin={isCurrentUserAdmin}
        currentUserId={
          localUser?.id_usuario != null ? String(localUser.id_usuario) : null
        }
        members={safeMembers}
        onClose={() => {
          unlockProposalForActivity(editingActivity);
          setEditingActivity(null);
          setShowActivityModal(false);
        }}
        onCreated={async () => {
          unlockProposalForActivity(editingActivity);
          await reloadDashboard();
        }}
        editingActivity={editingActivity}
      />

      {voteHistoryActivity?.proposalId && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setVoteHistoryActivity(null)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const voteResult =
                voteResultByProposal[voteHistoryActivity.proposalId!];
              const votesFor =
                voteResult?.votos_a_favor ?? voteResult?.votos ?? 0;
              const votesAgainst = voteResult?.votos_en_contra ?? 0;
              const totalMembers = Math.max(uniqueMemberCount, 1);
              const pendingVotes =
                voteResult?.votos_pendientes ??
                Math.max(totalMembers - (votesFor + votesAgainst), 0);
              const requiresAdminTieBreak = Boolean(
                voteResult?.requiere_desempate_admin,
              );
              const progressWidth = Math.min(
                (votesFor / totalMembers) * 100,
                100,
              );

              return (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                        Resumen de votacion
                      </p>
                      <h3 className="mt-2 font-heading text-2xl font-bold text-[#1E0A4E]">
                        {voteHistoryActivity.title}
                      </h3>
                      <p className="mt-1 font-body text-sm text-[#64748B]">
                        {voteHistoryActivity.time} ·{" "}
                        {voteHistoryActivity.location || "Ubicación pendiente"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoteHistoryActivity(null)}
                      className="rounded-full border border-[#E2E8F0] px-3 py-2 font-body text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC]"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-4">
                      <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#166534]">
                        A favor
                      </p>
                      <p className="mt-2 font-heading text-3xl font-bold text-[#166534]">
                        {votesFor}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#FECDD3] bg-[#FFF1F2] px-4 py-4">
                      <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#BE123C]">
                        En contra
                      </p>
                      <p className="mt-2 font-heading text-3xl font-bold text-[#BE123C]">
                        {votesAgainst}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4">
                      <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-[#B45309]">
                        Pendientes
                      </p>
                      <p className="mt-2 font-heading text-3xl font-bold text-[#B45309]">
                        {pendingVotes}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFF] px-4 py-4">
                    <div className="flex flex-col gap-4">
                      <p className="font-body text-sm text-[#475569]">
                        {requiresAdminTieBreak
                          ? "La propuesta terminó empatada y necesita decisión administrativa."
                          : "Aquí puedes revisar el resultado de la propuesta sin ensuciar la línea de tiempo."}
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EEF8]">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${progressWidth}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {voteResult?.mi_voto && (
                          <span className="inline-flex min-w-[220px] items-center rounded-full bg-[#EEF2F7] px-4 py-2 font-body text-xs font-semibold text-[#475569]">
                            Tu voto:{" "}
                            {voteResult.mi_voto === "a_favor"
                              ? "a favor"
                              : voteResult.mi_voto === "en_contra"
                                ? "en contra"
                                : "abstencion"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {chatProposalActivity?.proposalId && (
        <>
          <div
            className="fixed inset-0 z-[75] bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setChatProposalActivity(null);
              setExpandedCommentsProposalId(null);
            }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Chat de propuesta ${chatProposalActivity.title}`}
            className="fixed right-0 top-0 z-[80] flex h-full w-[420px] max-w-full flex-col bg-[#FAF9FD] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 bg-[linear-gradient(135deg,#1E0A4E,#7A4FD6)] px-5 py-4">
              <div className="min-w-0">
                <p className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                  Chat de propuesta
                </p>
                <h3 className="mt-1 truncate font-heading text-sm font-bold text-white">
                  {chatProposalActivity.title}
                </h3>
                <p className="mt-0.5 font-body text-[11px] text-white/70">
                  {isSocketConnected ? "Chat de propuesta" : "Reconectando..."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChatProposalActivity(null);
                    setExpandedCommentsProposalId(null);
                  }}
                  className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Cerrar chat"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5 border-b border-[#E2E8F0] bg-white px-4 py-2.5">
              <span className="rounded-full bg-[#EEF4FF] px-3 py-1 font-body text-[11px] font-semibold text-bluePrimary">
                {commentsByProposal[chatProposalActivity.proposalId]?.length ??
                  0}{" "}
                comentarios
              </span>
              <span className="truncate font-body text-[11px] text-gray-500">
                {chatProposalActivity.time} ·{" "}
                {chatProposalActivity.location || "Ubicacion pendiente"}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
              {loadingCommentsProposalId === chatProposalActivity.proposalId ? (
                <p className="font-body text-sm text-[#64748B]">
                  Cargando comentarios...
                </p>
              ) : (commentsByProposal[chatProposalActivity.proposalId] ?? [])
                  .length === 0 ? (
                <p className="font-body text-sm text-[#64748B]">
                  Aún no hay comentarios en esta propuesta.
                </p>
              ) : (
                <div className="space-y-3">
                  {(commentsByProposal[chatProposalActivity.proposalId] ?? [])
                    .slice(
                      0,
                      visibleCommentsCountByProposal[
                        chatProposalActivity.proposalId
                      ] ?? 6,
                    )
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-body text-xs font-semibold text-[#1E0A4E]">
                            {comment.authorName ||
                              `Usuario ${comment.usuarioId}`}
                          </p>
                          <p className="font-body text-[11px] text-[#64748B]">
                            {new Date(comment.createdAt).toLocaleString(
                              "es-MX",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) =>
                                setEditingCommentText(e.target.value)
                              }
                              rows={3}
                              className="w-full resize-none rounded-2xl border border-[#D9E2F2] px-3 py-2 text-sm outline-none focus:border-bluePrimary"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  void handleSaveEditComment(
                                    chatProposalActivity.proposalId!,
                                    comment.id,
                                  )
                                }
                                className="rounded-full bg-bluePrimary px-3 py-2 font-body text-xs font-semibold text-white"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelEditComment}
                                className="rounded-full border border-[#E2E8F0] px-3 py-2 font-body text-xs font-semibold text-[#475569]"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-body text-sm text-[#334155]">
                              {comment.contenido}
                            </p>
                            {String(comment.usuarioId) ===
                              String(localUser?.id_usuario) && (
                              <div className="mt-2 flex gap-3">
                                <button
                                  onClick={() =>
                                    handleStartEditComment(comment)
                                  }
                                  className="font-body text-xs font-semibold text-bluePrimary hover:underline"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() =>
                                    void handleDeleteComment(
                                      chatProposalActivity.proposalId!,
                                      comment.id,
                                    )
                                  }
                                  className="font-body text-xs font-semibold text-red-500 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {(commentsByProposal[chatProposalActivity.proposalId] ?? [])
                .length >
                (visibleCommentsCountByProposal[
                  chatProposalActivity.proposalId
                ] ?? 6) && (
                <button
                  onClick={() =>
                    setVisibleCommentsCountByProposal((prev) => ({
                      ...prev,
                      [chatProposalActivity.proposalId!]:
                        (prev[chatProposalActivity.proposalId!] ?? 6) + 6,
                    }))
                  }
                  className="mt-3 font-body text-xs font-semibold text-bluePrimary hover:underline"
                >
                  Ver más comentarios
                </button>
              )}
            </div>

            <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={
                    commentDraftByProposal[chatProposalActivity.proposalId] ??
                    ""
                  }
                  onChange={(e) =>
                    setCommentDraftByProposal((prev) => ({
                      ...prev,
                      [chatProposalActivity.proposalId!]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleCreateComment(
                        chatProposalActivity.proposalId!,
                      );
                    }
                  }}
                  placeholder="Escribe un comentario..."
                  rows={1}
                  className="max-h-24 flex-1 resize-none rounded-2xl border border-[#D9E2F2] bg-[#F8FAFC] px-4 py-3 font-body text-sm outline-none focus:border-bluePrimary"
                />
                <button
                  type="button"
                  onClick={() =>
                    void handleCreateComment(chatProposalActivity.proposalId!)
                  }
                  disabled={
                    sendingCommentProposalId === chatProposalActivity.proposalId
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bluePrimary text-white transition-colors hover:bg-[#145DC0] disabled:opacity-50"
                  aria-label="Enviar comentario"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="22"
                      y1="2"
                      x2="11"
                      y2="13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="22 2 15 22 11 13 2 9 22 2"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isReadOnly={isReadOnly}
      />
      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          tripId={groupId || currentGroup?.id || ""}
          onClose={() => setSelectedProposal(null)}
          onAccept={() => setShowConfirm(true)}
          socket={socket}
        />
      )}
      {showConfirm && selectedProposal && (
        <ConfirmProposalModal
          proposal={selectedProposal}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            setDays((prev) =>
              prev.map((day) => ({
                ...day,
                activities: day.activities.map((a) =>
                  a.id === selectedProposal.id
                    ? { ...a, status: "confirmada" as const }
                    : a,
                ),
              })),
            );
            setShowConfirm(false);
            setSelectedProposal(null);
          }}
        />
      )}

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        groupId={resolvedGroupId}
        groupName={group?.nombre || "Grupo"}
        socket={socket}
        isSocketConnected={isSocketConnected}
        accessToken={accessToken}
        currentUserId={
          localUser?.id_usuario != null ? String(localUser.id_usuario) : null
        }
        currentUserName={userName}
        participants={chatParticipants}
        isReadOnly={isReadOnly}
      />
    </AppLayout>
  );
}
