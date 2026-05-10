import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logoWhite from "../../assets/logo-white.png";
import { useAuth } from '../../context/useAuth';

const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getEmailValidationError(value: string): string {
  const email = normalizeEmail(value);

  if (!email) {
    return 'Ingresa tu correo electrónico.';
  }

  if (email.length > 254) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  const parts = email.split('@');

  if (parts.length !== 2) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  const [localPart, domain] = parts;

  if (!localPart || !domain) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  if (
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  ) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  if (
    domain.length > 253 ||
    domain.includes('..') ||
    !domain.includes('.') ||
    !/^[a-z0-9.-]+$/i.test(domain)
  ) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  const labels = domain.split('.');
  const topLevelDomain = labels[labels.length - 1] ?? '';
  const rootDomain = labels.slice(-2).join('.');

  const hasInvalidLabel = labels.some(
    (label) =>
      !label ||
      label.length > 63 ||
      label.startsWith('-') ||
      label.endsWith('-') ||
      !/^[a-z0-9-]+$/i.test(label)
  );

  if (hasInvalidLabel || !/^[a-z]{2,24}$/i.test(topLevelDomain)) {
    return 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).';
  }

  const possibleCommonDomainTypo = COMMON_EMAIL_DOMAINS.find((validDomain) => {
    const validLabel = validDomain.split('.')[0];
    const currentLabel = rootDomain.split('.')[0];

    return (
      rootDomain !== validDomain &&
      rootDomain.endsWith(`.${validDomain.split('.')[validDomain.split('.').length - 1]}`) &&
      currentLabel.includes(validLabel)
    );
  });

  if (possibleCommonDomainTypo) {
    return `Revisa el dominio del correo. ¿Quisiste escribir ${possibleCommonDomainTypo}?`;
  }

  return '';
}

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValidationError = useMemo(() => getEmailValidationError(email), [email]);
  const showInlineError = touched && Boolean(emailValidationError || error);
  const canSubmit = !loading && !emailValidationError;

  const handleSubmit = async () => {
    setTouched(true);
    setError("");
    setMessage("");

    const validationError = getEmailValidationError(email);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(normalizeEmail(email));
      setMessage(
        "Si existe una cuenta con ese correo, recibirás un enlace en breve. Revisa tu bandeja de entrada y carpeta de spam."
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudo procesar la solicitud.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 py-3 text-[15px] text-[#3D4A5C] outline-none transition placeholder:text-[#98A2B3] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15";

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
                  Seguridad de acceso
                </div>

                <h1 className="text-[64px] font-extrabold leading-[0.96] tracking-[-0.04em] text-white">
                  Recupera tu acceso de forma segura.
                </h1>

                <p className="mt-8 max-w-[500px] text-[19px] leading-[1.65] text-white/80">
                  Te enviaremos un enlace para restablecer tu contraseña y volver
                  a entrar a tu espacio de planificación en Ithera.
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
                      d="M4 8.4C4 7.56 4 7.14 4.16 6.82C4.3 6.54 4.54 6.3 4.82 6.16C5.14 6 5.56 6 6.4 6H17.6C18.44 6 18.86 6 19.18 6.16C19.46 6.3 19.7 6.54 19.84 6.82C20 7.14 20 7.56 20 8.4V15.6C20 16.44 20 16.86 19.84 17.18C19.7 17.46 19.46 17.7 19.18 17.84C18.86 18 18.44 18 17.6 18H6.4C5.56 18 5.14 18 4.82 17.84C4.54 17.7 4.3 17.46 4.16 17.18C4 16.86 4 16.44 4 15.6V8.4Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M4.5 7L10.94 11.83C11.32 12.11 11.51 12.25 11.72 12.31C11.9 12.37 12.1 12.37 12.28 12.31C12.49 12.25 12.68 12.11 13.06 11.83L19.5 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h1 className="text-[42px] font-extrabold leading-none tracking-[-0.04em] text-[#111827]">
                  ¿Olvidaste tu contraseña?
                </h1>

                <p className="mt-4 text-[15px] leading-[1.7] text-[#667085]">
                  Ingresa el correo asociado a tu cuenta y te enviaremos un
                  enlace para recuperar el acceso.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                      setMessage("");
                    }}
                    onBlur={() => setTouched(true)}
                    placeholder="correo@ejemplo.com"
                    aria-invalid={showInlineError}
                    aria-describedby={showInlineError ? 'forgot-email-error' : undefined}
                    className={`${inputBase} ${showInlineError ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/15" : ""}`}
                  />
                  {showInlineError && (
                    <p id="forgot-email-error" className="mt-2 text-sm font-medium text-[#B42318]">
                      {error || emailValidationError}
                    </p>
                  )}
                </div>

                {message && (
                  <div className="rounded-2xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3 text-sm text-[#067647]">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full rounded-[16px] bg-[#1E6FD9] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#175FC0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
                </button>

                <p className="pt-1 text-center text-[14px] text-[#98A2B3]">
                  ¿Recordaste tu contraseña?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[#7A4FD6] transition hover:text-[#6A3FD1]"
                  >
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
