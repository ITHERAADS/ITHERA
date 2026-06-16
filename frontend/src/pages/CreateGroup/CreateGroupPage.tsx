import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout, SidebarCreateGroup } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/useAuth";
import { groupsService, saveCurrentGroup } from "../../services/groups";
import { isNetworkError } from "../../services/apiClient";
import { DestinationSearch } from "../../components/DestinationSearch/DestinationSearch";
import type { GeocodingResult } from "../../services/maps";
import { HelpButton } from "../../components/ui/HelpButton";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member {
  id: string;
  email: string;
  name?: string;
}

interface FormData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxMembers: string;
  totalBudget: string;
  description: string;
  isPublic: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconCalPicker() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChevSmall() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DAY_NAMES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MONTH_NAMES_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];
const TOTAL_BUDGET_INTEGER_DIGITS = 10;
const TOTAL_BUDGET_DECIMAL_DIGITS = 2;
const MAX_TOTAL_BUDGET = Number(`${"9".repeat(TOTAL_BUDGET_INTEGER_DIGITS)}.${"9".repeat(TOTAL_BUDGET_DECIMAL_DIGITS)}`);


function isoFromYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function DatePickerField({
  label,
  value,
  onChange,
  min,
  max,
  error,
  hint,
  placeholder = "Selecciona una fecha",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initView = () => {
    const base = value || min || new Date().toISOString().slice(0, 10);
    const d = new Date(base + "T00:00:00");
    return isNaN(d.getTime()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), 1);
  };
  const [viewDate, setViewDate] = useState<Date>(initView);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const vy = viewDate.getFullYear();
  const vm = viewDate.getMonth();
  const firstDow = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();

  const formatDisplay = (iso: string) =>
    new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(
      new Date(iso + "T00:00:00"),
    );

  const selectDay = (day: number) => { onChange(isoFromYMD(vy, vm, day)); setOpen(false); };
  const isDisabled = (day: number) => {
    const iso = isoFromYMD(vy, vm, day);
    return (!!min && iso < min) || (!!max && iso > max);
  };
  const isSelected = (day: number) => value === isoFromYMD(vy, vm, day);
  const todayIso = new Date().toISOString().slice(0, 10);
  const isTodayDay = (day: number) => isoFromYMD(vy, vm, day) === todayIso;

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="relative flex flex-col gap-2" ref={ref}>
      <label className="font-body text-sm font-extrabold uppercase tracking-[0.14em] text-[#4B2FA3]">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left font-body text-base font-medium shadow-sm outline-none transition-all duration-200 ${
          error
            ? "border-red-400"
            : open
              ? "border-[#7A4FD6] ring-2 ring-[#7A4FD6]/15"
              : "border-[#D8C8FF] hover:border-[#7A4FD6]/60"
        }`}
      >
        <span className={`shrink-0 ${value ? "text-[#7A4FD6]" : "text-[#94A3B8]"}`}>
          <IconCalPicker />
        </span>
        <span className={`flex-1 ${value ? "text-[#1E0A4E]" : "text-[#94A3B8]"}`}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-[#7A4FD6]" : "text-[#94A3B8]"}`}>
          <IconChevSmall />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[60] overflow-hidden rounded-2xl border border-[#D8C8FF] bg-white shadow-[0_16px_40px_rgba(30,10,78,0.18)]">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1E0A4E_0%,#7A4FD6_100%)] px-4 py-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(vy, vm - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-xl font-bold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            >‹</button>
            <span className="font-body text-sm font-extrabold capitalize text-white">
              {MONTH_NAMES_ES[vm]} {vy}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(vy, vm + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-xl font-bold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            >›</button>
          </div>

          <div className="grid grid-cols-7 border-b border-[#EDE9FB] px-3 py-2">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center font-body text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 px-3 py-3">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day !== null && (
                  <button
                    type="button"
                    disabled={isDisabled(day)}
                    onClick={() => selectDay(day)}
                    className={`h-8 w-8 rounded-xl font-body text-sm font-semibold transition-all ${
                      isSelected(day)
                        ? "bg-[#7A4FD6] text-white shadow-md shadow-[#7A4FD6]/30"
                        : isDisabled(day)
                          ? "cursor-not-allowed text-[#CBD5E1]"
                          : isTodayDay(day)
                            ? "bg-[#F3EEFF] text-[#7A4FD6] ring-1 ring-[#7A4FD6]/40 hover:bg-[#7A4FD6] hover:text-white"
                            : "text-[#1E0A4E] hover:bg-[#F3EEFF] hover:text-[#7A4FD6]"
                    }`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          {value && (
            <div className="border-t border-[#EDE9FB] px-4 py-2.5 text-center">
              <span className="font-body text-xs font-semibold capitalize text-[#7A4FD6]">
                {formatDisplay(value)}
              </span>
            </div>
          )}
        </div>
      )}

      {hint && !error && <p className="font-body text-sm font-medium text-[#64748B]">{hint}</p>}
      {error && <p className="font-body text-sm font-bold text-red-500">{error}</p>}
    </div>
  );
}

