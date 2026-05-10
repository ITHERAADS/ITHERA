import { useEffect, useState } from "react";
import logoWhite from "../../assets/logo-white.png";
import googleIcon from "../../assets/google.png";
import facebookIcon from "../../assets/facebook.png";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../services/apiClient";

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
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
      await login(email, password);
      setErrorCode(null);
      clearStoredLoginLock();
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorCode(err.payload?.code ?? null);
        const retryAfterSeconds =
          typeof err.payload?.retryAfterSeconds === "number"
            ? err.payload.retryAfterSeconds
            : 0;

        if (err.payload?.code === "ERR-11-003" && retryAfterSeconds > 0) {
          const lockedUntil = err.payload.lockedUntil
            ? Date.parse(err.payload.lockedUntil)
            : Date.now() + retryAfterSeconds * 1000;

          if (!Number.isNaN(lockedUntil)) {
            persistLoginLock(email, lockedUntil);
          }

          setLockRemainingSeconds(retryAfterSeconds);
        }

        setError(err.message);
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
    <div className="min-h-screen bg-[#F4F6F8] font-body">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[45%_55%]">
        {/* ── Left panel ── */}
        <section
          className="relative hidden lg:flex overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0D0820 0%, #1E0A4E 55%, #0D0820 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-[0.15]">
            <div className="h-full w-full bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          <div className="relative z-10 flex h-full w-full flex-col px-16 py-12">
            <div>
              <Link to="/">
                <img
                  src={logoWhite}
                  alt="Ithera"
                  className="h-16 w-auto cursor-pointer object-contain"
                />
              </Link>
            </div>

            <div className="flex flex-1 items-center">
              <div className="w-full max-w-[600px]">
                <h1 className="text-[72px] font-extrabold leading-[0.95] tracking-[-0.04em] text-white">
                  Planifica tus viajes en grupo sin el caos.
                </h1>

                <p className="mt-10 max-w-[520px] text-[20px] leading-[1.6] text-white/80">
                  Organiza itinerarios, controla los gastos compartidos y
                  reserva tu próxima aventura con amigos de forma sencilla en un
                  solo lugar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right panel ── */}
        <section className="flex items-center justify-center bg-[#F4F6F8] px-6 py-10 sm:px-10 lg:px-16">
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
                className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] border border-[#D9DEE7] bg-white text-[16px] font-medium text-[#344054] transition hover:border-[#2C8BE6]"
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
                className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] border border-[#D9DEE7] bg-white text-[16px] font-medium text-[#344054] transition hover:border-[#2C8BE6]"
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
                    setEmail(e.target.value);
                    setEmailError("");
                    clearLoginError();
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  aria-invalid={Boolean(emailError)}
                  className={`${inputBase} ${emailError || error ? "border-[#EF4444]" : ""}`}
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
              {error && (
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
                disabled={loading || isLoginLocked || !isLoginFormReady}
                className="mt-2 h-[54px] w-full rounded-full bg-[linear-gradient(90deg,#7A4FD6_0%,#6D46D4_35%,#6E45E6_65%,#5B35D5_100%)] text-[18px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Iniciando sesión..." : isLoginLocked ? `Bloqueado ${lockMinutes}:${lockSeconds}` : "Iniciar sesión"}
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
