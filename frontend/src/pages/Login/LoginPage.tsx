import { useEffect, useState } from "react";
import logoWhite from "../../assets/logo-white.png";
import googleIcon from "../../assets/google.png";
import facebookIcon from "../../assets/facebook.png";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError, apiClient } from "../../services/apiClient";

const REDIRECT_STORAGE_KEY = "ithera_post_login_redirect";
const LOGIN_LOCK_STORAGE_KEY = "ithera_login_lockout";
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*)*\.[A-Za-z]{2,24}$/;

type StoredLoginLock = {
  email: string;
  lockedUntil: number;
};

function normalizeLoginEmail(value: string): string {
  return value.trim().toLowerCase();
}

type EmailAvailabilityResult = {
  ok: boolean;
  available: boolean;
  code?: string;
  message?: string;
};

async function isEmailAvailableForRegistration(emailValue: string): Promise<boolean | null> {
  try {
    const result = await apiClient.get<EmailAvailabilityResult>(
      `/auth/email-availability?email=${encodeURIComponent(normalizeLoginEmail(emailValue))}`,
    );

    return result.available;
  } catch {
    return null;
  }
}

function readStoredLoginLock(): StoredLoginLock | null {
  try {
    const raw = localStorage.getItem(LOGIN_LOCK_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLoginLock>;
    if (typeof parsed.email !== "string" || typeof parsed.lockedUntil !== "number") {
      localStorage.removeItem(LOGIN_LOCK_STORAGE_KEY);
      return null;
    }

    if (parsed.lockedUntil <= Date.now()) {
      localStorage.removeItem(LOGIN_LOCK_STORAGE_KEY);
      return null;
    }

    return {
      email: parsed.email,
      lockedUntil: parsed.lockedUntil,
    };
  } catch {
    localStorage.removeItem(LOGIN_LOCK_STORAGE_KEY);
    return null;
  }
}

function persistLoginLock(emailValue: string, lockedUntil: number): void {
  localStorage.setItem(
    LOGIN_LOCK_STORAGE_KEY,
    JSON.stringify({
      email: normalizeLoginEmail(emailValue),
      lockedUntil,
    }),
  );
}

function clearStoredLoginLock(): void {
  localStorage.removeItem(LOGIN_LOCK_STORAGE_KEY);
}

function getSafeRedirect(value: string | null): string {
  if (!value) return "/my-trips";
  if (!value.startsWith("/") || value.startsWith("//")) return "/my-trips";
  return value;
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const rawSessionExpired =
    (location.state as { sessionExpired?: boolean } | null)?.sessionExpired === true;

  const hasPreviousSession =
    typeof window !== "undefined" &&
    Object.keys(localStorage).some((key) =>
      key.toLowerCase().includes("auth") ||
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("session"),
    );

  const sessionExpired = rawSessionExpired && hasPreviousSession;
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();

  useEffect(() => {
    const updateNetworkState = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);

      if (offline) {
        setLoading(false);
        setError("");
        setErrorCode(null);
      }
    };

    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);

    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  const redirect = getSafeRedirect(
    searchParams.get("redirect") ||
      sessionStorage.getItem(REDIRECT_STORAGE_KEY),
  );

  const isLoginLocked = lockRemainingSeconds > 0;
  const lockMinutes = Math.floor(lockRemainingSeconds / 60);
  const lockSeconds = String(lockRemainingSeconds % 60).padStart(2, "0");
  const normalizedEmail = normalizeLoginEmail(email);
  const isEmailFormatValid = EMAIL_REGEX.test(normalizedEmail);
  const isLoginFormReady = isEmailFormatValid && password.trim().length > 0;

  useEffect(() => {
    const storedLock = readStoredLoginLock();
    if (!storedLock) return;

    setEmail((currentEmail) => currentEmail || storedLock.email);
    setLockRemainingSeconds(
      Math.max(Math.ceil((storedLock.lockedUntil - Date.now()) / 1000), 0),
    );
    setError("Por seguridad, tu acceso ha sido pausado por 5 minutos. Inténtalo de nuevo más tarde.");
  }, []);

  useEffect(() => {
    const currentEmail = normalizeLoginEmail(email);
    const storedLock = readStoredLoginLock();

    if (!storedLock) {
      setLockRemainingSeconds((current) => (current > 0 ? 0 : current));
      return;
    }

    if (!currentEmail || currentEmail === storedLock.email) {
      setLockRemainingSeconds(
        Math.max(Math.ceil((storedLock.lockedUntil - Date.now()) / 1000), 0),
      );
      return;
    }

    setLockRemainingSeconds((current) => {
      if (current > 0) {
        setError("");
        return 0;
      }
      return current;
    });
  }, [email]);

  useEffect(() => {
    if (lockRemainingSeconds <= 0) {
      const storedLock = readStoredLoginLock();
      if (!storedLock) clearStoredLoginLock();
      return;
    }

    const timer = window.setInterval(() => {
      setLockRemainingSeconds((current) => {
        const next = Math.max(current - 1, 0);
        if (next === 0) clearStoredLoginLock();
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockRemainingSeconds]);

  const showOfflineState = () => {
    setLoading(false);
    setIsOffline(true);
    setError("");
    setErrorCode(null);
  };

  const isNetworkError = (value: unknown): boolean => {
    if (!(value instanceof Error)) return false;
    const message = value.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network request failed")
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isOffline) {
      showOfflineState();
      return;
    }

    if (isLoginLocked) {
      setError(
        `Por seguridad, tu acceso ha sido pausado por 5 minutos. Inténtalo de nuevo en ${lockMinutes}:${lockSeconds}.`,
      );
      return;
    }

    setError("");
    setErrorCode(null);

    if (!validateEmail(email)) {
      setErrorCode("ERR-14-004");
      return;
    }

    if (!password) {
      setError("Ingresa tu contraseña.");
      setErrorCode(null);
      return;
    }

    try {
      setLoading(true);
      await login(email, password, rememberMe);
      setErrorCode(null);
      clearStoredLoginLock();
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = err.payload;
        const code = payload?.code ?? null;

        setErrorCode(code);

        if (code?.startsWith("ERR-11-")) {
          setPassword("");
          setShowPassword(false);
        }

        const retryAfterSeconds =
          typeof payload?.retryAfterSeconds === "number"
            ? payload.retryAfterSeconds
            : 0;

        if (code === "ERR-11-003" && retryAfterSeconds > 0) {
          const lockedUntil = payload?.lockedUntil
            ? Date.parse(payload.lockedUntil)
            : Date.now() + retryAfterSeconds * 1000;

          if (!Number.isNaN(lockedUntil)) {
            persistLoginLock(email, lockedUntil);
          }

          setLockRemainingSeconds(retryAfterSeconds);
          setError(err.message);
          return;
        }

        if (code === "ERR-11-001" || code === "ERR-11-002") {
          const emailAvailability = await isEmailAvailableForRegistration(email);

          if (emailAvailability === true || code === "ERR-11-002") {
            setErrorCode("ERR-11-002");
            setError("No encontramos una cuenta activa con ese correo. ¿Deseas registrarte?");
            return;
          }
        }

        setError(err.message);
        return;
      }

      if (isNetworkError(err)) {
        showOfflineState();
        return;
      }

      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
      setError(message);
      setErrorCode(null);
    } finally {
      setLoading(false);
    }
  };

  const updateCapsLockState = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    setIsCapsLockOn(event.getModifierState("CapsLock"));
  };

  const clearCapsLockState = () => {
    setIsCapsLockOn(false);
  };

  const validateEmail = (value: string) => {
    const normalizedEmail = normalizeLoginEmail(value);

    if (!normalizedEmail) {
      setEmailError("Ingresa tu correo electrónico.");
      return false;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError("Ingresa un correo electrónico válido (ej. usuario@dominio.com).");
      return false;
    }

    setEmailError("");
    return true;
  };

  const clearLoginError = () => {
    if (!isLoginLocked) {
      setError("");
      setErrorCode(null);
    }
  };

  const inputBase =
    "w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 py-3 text-[15px] text-[#3D4A5C] outline-none transition placeholder:text-[#7A8799] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15";

  return (
    <div className="h-screen overflow-hidden bg-[#F4F6F8] font-body">
      <div className="grid h-screen grid-cols-1 lg:grid-cols-[45%_55%]">
        {/* ── Left panel ── */}
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0D0820_0%,#1E0A4E_48%,#31136F_100%)]" />
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:26px_26px]" />
          </div>
          <div className="landing-glow absolute left-10 top-28 h-40 w-40 rounded-full bg-[#1E6FD9]/35 blur-3xl" />
          <div className="landing-glow absolute bottom-20 right-8 h-44 w-44 rounded-full bg-[#35C56A]/25 blur-3xl" />

          <div className="relative z-10 flex h-full w-full flex-col px-16 py-12">
            <Link to="/" className="inline-flex w-fit">
              <img
                src={logoWhite}
                alt="Ithera"
                className="h-16 w-auto cursor-pointer object-contain"
              />
            </Link>

            <div className="flex flex-1 items-center">
              <div className="w-full max-w-[620px]">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#9AF0B8] backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-[#35C56A]" />
                  Plataforma colaborativa
                </div>
                <h1 className="text-[68px] font-extrabold leading-[0.96] tracking-[-0.04em] text-white">
                  Planea, vota y organiza viajes sin perder el control.
                </h1>

                <p className="mt-8 max-w-[540px] text-[19px] leading-[1.65] text-white/75">
                  Itinerarios, presupuesto, decisiones y documentos conectados
                  para que cada integrante sepa qué sigue.
                </p>

                <div className="mt-10 grid max-w-[520px] grid-cols-3 gap-3">
                  {[
                    ["Votos", "Decisiones claras"],
                    ["Gastos", "Balance visible"],
                    ["Bóveda", "Todo a mano"],
                  ].map(([title, subtitle]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
                    >
                      <p className="text-[13px] font-bold text-white">{title}</p>
                      <p className="mt-1 text-[11px] leading-tight text-white/55">
                        {subtitle}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid max-w-[560px] grid-cols-[1fr_0.9fr] gap-3">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9ED4FF]">
                  Próximo plan
                </p>
                <p className="mt-2 text-[16px] font-bold text-white">
                  Cena frente al mar
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-3/4 rounded-full bg-[#35C56A]" />
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D8C8FF]">
                  Presupuesto
                </p>
                <p className="mt-2 text-[22px] font-extrabold text-white">
                  $50,000
                </p>
                <p className="mt-1 text-[12px] text-white/55">
                  28% comprometido
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right panel ── */}
        <section className="flex h-screen items-start justify-center overflow-y-auto bg-[#F4F6F8] px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
          <div className="w-full max-w-[470px]">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#98A2B3] transition hover:text-[#667085]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M19 12H5M5 12l7-7M5 12l7 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Volver al inicio
            </Link>

            {/* Tabs */}
            <div className="mb-7 flex items-center justify-center gap-8 text-[15px]">
              <button
                type="button"
                className="border-b-2 border-[#111827] pb-1 font-semibold text-[#111827]"
              >
                Iniciar sesión
              </button>

              <Link
                to="/register"
                className="text-[#98A2B3] transition hover:text-[#667085]"
              >
                Registrarse
              </Link>
            </div>

            {/* Title */}
            <h2 className="mb-8 text-center text-[52px] font-extrabold leading-none tracking-[-0.04em] text-[#111827]">
              Bienvenido de nuevo
            </h2>

            {/* Social buttons */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={isOffline || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    await loginWithGoogle(redirect);
                  } catch (err) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : "No se pudo iniciar con Google";
                    setError(message);
                    setLoading(false);
                  }
                }}
                className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] border border-[#D9DEE7] bg-white text-[16px] font-medium text-[#344054] transition hover:border-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img
                  src={googleIcon}
                  alt="Google"
                  className="h-5 w-5 object-contain"
                />
                <span>Google</span>
              </button>

              <button
                type="button"
                disabled={isOffline || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    await loginWithFacebook(redirect);
                  } catch (err) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : "No se pudo iniciar con Facebook";
                    setError(message);
                    setLoading(false);
                  }
                }}
                className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] border border-[#D9DEE7] bg-white text-[16px] font-medium text-[#344054] transition hover:border-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <img
                  src={facebookIcon}
                  alt="Facebook"
                  className="h-5 w-5 object-contain"
                />
                <span>Facebook</span>
              </button>
            </div>

            {/* Divider */}
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E4E7EC]" />
              <span className="text-[14px] text-[#98A2B3]">
                o continúa con tu correo
              </span>
              <div className="h-px flex-1 bg-[#E4E7EC]" />
            </div>

            {/* Session expired banner */}
            {sessionExpired && (
              <div className="mb-5 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                Tu sesión expiró. Por favor inicia sesión de nuevo.
              </div>
            )}

            {/* Offline banner */}
            {isOffline && (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 flex items-start gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#FFFBEB] px-4 py-3 text-sm font-medium text-[#92400E]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="mt-[1px] shrink-0"
                >
                  <path
                    d="M3 3l18 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M2 8.8C7.8 4.2 16.2 4.2 22 8.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5.5 12.3a10.4 10.4 0 0113 0"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 15.8a5 5 0 016 0"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 19h.01"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  Sin conexión. Verifica tu red e inténtalo de nuevo.
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                  Correo electrónico
                </label>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    clearLoginError();
                    // Validación en tiempo real: solo cuando ya escribió algo con @
                    const normalized = normalizeLoginEmail(val);
                    if (normalized.length > 0 && normalized.includes("@")) {
                      if (!EMAIL_REGEX.test(normalized)) {
                        setEmailError("Ingresa un correo electrónico válido (ej. usuario@dominio.com).");
                      } else {
                        setEmailError("");
                      }
                    } else {
                      setEmailError("");
                    }
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  aria-invalid={Boolean(emailError)}
                  className={`${inputBase} ${emailError || errorCode === "ERR-11-002" ? "border-[#EF4444]" : ""}`}
                />
                {emailError && (
                  <p className="mt-1 text-[12px] font-medium text-[#EF4444]">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearLoginError();
                    }}
                    onKeyDown={updateCapsLockState}
                    onKeyUp={updateCapsLockState}
                    onFocus={() => setIsCapsLockOn(false)}
                    onBlur={clearCapsLockState}
                    placeholder="••••••••"
                    aria-describedby={
                      isCapsLockOn ? "caps-lock-warning" : undefined
                    }
                    className={`${inputBase} pr-12 ${error ? "border-[#EF4444]" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition"
                  >
                    {showPassword ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.58 10.58a3 3 0 004.24 4.24"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M9.88 5.08A10.94 10.94 0 0112 5c6 0 10 7 10 7a21.84 21.84 0 01-4.35 5.27"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M6.61 6.61A21.82 21.82 0 002 12s4 7 10 7a10.94 10.94 0 005.27-1.35"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {isCapsLockOn && (
                  <div
                    id="caps-lock-warning"
                    role="status"
                    aria-live="polite"
                    className="mt-2 flex items-start gap-2 rounded-[12px] border border-[#F59E0B]/30 bg-[#FFFBEB] px-3 py-2 text-[12px] font-medium text-[#92400E]"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="mt-[1px] shrink-0"
                    >
                      <path
                        d="M12 3l9 9h-5v6H8v-6H3l9-9Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 21h8"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>
                      Bloq Mayús está activado. Verifica tu contraseña antes de
                      iniciar sesión.
                    </span>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && !isOffline && (
                <div
                  role="alert"
                  className={`rounded-[12px] border px-3 py-2 text-[12px] font-semibold ${
                    isLoginLocked
                      ? "border-[#F59E0B]/30 bg-[#FFFBEB] text-[#92400E]"
                      : "border-[#EF4444]/30 bg-[#FEF2F2] text-[#EF4444]"
                  }`}
                >
                  <p>{error}</p>
                  {isLoginLocked && (
                    <p className="mt-1 font-medium">
                      Tiempo restante: {lockMinutes}:{lockSeconds}. El botón se
                      habilitará automáticamente.
                    </p>
                  )}

                  {errorCode === "ERR-11-002" && (
                    <Link
                      to="/register"
                      className="mt-3 inline-flex rounded-full bg-[#7A4FD6] px-4 py-2 text-[12px] font-bold text-white transition hover:opacity-90"
                    >
                      Crear cuenta
                    </Link>
                  )}
                </div>
              )}

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D9DEE7] accent-[#7A4FD6]"
                  />
                  <span className="text-[14px] text-[#344054]">Recordarme</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-[14px] font-medium text-[#7A4FD6] transition hover:opacity-80"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || isOffline || isLoginLocked || !isLoginFormReady}
                className="mt-2 h-[54px] w-full rounded-full bg-[linear-gradient(90deg,#7A4FD6_0%,#6D46D4_35%,#6E45E6_65%,#5B35D5_100%)] text-[18px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Iniciando sesión..." : isOffline ? "Sin conexión" : isLoginLocked ? `Bloqueado ${lockMinutes}:${lockSeconds}` : "Iniciar sesión"}
              </button>

              {/* Sign-up link */}
              <p className="pt-2 text-center text-[14px] text-[#98A2B3]">
                ¿No tienes cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-[#7A4FD6] transition hover:opacity-80"
                >
                  Regístrate
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
