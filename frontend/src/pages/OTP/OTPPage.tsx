import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logoWhite from "../../assets/logo-white.png";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/useAuth";

const TOTAL_SECONDS = 600;

export function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const { accessToken } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  // Once verifyOtp succeeds, wait for AuthProvider to sync the session before navigating
  useEffect(() => {
    if (verified && accessToken) {
      navigate("/profile", { replace: true, state: { fromRegister: true } });
    }
  }, [verified, accessToken, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isComplete = digits.every((d) => d !== "");

  const distributeDigits = (text: string, startIndex: number) => {
    const clean = text.replace(/\D/g, "").slice(0, 6 - startIndex);
    if (!clean) return;
    const next = [...digits];
    for (let i = 0; i < clean.length; i++) {
      next[startIndex + i] = clean[i];
    }
    setDigits(next);
    const focusIndex = Math.min(startIndex + clean.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      distributeDigits(value, index);
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (!isComplete || loading) return;
    setError("");
    try {
      setLoading(true);
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: digits.join(""),
        type: "email",
      });
      if (otpError) throw otpError;
      setVerified(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Código inválido o expirado.";
      setError(msg);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setError("");
    try {
      setResending(true);
      const { error: resendError } = await supabase.auth.resend({
        email,
        type: "signup",
      });
      if (resendError) throw resendError;
      setDigits(Array(6).fill(""));
      setSecondsLeft(TOTAL_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo reenviar el código.";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const timerRed = secondsLeft < 60;
  const inputBase =
    "w-12 h-14 rounded-[14px] border border-[#D9DEE7] bg-white text-center text-[22px] font-bold text-[#111827] outline-none transition focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15 caret-transparent select-none";

  if (!email) return null;

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
              to="/register"
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
              Volver al registro
            </Link>

            <h2 className="mb-3 text-center text-[44px] font-extrabold leading-none tracking-[-0.04em] text-[#111827]">
              Verifica tu correo
            </h2>
            <p className="mb-8 text-center text-[15px] leading-[1.7] text-[#667085]">
              Ingresamos un código de 6 dígitos a{" "}
              <span className="font-semibold text-[#344054]">{email}</span>
            </p>

            {/* OTP inputs */}
            <div className="mb-2 flex justify-center gap-3">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  autoFocus={i === 0}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    distributeDigits(e.clipboardData.getData("text"), i);
                  }}
                  className={`${inputBase} ${error ? "border-[#EF4444]" : ""}`}
                />
              ))}
            </div>

            {/* Timer */}
            <p
              className={`mb-4 text-center text-[13px] font-medium ${
                timerRed ? "text-[#EF4444]" : "text-[#667085]"
              }`}
            >
              {secondsLeft > 0
                ? `El código expira en ${formatTime(secondsLeft)}`
                : "El código ha expirado"}
            </p>

            {/* Inline error */}
            {error && (
              <p className="mb-4 text-center text-[12px] text-[#EF4444]">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isComplete || loading || verified}
              className="h-[54px] w-full rounded-full bg-[linear-gradient(90deg,#7A4FD6_0%,#6D46D4_35%,#6E45E6_65%,#5B35D5_100%)] text-[18px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading || verified ? "Verificando..." : "Verificar"}
            </button>

            {/* Resend + spam */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={secondsLeft > 0 || resending}
                className={`text-[14px] font-medium transition ${
                  secondsLeft > 0 || resending
                    ? "cursor-not-allowed text-[#C4C9D4]"
                    : "text-[#7A4FD6] hover:opacity-80"
                }`}
              >
                {resending ? "Reenviando..." : "Reenviar código"}
              </button>

              <a
                href="mailto:"
                className="text-[13px] text-[#98A2B3] underline transition hover:text-[#667085]"
              >
                ¿Código en spam?
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
