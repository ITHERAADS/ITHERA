import { useState } from "react";
import logoWhite from "../../assets/logo-white.png";
import googleIcon from "../../assets/google.png";
import facebookIcon from "../../assets/facebook.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    lastNamePaterno: "",
    lastNameMaterno: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
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
  const navigate = useNavigate();
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();
  const [serverMessage, setServerMessage] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors = {
      name: "",
      lastNamePaterno: "",
      lastNameMaterno: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) {
      newErrors.name = "Nombre requerido";
      isValid = false;
    }

    if (!form.lastNamePaterno.trim()) {
      newErrors.lastNamePaterno = "Apellido paterno requerido";
      isValid = false;
    }

    if (!form.lastNameMaterno.trim()) {
      newErrors.lastNameMaterno = "Apellido materno requerido";
      isValid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = "Correo requerido";
      isValid = false;
    } else if (!emailRegex.test(form.email)) {
      newErrors.email = "Correo inválido";
      isValid = false;
    }

    if (!form.password.trim()) {
      newErrors.password = "Contraseña requerida";
      isValid = false;
    } else if (form.password.length < 6) {
      newErrors.password = "Mínimo 6 caracteres";
      isValid = false;
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setServerMessage("");

    if (!validate()) return;

    try {
      setLoading(true);

      const result = await register({
        name: form.name,
        lastNamePaterno: form.lastNamePaterno,
        lastNameMaterno: form.lastNameMaterno,
        email: form.email,
        password: form.password,
      });

      if (result.requiresEmailConfirmation) {
        setServerMessage(
          "Tu cuenta fue creada correctamente. Te enviamos un enlace de verificación a tu correo. Debes abrir ese enlace antes de iniciar sesión."
        );
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo registrar la cuenta";
      setServerMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-[14px] border border-[#D9DEE7] bg-white px-4 py-3 text-[15px] text-[#3D4A5C] outline-none transition placeholder:text-[#7A8799] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/15";

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-body">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[45%_55%]">
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

        <section className="flex items-center justify-center bg-[#F4F6F8] px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[470px]">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#98A2B3] transition hover:text-[#667085]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Volver al inicio
            </Link>

            <div className="mb-7 flex items-center justify-center gap-8 text-[15px]">
              <Link
                to="/login"
                className="text-[#98A2B3] transition hover:text-[#667085]"
              >
                Iniciar sesión
              </Link>

              <button
                type="button"
                className="border-b-2 border-[#111827] pb-1 font-semibold text-[#111827]"
              >
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
                    const message =
                      err instanceof Error
                        ? err.message
                        : "No se pudo iniciar sesión con Facebook";
                    setServerMessage(message);
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
                    setServerMessage("");
                    await loginWithFacebook();
                  } catch (err) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : "No se pudo iniciar sesión con Facebook";
                    setServerMessage(message);
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

            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E4E7EC]" />
              <span className="text-[14px] text-[#98A2B3]">
                o continúa con tu correo
              </span>
              <div className="h-px flex-1 bg-[#E4E7EC]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                  Nombre(s)
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ej. María"
                  className={`${inputBase} ${
                    errors.name ? "border-[#EF4444]" : ""
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-[12px] text-[#EF4444]">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                    Apellido paterno
                  </label>
                  <input
                    type="text"
                    value={form.lastNamePaterno}
                    onChange={(e) => handleChange("lastNamePaterno", e.target.value)}
                    placeholder="Ej. García"
                    className={`${inputBase} ${
                      errors.lastNamePaterno ? "border-[#EF4444]" : ""
                    }`}
                  />
                  {errors.lastNamePaterno && (
                    <p className="mt-1 text-[12px] text-[#EF4444]">
                      {errors.lastNamePaterno}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                    Apellido materno
                  </label>
                  <input
                    type="text"
                    value={form.lastNameMaterno}
                    onChange={(e) => handleChange("lastNameMaterno", e.target.value)}
                    placeholder="Ej. López"
                    className={`${inputBase} ${
                      errors.lastNameMaterno ? "border-[#EF4444]" : ""
                    }`}
                  />
                  {errors.lastNameMaterno && (
                    <p className="mt-1 text-[12px] text-[#EF4444]">
                      {errors.lastNameMaterno}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="nombre@correo.com"
                  className={`${inputBase} ${
                    errors.email ? "border-[#EF4444]" : ""
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-[12px] text-[#EF4444]">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="••••••••"
                    className={`${inputBase} pr-12 ${
                      errors.password ? "border-[#EF4444]" : ""
                    }`}
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
                {errors.password && (
                  <p className="mt-1 text-[12px] text-[#EF4444]">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[15px] font-semibold text-[#344054]">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    placeholder="••••••••"
                    className={`${inputBase} pr-12 ${
                      errors.confirmPassword ? "border-[#EF4444]" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition"
                  >
                    {showConfirmPassword ? (
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
                {errors.confirmPassword && (
                  <p className="mt-1 text-[12px] text-[#EF4444]">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-[54px] w-full rounded-full bg-[linear-gradient(90deg,#7A4FD6_0%,#6D46D4_35%,#6E45E6_65%,#5B35D5_100%)] text-[18px] font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              <p className="pt-2 text-center text-[12px] leading-6 text-[#98A2B3]">
                Al registrarte, aceptas nuestros{" "}
                <span className="font-medium text-[#7A4FD6]">
                  Términos de servicio
                </span>{" "}
                y{" "}
                <span className="font-medium text-[#7A4FD6]">
                  Política de privacidad.
                </span>
              </p>
            </form>
            {serverMessage && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-green-600">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Revisa tu correo
                    </p>
                    <p className="text-sm text-green-700">
                      {serverMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}