import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'

type TransportMode = 'auto' | 'walk' | 'public'
type RouteState = 'empty' | 'loading' | 'result' | 'error'

interface TransportOption {
  id: TransportMode
  label: string
}

interface ForecastDay {
  day: string
  icon: string
  min: number
  max: number
}

function IconSun() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="#F5C518" />
      <path
        d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
        stroke="#F5C518"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconPin({ color = '#EF4444' }: { color?: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22s7-5.2 7-12a7 7 0 10-14 0c0 6.8 7 12 7 12z" fill={color} />
      <circle cx="12" cy="10" r="2.5" fill="white" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="11" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="7" cy="18" r="1.5" fill="currentColor" />
      <circle cx="17" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconWalk() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="2" />
      <path d="M10 22l2-7M14 22l-1-7M9 9l3-2 3 3M12 7v8M7 14l3-5M16 13l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconBus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 9h14M8 19v2M16 19v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FEE2E2" />
      <path d="M12 7v6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const RoutesTransportWeatherPage = () => {
  const location = useLocation()
  const destino = (location.state as { destino?: string } | null)?.destino
  const [routeState, setRouteState] = useState<RouteState>('empty')
  const [transportMode, setTransportMode] = useState<TransportMode>('auto')

  const city = destino || 'Cancún, Quintana Roo'

  const transportOptions: TransportOption[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'walk', label: 'Caminar' },
    { id: 'public', label: 'Transporte' },
  ]

  const forecast: ForecastDay[] = [
    { day: 'Hoy', icon: '☀️', min: 24, max: 32 },
    { day: 'Mañana', icon: '☀️', min: 25, max: 33 },
    { day: 'Miércoles', icon: '☁️', min: 23, max: 30 },
    { day: 'Jueves', icon: '🌧️', min: 22, max: 28 },
    { day: 'Viernes', icon: '☁️', min: 23, max: 29 },
    { day: 'Sábado', icon: '☀️', min: 25, max: 31 },
  ]

  const handleCalculateRoute = () => {
    setRouteState('loading')

    window.setTimeout(() => {
      setRouteState('result')
    }, 700)
  }

  const renderTransportIcon = (id: TransportMode) => {
    if (id === 'auto') return <IconCar />
    if (id === 'walk') return <IconWalk />
    return <IconBus />
  }

  return (
    <AppLayout
      showTripSelector={false}
      showRightPanel={false}
      user={{
        name: 'Usuario',
        role: 'Viajero',
        initials: 'U',
        color: '#7A4FD6',
      }}
    >
      <div className="flex-1 overflow-y-auto bg-[#F4F8FC]">
        <div className="flex min-h-[calc(100vh-80px)] flex-col">
          <header className="border-b border-gray-100 bg-white px-6 py-5">
            <h1 className="font-heading text-2xl font-bold text-[#1E0A4E]">
              Rutas y Transporte
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Planifica tu ruta y consulta el clima
            </p>
          </header>

          <main className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 bg-[#EAF3FB]">
              <div className="absolute left-[18%] top-[18%] h-px w-[65%] rotate-12 bg-[#D4E3F3]" />
              <div className="absolute left-[22%] top-[45%] h-px w-[55%] -rotate-12 bg-[#D4E3F3]" />
              <div className="absolute left-[45%] top-[12%] h-[65%] w-px -rotate-28 bg-[#D4E3F3]" />
              <div className="absolute left-[55%] top-[30%] h-40 w-40 rounded-full bg-white/30" />
            </div>

            <section className="absolute left-6 top-6 z-10 w-80 rounded-2xl border border-gray-100 bg-white p-5 shadow-lg">
              <h2 className="mb-4 font-heading text-lg font-bold text-[#1E0A4E]">
                Calcular ruta
              </h2>

              <label className="text-xs font-bold uppercase text-gray-500">
                Desde
                <input
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  placeholder="Aeropuerto Internacional de Cancún"
                  defaultValue={routeState === 'empty' ? '' : 'Aeropuerto Internacional de Cancún'}
                />
              </label>

              <div className="my-3 text-center text-gray-400">↕</div>

              <label className="text-xs font-bold uppercase text-gray-500">
                Hasta
                <input
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]"
                  placeholder="Hotel Playa Cancún"
                  defaultValue={routeState === 'empty' ? '' : 'Hotel Playa Cancún'}
                />
              </label>

              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">
                  Modo de transporte
                </p>

                <div className="grid grid-cols-3 rounded-xl bg-[#F4F6F8] p-1">
                  {transportOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setTransportMode(option.id)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs transition-colors ${
                        transportMode === option.id
                          ? 'bg-white text-[#1E6FD9] shadow-sm'
                          : 'text-gray-500'
                      }`}
                    >
                      {renderTransportIcon(option.id)}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCalculateRoute}
                disabled={routeState === 'loading'}
                className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1557B0] disabled:bg-[#8DB8EF]"
              >
                {routeState === 'loading' ? 'Calculando ruta...' : 'Calcular ruta'}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                Selecciona un origen y destino para calcular la mejor ruta
              </p>
            </section>

            <section className="absolute right-6 top-6 z-10 w-72 rounded-2xl border border-gray-100 bg-white p-5 shadow-lg">
              <h2 className="mb-4 font-heading text-base font-bold text-[#1E0A4E]">
                Pronóstico del clima
              </h2>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF7D6]">
                  <IconSun />
                </div>
                <div>
                  <p className="text-4xl font-bold text-[#1E0A4E]">30°</p>
                  <p className="mt-1 text-sm font-semibold text-[#1E0A4E]">Soleado</p>
                  <p className="text-xs text-gray-500">{city}</p>
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-3 text-xs font-bold uppercase text-gray-500">
                  Próximos días
                </p>

                <div className="space-y-2">
                  {forecast.map((day) => (
                    <div key={day.day} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1E0A4E]">{day.day}</span>
                      <span>{day.icon}</span>
                      <span className="text-gray-500">
                        {day.min}° / <strong className="text-[#1E0A4E]">{day.max}°</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <WeatherMiniCard label="km/h" value="12" />
                <WeatherMiniCard label="Humedad" value="65%" />
                <WeatherMiniCard label="Lluvia" value="10%" />
              </div>
            </section>

            {routeState === 'result' && (
              <>
                <div className="absolute left-[45%] top-[26%] z-10">
                  <IconPin />
                </div>
                <div className="absolute left-[62%] top-[55%] z-10">
                  <IconPin color="#10B981" />
                </div>

                <div className="absolute left-1/2 top-[58%] z-10 -translate-x-1/2 rounded-2xl border border-gray-100 bg-white px-6 py-4 text-center shadow-lg">
                  <p className="text-sm text-gray-500">{transportMode === 'auto' ? '🚙' : transportMode === 'walk' ? '🚶' : '🚌'}</p>
                  <h3 className="mt-1 font-heading text-xl font-bold text-[#1E0A4E]">
                    {transportMode === 'auto'
                      ? '50 min en auto'
                      : transportMode === 'walk'
                        ? '2 h 20 min caminando'
                        : '1 h 15 min en transporte'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    19 km · Ruta más rápida · Sin tráfico
                  </p>
                </div>
              </>
            )}

            {routeState === 'loading' && (
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-100 bg-white px-8 py-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1E6FD9]/30 border-t-[#1E6FD9]" />
                  <span className="text-sm font-semibold text-[#1E0A4E]">
                    Calculando ruta óptima...
                  </span>
                </div>
              </div>
            )}

            {routeState === 'error' && (
              <div className="absolute left-1/2 top-1/2 z-10 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
                <div className="mb-4 flex justify-center">
                  <IconAlert />
                </div>
                <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                  No pudimos calcular la ruta
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Ocurrió un problema al obtener la mejor ruta. Verifica los puntos seleccionados.
                </p>
                <button
                  onClick={handleCalculateRoute}
                  className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
                >
                  Reintentar
                </button>
                <button
                  onClick={() => setRouteState('empty')}
                  className="mt-3 w-full rounded-xl bg-[#F4F6F8] px-4 py-3 text-sm font-semibold text-[#1E0A4E]"
                >
                  Editar ruta
                </button>
              </div>
            )}

            <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-[#1E0A4E] shadow-lg">
              <span>Centrar mapa</span>
              <button className="rounded-lg bg-[#F4F6F8] px-3 py-1">-</button>
              <span className="text-gray-500">Zoom 12</span>
              <button className="rounded-lg bg-[#F4F6F8] px-3 py-1">+</button>
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  )
}

function WeatherMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-3 text-center">
      <p className="font-bold text-[#1E6FD9]">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}

export default RoutesTransportWeatherPage