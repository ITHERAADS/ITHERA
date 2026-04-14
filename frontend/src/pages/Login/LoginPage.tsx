import { useState } from "react";
import logo from "../../assets/logo-white.png";
import googleIcon from "../../assets/google.png";
import facebookIcon from "../../assets/facebook.png";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Correo inválido");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      if (email !== "test@test.com" || password !== "123456") {
        setError("Correo o contraseña incorrectos");
      } else {
        alert("Login correcto");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT SIDE */}
      <div className="w-1/2 bg-gradient-to-br from-[#1E0A4E] to-[#4B2FA3] text-white p-16 flex flex-col justify-center">
        
        <img src={logo} className="w-28 mb-10" />

        <h1 className="text-4xl font-bold leading-tight mb-6 font-['Plus Jakarta Sans']">
          Planifica tus viajes<br />en grupo sin el caos.
        </h1>

        <p className="text-gray-300 max-w-md font-['DM Sans']">
          Organiza itinerarios, controla los gastos compartidos y reserva tu próxima aventura con amigos de forma sencilla en un solo lugar.
        </p>

      </div>

      {/* RIGHT SIDE */}
      <div className="w-1/2 flex items-center justify-center bg-[#F4F6F8]">

        <div className="w-[480px]">

          {/* Tabs */}
          <div className="flex justify-center gap-8 mb-6 text-[16px] font-semibold font-['Plus Jakarta Sans']">
            <span className="border-b-2 border-[#101828] pb-1 text-[#101828]">
              Iniciar sesión
            </span>
            <span className="text-[#99A1AF] cursor-pointer">
              Registrarse
            </span>
          </div>

          {/* Title */}
          <h2 className="text-[36px] font-bold text-[#101828] text-center mb-6 font-['Plus Jakarta Sans']">
            Bienvenido de nuevo
          </h2>

          {/* Social buttons */}
          <div className="flex gap-5 mb-6">

  <button className="flex items-center justify-center gap-2 flex-1 h-[50px] border border-[#E5E7EB] rounded-[14px] text-[16px] font-semibold text-[#364153] hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition">
    <img src={googleIcon} className="w-5 h-5" />
    Google
  </button>

  <button className="flex items-center justify-center gap-2 flex-1 h-[50px] border border-[#E5E7EB] rounded-[14px] text-[16px] font-semibold text-[#364153] hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition">
    <img src={facebookIcon} className="w-5 h-5" />
    Facebook
  </button>

</div>

          {/* Divider */}
          <div className="flex items-center mb-6">
            <div className="flex-1 h-[1px] bg-[#E5E7EB]" />
            <span className="px-4 text-[14px] text-[#99A1AF] font-['DM Sans']">
              o continúa con tu correo
            </span>
            <div className="flex-1 h-[1px] bg-[#E5E7EB]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* Email */}
            <div>
              <label className="text-[15px] font-bold text-[#364153]">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-2 h-[58px] px-5 border border-[#E5E7EB] rounded-[14px] focus:ring-2 focus:ring-[#713EEB] focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[15px] font-bold text-[#364153]">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-2 h-[58px] px-5 border border-[#E5E7EB] rounded-[14px] focus:ring-2 focus:ring-[#713EEB] focus:border-transparent"
                
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Forgot */}
            <div className="text-right">
              <a className="text-[15px] font-bold text-[#713EEB]">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Button */}
            <button
  type="submit"
  disabled={loading}
  className="w-full h-[59px] bg-[#713EEB] rounded-full text-white text-[18px] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-70"
>
  {loading && (
    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
  )}

  {loading ? "Cargando..." : "Iniciar sesión"}
</button>

          </form>

        </div>

      </div>

    </div>
  );
}