function InputField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  maxLength,
  min,
  max,
  step,
  multiline = false,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-body text-sm font-extrabold text-[#4B2FA3] uppercase tracking-[0.14em]">
        {label}
      </label>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`w-full resize-none font-body text-base font-medium text-[#1E0A4E] placeholder-[#94A3B8] border rounded-2xl px-4 py-3.5 outline-none transition-all duration-200 bg-white shadow-sm
            ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                : "border-[#D8C8FF] focus:border-[#7A4FD6] focus:ring-2 focus:ring-[#7A4FD6]/15"
            }
          `}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          inputMode={type === "number" ? "decimal" : undefined}
          aria-invalid={Boolean(error)}
          onKeyDown={(e) => {
            if (type === "number" && ["-", "+", "e", "E"].includes(e.key))
              e.preventDefault();
          }}
          onWheel={(e) => {
            if (type === "number") e.currentTarget.blur();
          }}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full font-body text-base font-medium text-[#1E0A4E] placeholder-[#94A3B8] border rounded-2xl px-4 py-3.5 outline-none transition-all duration-200 bg-white shadow-sm
            ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                : "border-[#D8C8FF] focus:border-[#7A4FD6] focus:ring-2 focus:ring-[#7A4FD6]/15"
            }
          `}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        {hint && !error && (
          <p className="font-body text-sm font-medium text-[#64748B]">{hint}</p>
        )}
        {maxLength !== undefined && (
          <p
            className={`font-body text-sm font-bold ${value.length >= maxLength ? "text-red-500" : "text-[#64748B]"}`}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
      {error && <p className="font-body text-sm font-bold text-red-500">{error}</p>}
    </div>
  );
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*\.[A-Za-z]{2,24}$/;

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value.trim().toLowerCase());
}

function MembersSection({
  members,
  maxInvitations,
  onAdd,
  onRemove,
}: {
  members: Member[];
  maxInvitations: number;
  onAdd: (m: Member) => void;
  onRemove: (id: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const hasReachedInvitationLimit = members.length >= maxInvitations;
  const canAddEmail =
    normalizedEmail.length > 0 &&
    isValidEmail(normalizedEmail) &&
    !hasReachedInvitationLimit &&
    !members.some((member) => member.email.toLowerCase() === normalizedEmail);

  const handleAdd = () => {
    if (hasReachedInvitationLimit) {
      setError(
        maxInvitations === 1
          ? "Solo puedes agregar una invitación para esta capacidad."
          : `Solo puedes agregar ${maxInvitations} invitaciones para esta capacidad.`,
      );
      return;
    }

    if (!normalizedEmail) {
      setError("Ingresa un correo electrónico.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Ingresa un correo electrónico válido (ej. usuario@dominio.com).",
      );
      return;
    }

    if (
      members.some((member) => member.email.toLowerCase() === normalizedEmail)
    ) {
      setError("Ese correo ya fue agregado.");
      return;
    }

    onAdd({ id: crypto.randomUUID(), email: normalizedEmail });
    setEmail("");
    setError("");
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="font-body text-sm font-extrabold text-[#4B2FA3] uppercase tracking-[0.14em]">
        Invitar miembros (opcional)
      </label>

      <div className="flex gap-2">
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          onBlur={() => {
            if (normalizedEmail && !isValidEmail(normalizedEmail)) {
              setError(
                "Ingresa un correo electrónico válido (ej. usuario@dominio.com).",
              );
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && canAddEmail && handleAdd()}
          disabled={hasReachedInvitationLimit}
          aria-invalid={Boolean(error)}
          className={`flex-1 font-body text-base font-medium text-[#1E0A4E] placeholder-[#94A3B8] border rounded-2xl px-4 py-3.5 outline-none transition-all duration-200 bg-white shadow-sm disabled:bg-[#F4F6F8] disabled:text-[#7A8799]
            ${error ? "border-red-400" : "border-[#D8C8FF] focus:border-[#7A4FD6] focus:ring-2 focus:ring-[#7A4FD6]/15"}
          `}
        />
        <button
          onClick={handleAdd}
          type="button"
          disabled={!canAddEmail}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-2xl bg-[linear-gradient(135deg,#1E0A4E,#7A4FD6)] px-5 py-3.5 font-body text-base font-extrabold text-white shadow-[0_12px_24px_rgba(30,10,78,0.16)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
          Agregar
        </button>
      </div>
      {!error && (
        <p className="font-body text-sm font-medium text-[#64748B]">
          Puedes agregar{" "}
          {maxInvitations === 1
            ? "1 invitación"
            : `${maxInvitations} invitaciones`}{" "}
          como máximo para la capacidad seleccionada.
        </p>
      )}
      {error && <p className="font-body text-sm font-bold text-red-500">{error}</p>}

      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl border border-[#D8C8FF] bg-[#F7F2FF] px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#E8F0FF]">
                  <span className="font-heading text-sm font-extrabold uppercase text-[#1E6FD9]">
                    {m.email[0]}
                  </span>
                </div>
                <span className="break-all font-body text-base font-semibold text-[#1E0A4E]">
                  {m.email}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                className="text-[#7A8799] hover:text-red-500 transition-colors shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionLabel({
  icon,
  title,
  help,
}: {
  icon: React.ReactNode;
  title: string;
  help?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1E0A4E,#7A4FD6)] shadow-[0_10px_22px_rgba(30,10,78,0.16)]">
          {icon}
        </div>
        <h3 className="font-heading text-xl font-extrabold text-[#1E0A4E]">
          {title}
        </h3>
      </div>
      {help && <HelpButton title={title} description={help} placement="right" />}
    </div>
  );
}


function StandardInlineAlert({
  title,
  message,
  tone = "error",
}: {
  title: string;
  message: string;
  tone?: "error" | "warning" | "info";
}) {
  const toneClasses = {
    error: "border-[#FBC7C7] bg-[#FFF5F5] text-[#C03535]",
    warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
    info: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
  } satisfies Record<string, string>;

  return (
    <div
      role="alert"
      className={`rounded-2xl border px-5 py-4 font-body ${toneClasses[tone]}`}
    >
      <p className="text-base font-extrabold">{title}</p>
      <p className="mt-1 text-base font-medium leading-relaxed">{message}</p>
    </div>
  );
}

function getCreateGroupErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return "Sin conexión. Verifica tu red e inténtalo de nuevo cuando recuperes internet.";
  }

  if (error instanceof Error) return error.message;
  return "No se pudo crear el grupo. Inténtalo de nuevo.";
}

// ── Validation helpers ────────────────────────────────────────────────────────
const MAX_TRIP_DURATION_DAYS = 60;

const todayISO = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

const addDaysISO = (date: string, days: number) => {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const daysBetweenISO = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
};

const sanitizePositiveDecimal = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [rawIntegerPart, ...decimalParts] = cleaned.split(".");
  const integerPart = rawIntegerPart.slice(0, TOTAL_BUDGET_INTEGER_DIGITS);
  const decimals = decimalParts.join("").slice(0, TOTAL_BUDGET_DECIMAL_DIGITS);
  return decimalParts.length > 0 ? `${integerPart}.${decimals}` : integerPart;
};

const getValidationErrors = (form: FormData) => {
  const e: Partial<FormData> = {};
  const now = todayISO();
  const maxMembers = Number(form.maxMembers);
  const totalBudget = Number(form.totalBudget);

  if (!form.name.trim()) e.name = "El nombre del grupo es requerido.";
  else if (form.name.trim().length > 60)
    e.name = "Máximo 60 caracteres permitidos.";

  if (!form.destination.trim()) e.destination = "Selecciona un destino.";
  if (form.description.trim().length > 300)
    e.description = "Máximo 300 caracteres permitidos.";

  if (!Number.isInteger(maxMembers) || maxMembers < 1) {
    e.maxMembers = "El máximo de miembros debe ser al menos 1.";
  } else if (maxMembers > 50) {
    e.maxMembers = "El máximo de miembros permitido es 50.";
  }

  if (!form.startDate) e.startDate = "Fecha de inicio requerida.";
  else if (form.startDate < now)
    e.startDate = "La fecha de salida no puede ser anterior a hoy.";

  if (!form.endDate) e.endDate = "Fecha de regreso requerida.";
  else if (form.endDate < now)
    e.endDate = "La fecha de regreso no puede ser anterior a hoy.";

  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    e.endDate = "La fecha de regreso debe ser posterior a la de inicio.";
  } else if (form.startDate && form.endDate) {
    const durationDays = daysBetweenISO(form.startDate, form.endDate);

    if (durationDays !== null && durationDays > MAX_TRIP_DURATION_DAYS) {
      e.endDate = `La duración máxima del viaje es de ${MAX_TRIP_DURATION_DAYS} días.`;
    }
  }

  if (!form.totalBudget.trim()) {
    e.totalBudget = "El presupuesto base es obligatorio.";
  } else if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    e.totalBudget =
      "El monto del presupuesto debe ser un número positivo mayor a cero.";
  } else if (totalBudget > MAX_TOTAL_BUDGET) {
    e.totalBudget = `El presupuesto máximo permitido es ${MAX_TOTAL_BUDGET.toLocaleString("es-MX")} MXN.`;
  }

  return e;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CreateGroupPage() {
  const { accessToken, localUser } = useAuth();
  const [serverError, setServerError] = useState("");
  const [createdGroupId, setCreatedGroupId] = useState("");
  const [destinationData, setDestinationData] =
    useState<GeocodingResult | null>(null);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    maxMembers: "10",
    totalBudget: "",
    description: "",
    isPublic: false,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  const [invitedCount, setInvitedCount] = useState(0);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const updateOnlineState = () => setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    updateOnlineState();
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const set = (key: keyof FormData) => (val: string | boolean) => {
    const normalizedValue =
      key === "totalBudget" && typeof val === "string"
        ? sanitizePositiveDecimal(val)
        : val;

    setForm((current) => {
      const next = { ...current, [key]: normalizedValue };

      if (
        key === "startDate" &&
        typeof normalizedValue === "string" &&
        next.endDate
      ) {
        const maxEndDate = addDaysISO(normalizedValue, MAX_TRIP_DURATION_DAYS);

        if (
          next.endDate <= normalizedValue ||
          (maxEndDate && next.endDate > maxEndDate)
        ) {
          next.endDate = "";
        }
      }

      setErrors(getValidationErrors(next));
      setServerError("");
      return next;
    });
  };

  const validate = () => {
    const e = getValidationErrors(form);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validationErrors = getValidationErrors(form);
  const isFormValid = Object.keys(validationErrors).length === 0;
  const sidebarStep: 1 | 2 | 3 =
    form.name.trim() && form.destination.trim()
      ? form.startDate && form.endDate && form.totalBudget.trim()
        ? 3
        : 2
      : 1;
  const minEndDate = form.startDate
    ? addDaysISO(form.startDate, 1)
    : todayISO();
  const maxEndDate = form.startDate
    ? addDaysISO(form.startDate, MAX_TRIP_DURATION_DAYS)
    : undefined;
  const maxInvitationSlots = Math.max(Number(form.maxMembers || 1) - 1, 0);
  const canInviteDuringCreation = maxInvitationSlots > 0;

  useEffect(() => {
    setMembers((current) => current.slice(0, maxInvitationSlots));
  }, [maxInvitationSlots]);

  const handleCreate = async () => {
    if (!validate()) return;

    if (!accessToken) {
      setServerError("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    if (isOffline) {
      setServerError("Sin conexión. La creación del grupo estará disponible cuando recuperes internet.");
      return;
    }

    try {
      setServerError("");
      setLoading(true);

      const response = await groupsService.createGroup(
        {
          nombre: form.name.trim(),
          descripcion: form.description.trim() || undefined,
          destino: form.destination || undefined,
          destino_latitud: destinationData?.latitude ?? null,
          destino_longitud: destinationData?.longitude ?? null,
          destino_place_id: destinationData?.placeId ?? null,
          destino_formatted_address: destinationData?.formattedAddress ?? null,
          fecha_inicio: form.startDate || undefined,
          fecha_fin: form.endDate || undefined,
          maximo_miembros: Number(form.maxMembers),
          es_publico: form.isPublic,
          presupuesto_total: Number(form.totalBudget),
        },
        accessToken,
      );

      saveCurrentGroup(response.group);
      setGroupCode(response.group.codigo_invitacion);
      setCreatedGroupId(response.group.id);

      if (canInviteDuringCreation && members.length > 0) {
        const emails = members
          .slice(0, maxInvitationSlots)
          .map((member) => member.email);

        const invitationsResponse = await groupsService.sendInvitations(
          response.group.id,
          emails,
          accessToken,
        );

        setInvitedCount(invitationsResponse.invitations.length);
      }

      setCreated(true);
    } catch (error) {
      setServerError(getCreateGroupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ────────────────────────────────────────────────────────
  if (created) {
    return (
      <AppLayout
        user={{
          name: localUser?.nombre || "Usuario",
          role: "Organizador",
          initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
          color: "#1E6FD9",
        }}
        showTripSelector={false}
        showRightPanel={false}
        sidebarContent={<SidebarCreateGroup currentStep={3} />}
      >
        <div className="flex flex-1 items-center justify-center bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F6FF_52%,#F3EEFF_100%)] px-4 py-12">
          <div
            className="fixed inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(30,10,78,0.04) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative w-full max-w-xl">
            <div className="overflow-hidden rounded-3xl border border-[#D8C8FF] bg-white p-8 text-center shadow-[0_22px_48px_rgba(30,10,78,0.16)]">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#EAFBF1]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#15803D]"
                >
                  <path
                    d="M22 11.08V12a10 10 0 11-5.93-9.14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <polyline
                    points="22 4 12 14.01 9 11.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="mb-2 font-heading text-4xl font-extrabold text-[#1E0A4E]">
                Grupo creado
              </h2>
              <p className="mb-6 font-body text-base font-medium leading-relaxed text-[#64748B]">
                {invitedCount > 0
                  ? `Grupo creado correctamente. También se generaron ${invitedCount} invitación(es) por correo.`
                  : "Comparte este código con tu equipo para que se unan al viaje."}
              </p>
              <div className="mb-6 rounded-3xl bg-[linear-gradient(135deg,#1E0A4E,#7A4FD6)] p-6">
                <p className="mb-2 font-body text-sm font-extrabold uppercase tracking-[0.16em] text-[#D8C8FF]">
                  Código del grupo
                </p>
                <p className="font-heading text-4xl font-extrabold tracking-widest text-white">
                  {groupCode}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => navigator.clipboard.writeText(groupCode)}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#D8C8FF] bg-white px-4 py-4 font-body text-base font-extrabold text-[#5B2BC0] transition hover:-translate-y-0.5 hover:bg-[#F7F2FF]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Copiar código
                </button>
                <button
                  onClick={() =>
                    navigate(
                      `/dashboard?groupId=${encodeURIComponent(createdGroupId)}`,
                    )
                  }
                  className="flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1E0A4E,#7A4FD6)] px-4 py-4 font-body text-base font-extrabold text-white shadow-[0_14px_28px_rgba(30,10,78,0.18)] transition hover:-translate-y-0.5"
                >
                  Ir al grupo →
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout
      user={{
        name: localUser?.nombre || "Usuario",
        role: "Organizador",
        initials: (localUser?.nombre || "U").slice(0, 2).toUpperCase(),
        color: "#1E6FD9",
      }}
      showTripSelector={false}
      showRightPanel={false}
      sidebarContent={<SidebarCreateGroup currentStep={sidebarStep} />}
    >
      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F6FF_46%,#F3EEFF_100%)]">
        <div
          className="fixed inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(30,10,78,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 py-8 lg:px-8">
          <button
            onClick={() => navigate("/my-trips")}
            className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-[#D8C8FF] bg-white px-4 py-2.5 font-body text-sm font-extrabold text-[#5B2BC0] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F7F2FF]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M19 12H5M12 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Volver
          </button>
          <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#D8C8FF] bg-[linear-gradient(135deg,#1E0A4E_0%,#3C178B_52%,#7A4FD6_100%)] px-6 py-7 shadow-[0_22px_48px_rgba(30,10,78,0.18)]">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#B89BFF]/25 blur-3xl" />
            <div className="absolute -bottom-24 left-12 h-52 w-52 rounded-full bg-[#1E6FD9]/20 blur-3xl" />
            <div className="relative">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-body text-xs font-extrabold uppercase tracking-[0.16em] text-[#D8C8FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B89BFF]" />
                Nuevo viaje grupal
              </p>
              <h1 className="font-heading text-4xl font-extrabold leading-tight text-white">
                Crear nuevo grupo
              </h1>
              <p className="mt-2 max-w-2xl font-body text-base font-medium leading-relaxed text-white/75">
                Configura destino, fechas, presupuesto e integrantes con una experiencia más clara para empezar a planear juntos.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Section 1: Basic Info */}
            <div className="rounded-3xl border border-[#D9E4F7] bg-white p-6 shadow-[0_14px_34px_rgba(30,10,78,0.08)]">
              <SectionLabel
                title="Información básica"
                help="Completa los datos generales del viaje. El nombre tiene máximo 60 caracteres y la descripción máximo 300."
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
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
                }
              />
              <div className="space-y-4">
                <InputField
                  label="Nombre del grupo"
	                  placeholder="Ej: Cancún verano 2026"
                  value={form.name}
                  onChange={set("name") as (v: string) => void}
                  error={errors.name}
                  hint="Elige un nombre que identifique a tu grupo"
                  maxLength={60}
                />
                <DestinationSearch
                  value={form.destination}
                  onChange={(value, result) => {
                    set("destination")(value);
                    setDestinationData(result ?? null);
                  }}
                  error={errors.destination}
                  token={accessToken}
                />
                <InputField
                  label="Descripción (opcional)"
                  placeholder="¿De qué trata este viaje?"
                  value={form.description}
                  onChange={set("description") as (v: string) => void}
                  error={errors.description}
                  multiline
                  maxLength={300}
                  hint="Describe brevemente el propósito del viaje"
                />
              </div>
            </div>

            {/* Section 2: Dates & Members */}
            <div className="rounded-3xl border border-[#D9E4F7] bg-white p-6 shadow-[0_14px_34px_rgba(30,10,78,0.08)]">
              <SectionLabel
                title="Fechas y capacidad"
                help="Define fechas futuras y la capacidad máxima. El regreso debe ser posterior a la salida y el viaje no debe exceder 60 días."
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white"
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
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <DatePickerField
                  label="Fecha de salida"
                  placeholder="¿Cuándo salen?"
                  value={form.startDate}
                  min={todayISO()}
                  onChange={set("startDate") as (v: string) => void}
                  error={errors.startDate}
                />
                <DatePickerField
                  label="Fecha de regreso"
                  placeholder="¿Cuándo regresan?"
                  value={form.endDate}
                  min={minEndDate}
                  max={maxEndDate}
                  hint={
                    form.startDate
                      ? `Posterior a la salida · máx. ${MAX_TRIP_DURATION_DAYS} días`
                      : "Selecciona primero la fecha de salida."
                  }
                  onChange={set("endDate") as (v: string) => void}
                  error={errors.endDate}
                />
              </div>
              <div className="mt-4">
                <label className="mb-2 block font-body text-sm font-extrabold uppercase tracking-[0.14em] text-[#4B2FA3]">
                  Máximo de miembros
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={form.maxMembers}
                    onChange={(e) => set("maxMembers")(e.target.value)}
                    className="flex-1 accent-[#7A4FD6]"
                  />
                  <div className="flex h-12 w-16 items-center justify-center rounded-2xl border border-[#D8C8FF] bg-[#F3EEFF]">
                    <span className="font-heading text-xl font-extrabold text-[#1E0A4E]">
                      {form.maxMembers}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <p className="font-body text-sm font-medium text-[#64748B]">
                    Puedes crear el viaje solo para ti. Después podrás invitar a
                    más integrantes si lo necesitas.
                  </p>
                  {errors.maxMembers && (
                    <p className="text-right font-body text-sm font-bold text-red-500">
                      {errors.maxMembers}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <InputField
                  label="Presupuesto total (MXN)"
                  type="text"
                  placeholder="Ej: 25000"
                  value={form.totalBudget}
                  maxLength={TOTAL_BUDGET_INTEGER_DIGITS + TOTAL_BUDGET_DECIMAL_DIGITS + 1}
                  onChange={set("totalBudget") as (v: string) => void}
                  error={errors.totalBudget}
                  hint={`Máximo ${TOTAL_BUDGET_INTEGER_DIGITS} dígitos enteros y ${TOTAL_BUDGET_DECIMAL_DIGITS} decimales. Debe ser mayor a cero.`}
                />
              </div>
            </div>

            {/* Section 3: Members */}
            {canInviteDuringCreation && (
              <div className="rounded-3xl border border-[#D9E4F7] bg-white p-6 shadow-[0_14px_34px_rgba(30,10,78,0.08)]">
                <SectionLabel
                  title="Invitar al grupo"
                  help="Agrega correos válidos y solo hasta el límite permitido por la capacidad seleccionada. Si eliges un viaje de una persona, esta sección se oculta."
                  icon={
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-white"
                    >
                      <path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="9"
                        cy="7"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                />
                <MembersSection
                  members={members}
                  maxInvitations={maxInvitationSlots}
                  onAdd={(m) => setMembers((prev) => [...prev, m])}
                  onRemove={(id) =>
                    setMembers((prev) => prev.filter((m) => m.id !== id))
                  }
                />
              </div>
            )}

            {/* Section 4: Privacy */}
            <div className="rounded-3xl border border-[#D9E4F7] bg-white p-6 shadow-[0_14px_34px_rgba(30,10,78,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="mb-1 font-heading text-xl font-extrabold text-[#1E0A4E]">
                    Grupo público
                  </h3>
                  <p className="font-body text-base font-medium leading-relaxed text-[#64748B]">
                    Activado: cualquiera con el código entra sin aprobación.
                    Desactivado: el admin aprueba solicitudes.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={form.isPublic}
                  onClick={() => set("isPublic")(!form.isPublic)}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#7A4FD6]/30 ${
                    form.isPublic ? "bg-[#7A4FD6]" : "bg-[#CBD5E1]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      form.isPublic ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {isOffline && (
              <StandardInlineAlert
                title="Sin conexión — modo lectura activo"
                message="Puedes revisar la información capturada, pero no se harán búsquedas de destino ni se creará el grupo hasta recuperar internet."
                tone="warning"
              />
            )}

            {!isFormValid && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="font-body text-base font-semibold leading-relaxed text-amber-800">
                  Completa nombre, destino, fechas válidas y presupuesto base
                  mayor a cero para habilitar la creación del grupo. La fecha de
                  regreso debe ser posterior a la salida y el viaje no puede
                  exceder {MAX_TRIP_DURATION_DAYS} días.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <button
                type="button"
                onClick={() => navigate("/my-trips")}
                disabled={loading}
                className="w-full rounded-2xl border border-[#D8C8FF] bg-white px-6 py-4 font-body text-base font-extrabold text-[#5B2BC0] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#F7F2FF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

            <button
              onClick={handleCreate}
              disabled={loading || !isFormValid || isOffline}
              aria-disabled={loading || !isFormValid || isOffline}
              title={
                isOffline
                  ? "Acción no disponible sin conexión."
                  : !isFormValid
                    ? "Completa los campos obligatorios con valores válidos para crear el grupo."
                    : undefined
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1E0A4E,#7A4FD6)] px-6 py-4 font-body text-base font-extrabold text-white shadow-[0_14px_28px_rgba(30,10,78,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.3"
                    />
                    <path
                      d="M12 2a10 10 0 0110 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="19"
                      y1="8"
                      x2="19"
                      y2="14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="22"
                      y1="11"
                      x2="16"
                      y2="11"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Crear grupo
                </>
              )}
            </button>
            </div>
            {serverError && (
              <StandardInlineAlert
                title="No se puede crear el grupo"
                message={serverError}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default CreateGroupPage;
