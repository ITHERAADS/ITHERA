import { useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'

type SearchTab = 'flights' | 'hotels'
type ViewState = 'initial' | 'loading' | 'results' | 'error'

interface Flight {
  id: string
  airline: string
  route: string
  departure: string
  arrival: string
  duration: string
  stops: string
  price: number
  recommended?: boolean
  proposed: boolean
}

interface Hotel {
  id: string
  name: string
  location: string
  price: number
  rating: number
  amenities: string[]
  proposed: boolean
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconPlane() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11l18-8-8 18-2-8-8-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function IconHotel() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 21V5a2 2 0 012-2h9a2 2 0 012 2v16" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21v-6h8v6M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FFF7ED" />
      <path d="M12 7v6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function SkeletonResult() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex animate-pulse items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-3 w-28 rounded bg-gray-200" />
        </div>
        <div className="h-16 w-32 rounded-xl bg-gray-200" />
      </div>
    </div>
  )
}

const FlightHotelSearchPage = () => {
  const [activeTab, setActiveTab] = useState<SearchTab>('flights')
  const [viewState, setViewState] = useState<ViewState>('initial')

  const [flights, setFlights] = useState<Flight[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])

  const handleSearch = () => {
    setViewState('loading')

    window.setTimeout(() => {
      if (activeTab === 'flights') {
        setFlights([
          {
            id: 'flight-1',
            airline: 'Aeroméxico',
            route: 'MEX → CUN',
            departure: '08:30',
            arrival: '11:45',
            duration: '3h 15min',
            stops: 'Directo',
            price: 4850,
            recommended: true,
            proposed: false,
          },
          {
            id: 'flight-2',
            airline: 'Volaris',
            route: 'MEX → CUN',
            departure: '14:20',
            arrival: '17:50',
            duration: '3h 30min',
            stops: 'Directo',
            price: 3920,
            proposed: false,
          },
          {
            id: 'flight-3',
            airline: 'Viva Aerobus',
            route: 'MEX → CUN',
            departure: '06:15',
            arrival: '11:30',
            duration: '5h 15min',
            stops: '1 escala',
            price: 3200,
            proposed: false,
          },
        ])
      } else {
        setHotels([
          {
            id: 'hotel-1',
            name: 'Hotel Playa del Carmen',
            location: 'Playa del Carmen, Quintana Roo',
            price: 18000,
            rating: 4.5,
            amenities: ['WiFi', 'Desayuno', 'Estacionamiento'],
            proposed: false,
          },
          {
            id: 'hotel-2',
            name: 'Hotel Xcaret',
            location: 'Xcaret, Quintana Roo',
            price: 22000,
            rating: 4.8,
            amenities: ['WiFi', 'Desayuno'],
            proposed: false,
          },
          {
            id: 'hotel-3',
            name: 'Hotel Cancún Resort',
            location: 'Cancún, Quintana Roo',
            price: 16500,
            rating: 4.6,
            amenities: ['WiFi', 'Desayuno', 'Estacionamiento'],
            proposed: false,
          },
        ])
      }

      setViewState('results')
    }, 700)
  }

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab)
    setViewState('initial')
    setFlights([])
    setHotels([])
  }

  const toggleFlight = (id: string) => {
    setFlights((prev) =>
      prev.map((flight) =>
        flight.id === id ? { ...flight, proposed: !flight.proposed } : flight
      )
    )
  }

  const toggleHotel = (id: string) => {
    setHotels((prev) =>
      prev.map((hotel) =>
        hotel.id === id ? { ...hotel, proposed: !hotel.proposed } : hotel
      )
    )
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
      <div className="flex-1 overflow-y-auto bg-[#F4F6F8]">
        <section className="relative overflow-hidden bg-[#1E0A4E] px-8 py-8 text-white">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E0A4E] via-[#2D1266]/90 to-[#7A4FD6]/50" />
          <div className="relative mx-auto max-w-6xl">
            <h1 className="font-heading text-3xl font-bold">
              Planea tu viaje grupal
            </h1>
            <p className="mt-1 font-body text-sm text-white/80">
              Busca, compara y propone opciones para tu itinerario
            </p>

            <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="inline-flex overflow-hidden rounded-xl bg-white/15 p-1 backdrop-blur-sm">
                <button
                  onClick={() => handleTabChange('flights')}
                  className={`px-8 py-3 text-sm font-semibold ${
                    activeTab === 'flights'
                      ? 'rounded-lg bg-white text-[#1E0A4E]'
                      : 'text-white/80'
                  }`}
                >
                  Vuelos
                </button>
                <button
                  onClick={() => handleTabChange('hotels')}
                  className={`px-8 py-3 text-sm font-semibold ${
                    activeTab === 'hotels'
                      ? 'rounded-lg bg-white text-[#1E0A4E]'
                      : 'text-white/80'
                  }`}
                >
                  Hospedaje
                </button>
              </div>

              <div className="flex gap-3">
                <div className="rounded-xl border border-white/20 bg-white/15 px-5 py-3 backdrop-blur-sm">
                  <p className="text-xs text-white/60">Viaje con</p>
                  <p className="font-semibold">4 personas</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/15 px-5 py-3 backdrop-blur-sm">
                  <p className="text-xs text-white/60">Presupuesto del grupo</p>
                  <p className="font-semibold">$45,000 MXN</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <section className="mx-auto max-w-4xl rounded-2xl border border-gray-100 bg-white p-7 shadow-lg">
            <h2 className="font-heading text-2xl font-bold text-[#1E0A4E]">
              {activeTab === 'flights'
                ? 'Buscar vuelos para tu grupo'
                : 'Busca hospedaje para tu grupo'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'flights'
                ? 'Encuentra opciones en tiempo real y compártelas con tu grupo'
                : 'Encuentra hoteles y alojamientos para compartir con tu grupo'}
            </p>

            {activeTab === 'flights' ? (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  ¿Desde dónde viajas?
                  <input className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" placeholder="Ej: Ciudad de México (MEX)" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  ¿A dónde quieres ir?
                  <input className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" placeholder="Ej: Cancún (CUN)" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Fecha de salida
                  <input type="date" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Fecha de regreso
                  <input type="date" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E] md:col-span-2">
                  Número de pasajeros
                  <input className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" placeholder="4 pasajeros" />
                </label>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-[#1E0A4E] md:col-span-2">
                  ¿A dónde viajan?
                  <input className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" placeholder="Ej: Cancún, México" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Check-in
                  <input type="date" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Check-out
                  <input type="date" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Huéspedes
                  <input className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" placeholder="4 personas" />
                </label>
                <label className="text-xs font-semibold text-[#1E0A4E]">
                  Habitaciones
                  <input className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1E6FD9]" placeholder="2 habitaciones" />
                </label>
              </div>
            )}

            <button
              onClick={handleSearch}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#1557B0]"
            >
              {viewState === 'loading' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {activeTab === 'flights' ? 'Buscando opciones...' : 'Buscando hospedajes...'}
                </>
              ) : (
                activeTab === 'flights'
                  ? 'Buscar opciones para el grupo'
                  : 'Buscar hospedajes para el grupo'
              )}
            </button>
          </section>

          {viewState === 'loading' && (
            <div className="mx-auto mt-8 max-w-4xl space-y-4">
              <p className="text-center text-sm text-gray-500">
                Consultando disponibilidad en tiempo real...
              </p>
              <SkeletonResult />
              <SkeletonResult />
              <SkeletonResult />
            </div>
          )}

          {viewState === 'initial' && (
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
              <h3 className="font-semibold text-[#1E0A4E]">
                Sin resultados todavía
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Realiza una búsqueda para ver opciones disponibles.
              </p>
            </div>
          )}

          {viewState === 'error' && (
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex justify-center">
                <IconAlert />
              </div>
              <h3 className="font-semibold text-[#1E0A4E]">
                No pudimos cargar los resultados
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Parece que hubo un problema de conexión. Intenta nuevamente.
              </p>
              <button
                onClick={handleSearch}
                className="mt-5 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
              >
                Reintentar búsqueda
              </button>
            </div>
          )}

          {viewState === 'results' && activeTab === 'flights' && (
            <section className="mx-auto mt-8 max-w-5xl">
              <div className="mb-4 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                  <span>MEX → CUN · 15–22 Abr 2026 · 4 pasajeros</span>
                  <button className="font-semibold text-[#1E6FD9]">
                    Editar búsqueda
                  </button>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                {flights.length} vuelos disponibles
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Selecciona la mejor opción para tu grupo
              </p>

              <div className="mb-5 flex gap-2">
                <button className="rounded-lg bg-[#1E6FD9] px-4 py-2 text-xs font-semibold text-white">Todos</button>
                <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">Sin escalas</button>
                <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">Dentro del presupuesto</button>
              </div>

              <div className="space-y-4">
                {flights.map((flight) => (
                  <article key={flight.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="grid gap-5 md:grid-cols-[1fr_2fr_160px] md:items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1E6FD9]">
                          <IconPlane />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1E0A4E]">
                            {flight.airline}
                            {flight.recommended && (
                              <span className="ml-2 rounded-full bg-[#E8F0FF] px-2 py-0.5 text-[10px] text-[#1E6FD9]">
                                Recomendado
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500">{flight.route}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-[80px_1fr_80px] items-center gap-3">
                        <div>
                          <p className="text-xl font-bold text-[#1E0A4E]">{flight.departure}</p>
                          <p className="text-xs text-gray-500">MEX</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">{flight.duration}</p>
                          <div className="my-2 h-0.5 rounded-full bg-[#1E6FD9]" />
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                            flight.stops === 'Directo'
                              ? 'bg-[#DCFCE7] text-[#35C56A]'
                              : 'bg-[#FEF3C7] text-[#F59E0B]'
                          }`}>
                            {flight.stops}
                          </span>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-[#1E0A4E]">{flight.arrival}</p>
                          <p className="text-xs text-gray-500">CUN</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4 text-center">
                        <p className="text-[10px] uppercase text-gray-400">Total grupo</p>
                        <p className="text-2xl font-bold text-[#1E0A4E]">
                          ${flight.price.toLocaleString('es-MX')}
                        </p>
                        <button
                          onClick={() => toggleFlight(flight.id)}
                          className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                            flight.proposed ? 'bg-[#35C56A]' : 'bg-[#1E6FD9] hover:bg-[#1557B0]'
                          }`}
                        >
                          {flight.proposed ? 'Seleccionado' : 'Seleccionar vuelo'}
                        </button>
                        <button className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500">
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {viewState === 'results' && activeTab === 'hotels' && (
            <section className="mx-auto mt-8 max-w-5xl">
              <div className="mb-4 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                  <span>Cancún, Quintana Roo · 15–22 Abr 2026 · 4 huéspedes</span>
                  <button className="font-semibold text-[#1E6FD9]">
                    Editar búsqueda
                  </button>
                </div>
              </div>

              <h2 className="font-heading text-2xl font-bold text-[#1E0A4E]">
                {hotels.length} hospedajes disponibles
              </h2>
              <p className="mb-4 text-sm text-gray-500">
                Selecciona las mejores opciones para tu grupo
              </p>

              <div className="space-y-4">
                {hotels.map((hotel) => (
                  <article key={hotel.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="grid gap-5 md:grid-cols-[1fr_160px] md:items-center">
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1E6FD9]">
                          <IconHotel />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1E0A4E]">{hotel.name}</h3>
                          <p className="text-sm text-gray-500">{hotel.location}</p>
                          <p className="mt-2 text-sm text-[#F59E0B]">
                            ★★★★★ <span className="text-gray-500">{hotel.rating}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {hotel.amenities.map((item) => (
                              <span key={item} className="rounded-full bg-[#EEF4FF] px-2 py-1 text-xs text-[#1E6FD9]">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-100 p-4 text-center">
                        <p className="text-[10px] uppercase text-gray-400">Total grupo</p>
                        <p className="text-2xl font-bold text-[#1E0A4E]">
                          ${hotel.price.toLocaleString('es-MX')}
                        </p>
                        <button
                          onClick={() => toggleHotel(hotel.id)}
                          className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                            hotel.proposed ? 'bg-[#35C56A]' : 'bg-[#1E6FD9] hover:bg-[#1557B0]'
                          }`}
                        >
                          {hotel.proposed ? 'Seleccionado' : 'Seleccionar hospedaje'}
                        </button>
                        <button className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500">
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {viewState === 'results' && (
            <div className="mx-auto mt-8 max-w-5xl rounded-2xl bg-[#1E0A4E] p-8 text-center text-white shadow-lg">
              <h3 className="font-semibold">¿No encontraste lo que buscabas?</h3>
              <p className="mt-1 text-sm text-white/70">
                Ajusta tus filtros o modifica tu búsqueda para ver más opciones
              </p>
              <button
                onClick={() => setViewState('initial')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1E0A4E]"
              >
                <IconSearch />
                Modificar búsqueda
              </button>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}

export default FlightHotelSearchPage