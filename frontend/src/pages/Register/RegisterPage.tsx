import { useCallback, useEffect, useMemo, useState } from "react";
import logoWhite from "../../assets/logo-white.png";
import googleIcon from "../../assets/google.png";
import facebookIcon from "../../assets/facebook.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { ApiError, apiClient } from "../../services/apiClient";

type RegisterForm = {
  name: string;
  lastNamePaterno: string;
  lastNameMaterno: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterErrors = Record<keyof RegisterForm, string>;

type PasswordStrength = {
  label: string;
  score: number;
};

const EMAIL_REGEX = /^(?!.*\.\.)(?!.*@.*\.\.)(?!.*@-)(?!.*-\.)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const PASSWORD_RULES = {
  minLength: /^.{8,}$/,
  uppercase: /[A-ZÁÉÍÓÚÑ]/,
  lowercase: /[a-záéíóúñ]/,
  number: /\d/,
};

function getPasswordChecks(password: string) {
  return {
    minLength: PASSWORD_RULES.minLength.test(password),
    uppercase: PASSWORD_RULES.uppercase.test(password),
    lowercase: PASSWORD_RULES.lowercase.test(password),
    number: PASSWORD_RULES.number.test(password),
  };
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = getPasswordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;

  if (!password) return { label: "Sin contraseña", score: 0 };
  if (score <= 1) return { label: "Muy débil", score: 1 };
  if (score === 2) return { label: "Débil", score: 2 };
  if (score === 3) return { label: "Fuerte", score: 3 };
  return { label: "Muy fuerte", score: 4 };
}

function isPasswordValid(password: string) {
  const checks = getPasswordChecks(password);
  return Object.values(checks).every(Boolean);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    lastNamePaterno: "",
    lastNameMaterno: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<RegisterErrors>({
    name: "",
    lastNamePaterno: "",
    lastNameMaterno: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();

  const passwordChecks = useMemo(() => getPasswordChecks(form.password), [form.password]);
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const showPasswordHelp = isPasswordFocused || form.password.length > 0;
  const normalizedEmail = normalizeEmail(form.email);
  const isEmailFormatValid = EMAIL_REGEX.test(normalizedEmail);
  const isRegisterFormReady =
    form.name.trim().length > 0 &&
    form.lastNamePaterno.trim().length > 0 &&
    form.lastNameMaterno.trim().length > 0 &&
    isEmailFormatValid &&
    isEmailAvailable === true &&
    !isCheckingEmail &&
    isPasswordValid(form.password) &&
    passwordsMatch;

  const handleChange = (field: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setServerMessage("");
    setIsSuccessMessage(false);

    if (field === "email") {
      setIsEmailAvailable(null);
    }
  };

  const validateEmailFormat = useCallback((value = form.email) => {
    const normalizedEmail = normalizeEmail(value);

    if (!normalizedEmail) {
      setErrors((prev) => ({ ...prev, email: "Ingresa tu correo electrónico." }));
      setIsEmailAvailable(null);
      return false;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrors((prev) => ({
        ...prev,
        email: "Ingresa un correo electrónico válido (ej. usuario@dominio.com).",
      }));
      setIsEmailAvailable(null);
      return false;
    }

    setErrors((prev) => ({ ...prev, email: "" }));
    return true;
  }, [form.email]);

  const checkEmailAvailability = useCallback(async (value = form.email) => {
    const normalizedEmail = normalizeEmail(value);

    if (!validateEmailFormat(value)) return false;

    setIsCheckingEmail(true);

    try {
      const result = await apiClient.get<{ ok: boolean; available: boolean; code?: string; message?: string }>(
        `/auth/email-availability?email=${encodeURIComponent(normalizedEmail)}`
      );

      if (normalizeEmail(form.email) !== normalizedEmail) return false;

      if (!result.available) {
        setIsEmailAvailable(false);
        setErrors((prev) => ({
          ...prev,
          email: "Ese correo ya está asociado a una cuenta activa. ¿Deseas iniciar sesión?",
        }));
        return false;
      }

      setIsEmailAvailable(true);
      setErrors((prev) => ({ ...prev, email: "" }));
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError && err.payload?.code === "ERR-12-004"
          ? "Ese correo ya está asociado a una cuenta activa. ¿Deseas iniciar sesión?"
          : err instanceof Error
            ? err.message
            : "No se pudo verificar el correo. Inténtalo de nuevo.";

      if (normalizeEmail(form.email) !== normalizedEmail) return false;

      setIsEmailAvailable(false);
      setErrors((prev) => ({ ...prev, email: message }));
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  }, [form.email, validateEmailFormat]);

  useEffect(() => {
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) return;

    const timer = window.setTimeout(() => {
      void checkEmailAvailability(normalizedEmail);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [normalizedEmail, checkEmailAvailability]);

  const validate = () => {
    const newErrors: RegisterErrors = {
      name: "",
      lastNamePaterno: "",
      lastNameMaterno: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    let isValid = true;

    if (!form.name.trim()) {
      newErrors.name = "Ingresa tu nombre.";
      isValid = false;
    }

    if (!form.lastNamePaterno.trim()) {
      newErrors.lastNamePaterno = "Ingresa tu apellido paterno.";
      isValid = false;
    }

    if (!form.lastNameMaterno.trim()) {
      newErrors.lastNameMaterno = "Ingresa tu apellido materno.";
      isValid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = "Ingresa tu correo electrónico.";
      isValid = false;
    } else if (!EMAIL_REGEX.test(normalizeEmail(form.email))) {
      newErrors.email = "Ingresa un correo electrónico válido (ej. usuario@dominio.com).";
      isValid = false;
    } else if (isEmailAvailable === false) {
      newErrors.email = "Ese correo ya está asociado a una cuenta activa. ¿Deseas iniciar sesión?";
      isValid = false;
    } else if (isEmailAvailable !== true) {
      newErrors.email = "Verifica que el correo esté disponible antes de continuar.";
      isValid = false;
    }

    if (!form.password.trim()) {
      newErrors.password = "Ingresa una contraseña.";
      isValid = false;
    } else if (!isPasswordValid(form.password)) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.";
      isValid = false;
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña.";
      isValid = false;
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden. Verifica e inténtalo de nuevo.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerMessage("");
    setIsSuccessMessage(false);

    if (!validate()) return;

    const emailAvailable = await checkEmailAvailability(form.email);
    if (!emailAvailable) return;

    try {
      setLoading(true);

      const result = await register({
        name: form.name.trim(),
        lastNamePaterno: form.lastNamePaterno.trim(),
        lastNameMaterno: form.lastNameMaterno.trim(),
        email: normalizeEmail(form.email),
        password: form.password,
      });

      if (result.requiresEmailConfirmation) {
        navigate('/otp', { state: { email: normalizeEmail(form.email) } });
        return;
      }

      navigate("/my-trips");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo registrar la cuenta";
      setIsSuccessMessage(false);
      setServerMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 py-3 text-[15px] text-[#3D4A5C] outline-none transition placeholder:text-[#7A8799] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15";

  const passwordRuleClass = (valid: boolean) =>
    `flex items-center gap-2 text-[12px] ${valid ? "text-[#16A34A]" : "text-[#7A8799]"}`;

  const strengthWidths = ["w-0", "w-1/4", "w-2/4", "w-3/4", "w-full"];
  const strengthColors = ["bg-[#E4E7EC]", "bg-[#EF4444]", "bg-[#F97316]", "bg-[#22C55E]", "bg-[#16A34A]"];

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-body">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[45%_55%]">
        <section
          className="relative hidden overflow-hidden lg:flex"
          style={{
            background: "linear-gradient(135deg, #0D0820 0%, #1E0A4E 55%, #0D0820 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-[0.15]">
            <div className="h-full w-full bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          <div className="relative z-10 flex h-full w-full flex-col px-16 py-12">
            <div>
              <Link to="/">
                <img src={logoWhite} alt="Ithera" className="h-16 w-auto cursor-pointer object-contain" />
              </Link>
            </div>

            <div className="flex flex-1 items-center">
              <div className="w-full max-w-[600px]">
                <h1 className="text-[72px] font-extrabold leading-[0.95] tracking-[-0.04em] text-white">
                  Planifica tus viajes en grupo sin el caos.
                </h1>

                <p className="mt-10 max-w-[520px] text-[20px] leading-[1.6] text-white/80">
                  Organiza itinerarios, controla los gastos compartidos y reserva tu próxima aventura con amigos de forma sencilla en un solo lugar.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#F4F6F8] px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[470px]">
            <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#98A2B3] transition hover:text-[#667085]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Volver al inicio
            </Link>

            <div className="mb-7 flex items-center justify-center gap-8 text-[15px]">
              <Link to="/login" className="text-[#98A2B3] transition hover:text-[#667085]">
                Iniciar sesión
              </Link>

              <button type="button" className="border-b-2 border-[#111827] pb-1 font-semibold text-[#111827]">
                Registrarse
              </button>
            </div>

            <h2 className="mb-8 text-center text-[52px] font-extrabold leading-none tracking-[-0.04em] text-[#111827]">
              Crea tu cuenta
            </h2>

            <div className="mb-8 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setServerMessage("");
                    await loginWithGoogle();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "No se pudo iniciar sesión con Google";
                    setIsSuccessMessage(false);
                    setServerMessage(message);
                  }
                }}
                className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] border border-[#D9DEE7] bg-white text-[16px] font-medium text-[#344054] transition hover:border-[#2C8BE6]"
              >
                <img src={googleIcon} alt="Google" className="h-5 w-5 object-contain" />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    setServerMessage("");
                    await loginWithFacebook();
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "No se pudo iniciar sesión con Facebook";
                    setIsSuccessMessage(false);
                    setServerMessage(message);
                  }
                }}
                className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] border border-[#D9DEE7] bg-white text-[16px] font-medium text-[#344054] transition hover:border-[#2C8BE6]"
              >
                <img src={facebookIcon} alt="Facebook" className="h-5 w-5 object-contain" />
                <span>Facebook</span>
              </button>
            </div>

            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E4E7EC]" />
              <span className="text-[14px] text-[#98A2B3]">o continúa con tu correo</span>
              <div className="h-px flex-1 bg-[#E4E7EC]" />
            </div>

            {serverMessage && (
              <div
                className={`mb-5 rounded-xl border px-4 py-3 ${
                  isSuccessMessage
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
                }`}
              >
                <p className="text-sm font-semibold">
                  {isSuccessMessage ? "Revisa tu correo" : "No se pudo completar el registro"}
                </p>
                <p className="text-sm">{serverMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">Nombre(s)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ej. María"
                  className={`${inputBase} ${errors.name ? "border-[#EF4444]" : ""}`}
                />
                {errors.name && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">Apellido paterno</label>
                  <input
                    type="text"
                    value={form.lastNamePaterno}
                    onChange={(e) => handleChange("lastNamePaterno", e.target.value)}
                    placeholder="Ej. García"
                    className={`${inputBase} ${errors.lastNamePaterno ? "border-[#EF4444]" : ""}`}
                  />
                  {errors.lastNamePaterno && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.lastNamePaterno}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">Apellido materno</label>
                  <input
                    type="text"
                    value={form.lastNameMaterno}
                    onChange={(e) => handleChange("lastNameMaterno", e.target.value)}
                    placeholder="Ej. López"
                    className={`${inputBase} ${errors.lastNameMaterno ? "border-[#EF4444]" : ""}`}
                  />
                  {errors.lastNameMaterno && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.lastNameMaterno}</p>}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">Correo electrónico</label>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={(e) => void checkEmailAvailability(e.target.value)}
                  placeholder="nombre@correo.com"
                  aria-invalid={Boolean(errors.email)}
                  className={`${inputBase} ${errors.email ? "border-[#EF4444]" : ""}`}
                />
                {isCheckingEmail && (
                  <p className="mt-1 text-[12px] text-[#667085]">Verificando disponibilidad del correo...</p>
                )}
                {!isCheckingEmail && isEmailAvailable && !errors.email && (
                  <p className="mt-1 text-[12px] font-medium text-[#16A34A]">✓ Correo disponible.</p>
                )}
                {errors.email && (
                  <p className="mt-1 text-[12px] text-[#EF4444]">
                    {errors.email}{" "}
                    {isEmailAvailable === false && (
                      <Link to="/login" className="font-semibold underline">
                        Ir al login
                      </Link>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="••••••••"
                    className={`${inputBase} pr-12 ${errors.password ? "border-[#EF4444]" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98A2B3] transition hover:text-[#667085]"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M9.88 5.08A10.94 10.94 0 0112 5c6 0 10 7 10 7a21.84 21.84 0 01-4.35 5.27" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M6.61 6.61A21.82 21.82 0 002 12s4 7 10 7a10.94 10.94 0 005.27-1.35" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>

                {showPasswordHelp && (
                  <div className="mt-3 rounded-[14px] border border-[#D9DEE7] bg-white px-3 py-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-[#344054]">
                      <span>Fortaleza</span>
                      <span>{passwordStrength.label}</span>
                    </div>
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#E4E7EC]">
                      <div
                        className={`h-full rounded-full transition-all ${strengthWidths[passwordStrength.score]} ${strengthColors[passwordStrength.score]}`}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <p className={passwordRuleClass(passwordChecks.minLength)}>✓ Mínimo 8 caracteres</p>
                      <p className={passwordRuleClass(passwordChecks.uppercase)}>✓ 1 mayúscula</p>
                      <p className={passwordRuleClass(passwordChecks.lowercase)}>✓ 1 minúscula</p>
                      <p className={passwordRuleClass(passwordChecks.number)}>✓ 1 número</p>
                    </div>
                  </div>
                )}

                {errors.password && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.password}</p>}
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    placeholder="••••••••"
                    className={`${inputBase} pr-12 ${
                      errors.confirmPassword || passwordsMismatch
                        ? "border-[#EF4444] ring-2 ring-[#EF4444]/15"
                        : passwordsMatch
                          ? "border-[#16A34A] ring-2 ring-[#16A34A]/15"
                          : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98A2B3] transition hover:text-[#667085]"
                    aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                  >
                    {showConfirmPassword ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M9.88 5.08A10.94 10.94 0 0112 5c6 0 10 7 10 7a21.84 21.84 0 01-4.35 5.27" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M6.61 6.61A21.82 21.82 0 002 12s4 7 10 7a10.94 10.94 0 005.27-1.35" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </button>
                </div>

                {passwordsMatch && (
                  <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[#16A34A]">
                    ✓ Las contraseñas coinciden.
                  </p>
                )}
                {passwordsMismatch && !errors.confirmPassword && (
                  <p className="mt-1 text-[12px] text-[#EF4444]">Las contraseñas no coinciden.</p>
                )}
                {errors.confirmPassword && <p className="mt-1 text-[12px] text-[#EF4444]">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || !isRegisterFormReady}
                className="mt-2 h-[54px] w-full rounded-full bg-[linear-gradient(90deg,#7A4FD6_0%,#6D46D4_35%,#6E45E6_65%,#5B35D5_100%)] text-[18px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creando cuenta..." : "Continuar"}
              </button>

              <p className="pt-2 text-center text-[14px] text-[#98A2B3]">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="font-medium text-[#7A4FD6] transition hover:opacity-80">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
