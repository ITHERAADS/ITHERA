import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoWhite from "../../assets/logo-white.png";
import { supabase } from "../../lib/supabase";

type PasswordStrength = {
  label: string;
  score: number;
};

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

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] =
    useState(false);

  const passwordChecks = getPasswordChecks(password);
  const passwordStrength = getPasswordStrength(password);
  const passwordMeetsSecurityFormat = isPasswordValid(password);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const showPasswordHelp = isPasswordFocused || password.length > 0;
  const canUpdatePassword =
    ready &&
    !validating &&
    passwordMeetsSecurityFormat &&
    passwordsMatch &&
    !loading;

  useEffect(() => {
    let isMounted = true;

    const initRecoverySession = async () => {
      try {
        setError("");
        setValidating(true);

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (
            isMounted &&
            (event === "PASSWORD_RECOVERY" ||
              event === "SIGNED_IN" ||
              event === "INITIAL_SESSION" ||
              event === "TOKEN_REFRESHED") &&
            session
          ) {
            setReady(true);
            setValidating(false);
          }
        });

        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession) {
          if (isMounted) {
            setReady(true);
            setValidating(false);
          }
          return () => subscription.unsubscribe();
        }

        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session && isMounted) {
            setReady(true);
            setValidating(false);
          }

          return () => subscription.unsubscribe();
        }

        const rawHash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;

        const hashParams = new URLSearchParams(rawHash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type === "recovery" && access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) throw error;

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search,
          );

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session && isMounted) {
            setReady(true);
            setValidating(false);
          }

          return () => subscription.unsubscribe();
        }

        setTimeout(async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!isMounted) return;

          if (session) {
            setReady(true);
          } else {
            setError(
              "No se pudo validar el enlace de recuperación. Solicita uno nuevo.",
            );
          }

          setValidating(false);
        }, 1200);

        return () => subscription.unsubscribe();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudo validar el enlace de recuperación.";

        if (isMounted) {
          setError(msg);
          setReady(false);
          setValidating(false);
        }
      }
    };

    const cleanupPromise = initRecoverySession();

    return () => {
      isMounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, []);

  const handleSubmit = async () => {
    setError("");
    setMessage("");

    if (!ready) {
      setError("El enlace aún no es válido o ya expiró.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (!passwordMeetsSecurityFormat) {
      setError(
        "La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.",
      );
      return;
    }

    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden. Verifica e inténtalo de nuevo.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage("Contraseña actualizada correctamente.");

      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la contraseña.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 py-3 text-[15px] text-[#3D4A5C] outline-none transition placeholder:text-[#98A2B3] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15";

  const passwordRuleClass = (valid: boolean) =>
    `flex items-center gap-2 text-[12px] ${
      valid ? "text-[#16A34A]" : "text-[#7A8799]"
    }`;

  const strengthWidths = ["w-0", "w-1/4", "w-2/4", "w-3/4", "w-full"];
  const strengthColors = [
    "bg-[#E4E7EC]",
    "bg-[#EF4444]",
    "bg-[#F97316]",
    "bg-[#22C55E]",
    "bg-[#16A34A]",
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-body">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[45%_55%]">
        {/* Panel izquierdo */}
        <section
          className="relative hidden overflow-hidden lg:flex"
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
              <div className="max-w-[560px]">
                <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-medium text-white/85 backdrop-blur-sm">
                  Acceso protegido
                </div>

                <h1 className="text-[64px] font-extrabold leading-[0.96] tracking-[-0.04em] text-white">
                  Crea una nueva contraseña y continúa tu viaje.
                </h1>

                <p className="mt-8 max-w-[500px] text-[19px] leading-[1.65] text-white/80">
                  Elige una contraseña segura para proteger tu cuenta y seguir
                  organizando tus planes en grupo dentro de Ithera.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Panel derecho */}
        <section className="flex items-center justify-center bg-[#F4F6F8] px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[470px]">
            <Link
              to="/login"
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
              Volver al inicio de sesión
            </Link>

            <div className="rounded-[28px] border border-white/70 bg-white/90 p-8 shadow-[0_18px_60px_rgba(17,24,39,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1E6FD9]">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 11V8.8C8 6.14903 10.149 4 12.8 4C15.451 4 17.6 6.14903 17.6 8.8V11M7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V14.2C20 13.0799 20 12.5198 19.782 12.092C19.5903 11.7157 19.2843 11.4097 18.908 11.218C18.4802 11 17.9201 11 16.8 11H7.2C6.07989 11 5.51984 11 5.09202 11.218C4.71569 11.4097 4.40973 11.7157 4.21799 12.092C4 12.5198 4 13.0799 4 14.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h1 className="text-[42px] font-extrabold leading-none tracking-[-0.04em] text-[#111827]">
                  Nueva contraseña
                </h1>

                <p className="mt-4 text-[15px] leading-[1.7] text-[#667085]">
                  Define una nueva contraseña para restablecer el acceso a tu
                  cuenta.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="••••••••"
                      className={`${inputBase} pr-12 ${
                        error ? "border-[#EF4444]" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-[#98A2B3] transition hover:text-[#667085]"
                    >
                      {showPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>

                  {showPasswordHelp && (
                    <div className="mt-3 rounded-[14px] border border-[#E4E7EC] bg-white px-3 py-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-[#667085]">
                        <span>Fortaleza</span>
                        <span>{passwordStrength.label}</span>
                      </div>
                      <div className="mb-3 h-2 rounded-full bg-[#E4E7EC]">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            strengthWidths[passwordStrength.score]
                          } ${strengthColors[passwordStrength.score]}`}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <p
                          className={passwordRuleClass(
                            passwordChecks.minLength,
                          )}
                        >
                          <span>{passwordChecks.minLength ? "✓" : "○"}</span>
                          Mínimo 8 caracteres
                        </p>
                        <p
                          className={passwordRuleClass(
                            passwordChecks.uppercase,
                          )}
                        >
                          <span>{passwordChecks.uppercase ? "✓" : "○"}</span>1
                          mayúscula
                        </p>
                        <p
                          className={passwordRuleClass(
                            passwordChecks.lowercase,
                          )}
                        >
                          <span>{passwordChecks.lowercase ? "✓" : "○"}</span>1
                          minúscula
                        </p>
                        <p className={passwordRuleClass(passwordChecks.number)}>
                          <span>{passwordChecks.number ? "✓" : "○"}</span>1
                          número
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      onFocus={() => setIsConfirmPasswordFocused(true)}
                      onBlur={() => setIsConfirmPasswordFocused(false)}
                      placeholder="••••••••"
                      className={`${inputBase} pr-12 ${
                        error ? "border-[#EF4444]" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-[#98A2B3] transition hover:text-[#667085]"
                    >
                      {showConfirmPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>

                  {(isConfirmPasswordFocused || confirmPassword.length > 0) &&
                    confirmPassword.length > 0 && (
                      <p
                        className={`mt-2 text-[13px] font-semibold ${
                          passwordsMatch ? "text-[#16A34A]" : "text-[#EF4444]"
                        }`}
                      >
                        {passwordsMatch
                          ? "✓ Las contraseñas coinciden."
                          : "✕ Las contraseñas no coinciden."}
                      </p>
                    )}
                </div>

                {validating && !error && (
                  <div className="rounded-2xl border border-[#D0D5DD] bg-[#F8FAFC] px-4 py-3 text-sm text-[#667085]">
                    Validando enlace de recuperación...
                  </div>
                )}

                {!validating && ready && !error && !message && (
                  <div className="rounded-2xl border border-[#B2DDFF] bg-[#EFF8FF] px-4 py-3 text-sm text-[#175CD3]">
                    Enlace validado correctamente. Ya puedes actualizar tu
                    contraseña.
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B42318]">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-2xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-sm text-[#067647]">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canUpdatePassword}
                  className="w-full rounded-[16px] bg-[#1E6FD9] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#175FC0] disabled:cursor-not-allowed disabled:bg-[#A8B3C7] disabled:opacity-70"
                >
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </button>

                <p className="text-center text-[13px] text-[#98A2B3]">
                  Usa una contraseña segura y fácil de recordar para ti.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
