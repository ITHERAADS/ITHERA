import { useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'

interface Props {
  groupId: string
  accessToken: string
  destino?: string
}

type ViewMode = 'empty' | 'results' | 'loading' | 'detail' | 'error'

interface Place {
  id: string
  name: string
  location: string
  type: string
  rating: number
  reviews: string
  distance: string
  description: string
  hours: string
  phone: string
  website: string
  image: string
  proposed: boolean
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconPin({ color = '#1E6FD9' }: { color?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s7-5.2 7-12a7 7 0 10-14 0c0 6.8 7 12 7 12z"
        fill={color}
      />
      <circle cx="12" cy="10" r="2.5" fill="white" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

const MapPlacesPage: React.FC<Props> = ({ destino }) => {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('empty')
  const [selectedPlaceId, setSelectedPlaceId] = useState('place-1')

  const places: Place[] = [
    {
      id: 'place-1',
      name: 'Chichén Itzá',
      location: 'Tinúm, Yucatán',
      type: 'Sitio Arqueológico',
      rating: 4.8,
      reviews: '15,234',
      distance: '2.1 km',
      description:
        'Una de las siete maravillas del mundo moderno. Explora la majestuosa pirámide de Kukulkán y aprende sobre la cultura maya.',
      hours: 'Lun - Dom: 8:00 AM - 5:00 PM',
      phone: '+52 985 851 0137',
      website: 'chichenitza.inah.gob.mx',
      image:
        'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=900&h=500&fit=crop',
      proposed: false,
    },
    {
      id: 'place-2',
      name: 'Cenote Ik Kil',
      location: 'Yucatán',
      type: 'Atracción natural',
      rating: 4.7,
      reviews: '8,421',
      distance: '4.5 km',
      description: 'Cenote turístico ideal para nadar y tomar fotografías durante el viaje.',
      hours: 'Lun - Dom: 9:00 AM - 5:00 PM',
      phone: '+52 985 123 4567',
      website: 'cenoteikkil.mx',
      image:
        'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=900&h=500&fit=crop',
      proposed: false,
    },
    {
      id: 'place-3',
      name: 'Playa del Carmen',
      location: 'Playa del Carmen, Quintana Roo',
      type: 'Playa',
      rating: 4.6,
      reviews: '12,309',
      distance: '1.8 km',
      description: 'Zona turística con playa, restaurantes, tiendas y actividades para grupos.',
      hours: 'Abierto 24 horas',
      phone: '+52 984 000 0000',
      website: 'playadelcarmen.mx',
      image:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=500&fit=crop',
      proposed: false,
    },
    {
      id: 'place-4',
      name: 'Parque Xcaret',
      location: 'Chetumal, Quintana Roo',
      type: 'Parque temático',
      rating: 4.9,
      reviews: '10,567',
      distance: '6.2 km',
      description: 'Parque turístico con ríos subterráneos, espectáculos y actividades culturales.',
      hours: 'Lun - Dom: 8:30 AM - 10:00 PM',
      phone: '+52 998 000 0000',
      website: 'xcaret.com',
      image:
        'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=900&h=500&fit=crop',
      proposed: false,
    },
  ]

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0]
  const hasDestination = Boolean(destino || 'Cancún, México')

  const handleSearch = () => {
    setViewMode('loading')

    window.setTimeout(() => {
      if (query.trim().toLowerCase() === 'error') {
        setViewMode('error')
        return
      }

      setViewMode('results')
      setSelectedPlaceId('place-1')
    }, 600)
  }

  const handlePropose = () => {
    setViewMode('results')
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
          <header className="flex items-center gap-6 border-b border-gray-100 bg-white px-6 py-4">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-gray-500 shadow-sm">
              <IconSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
                className="w-full bg-transparent text-sm text-[#1E0A4E] outline-none placeholder:text-gray-400"
                placeholder="Buscar lugares, restaurantes, actividades..."
              />
            </div>

            <button
              onClick={handleSearch}
              className="rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
            >
              Buscar
            </button>
          </header>

          <main className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 bg-[#EAF3FB]">
              <div className="absolute left-[18%] top-[18%] h-px w-[65%] rotate-12 bg-[#D4E3F3]" />
              <div className="absolute left-[22%] top-[45%] h-px w-[55%] -rotate-12 bg-[#D4E3F3]" />
              <div className="absolute left-[45%] top-[12%] h-[65%] w-px -rotate-28 bg-[#D4E3F3]" />
              <div className="absolute left-[52%] top-[34%] h-40 w-40 rounded-full bg-white/30" />
              <div className="absolute left-[38%] top-[28%] h-32 w-32 rounded-full bg-white/30" />
            </div>

            {!hasDestination && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg">
                  <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                    El grupo no tiene destino definido aún
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Define un destino para poder visualizar el mapa.
                  </p>
                </div>
              </div>
            )}

            {viewMode === 'empty' && hasDestination && (
              <>
                <aside className="absolute left-6 top-6 z-10 w-72 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#E8F0FF] text-[#1E6FD9]">
                    <IconSearch />
                  </div>
                  <h1 className="font-heading text-xl font-bold text-[#1E0A4E]">
                    Busca lugares para comenzar
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Encuentra actividades, restaurantes y sitios de interés para tu viaje
                  </p>

                  <div className="mt-5 border-t border-gray-100 pt-5">
                    <p className="mb-3 text-xs font-bold uppercase text-[#1E0A4E]">
                      Categorías sugeridas
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {['🍽️ Restaurantes', '🏛️ Museos', '🌳 Parques', '⭐ Populares'].map((item) => (
                        <button
                          key={item}
                          onClick={() => {
                            setQuery(item.split(' ')[1] ?? item)
                            handleSearch()
                          }}
                          className="rounded-xl bg-[#F4F6F8] px-3 py-4 text-xs text-[#1E0A4E]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <div className="rounded-full bg-[#1E6FD9]/10 p-4">
                    <IconPin />
                  </div>
                </div>
              </>
            )}

            {viewMode === 'loading' && (
              <>
                <aside className="absolute left-6 top-6 z-10 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                  <div className="p-5">
                    <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                      Lugares de interés
                    </h2>
                    <div className="mt-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
                  </div>
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex animate-pulse gap-3 border-t border-gray-100 p-4">
                      <div className="h-14 w-14 rounded-xl bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-28 rounded bg-gray-200" />
                        <div className="h-3 w-20 rounded bg-gray-200" />
                      </div>
                    </div>
                  ))}
                  <p className="border-t border-gray-100 p-4 text-center text-xs text-gray-500">
                    Buscando lugares cercanos...
                  </p>
                </aside>

                <PlaceDetailCard place={selectedPlace} onDetail={() => setViewMode('detail')} onPropose={handlePropose} />
              </>
            )}

            {viewMode === 'results' && (
              <>
                <aside className="absolute left-6 top-6 z-10 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
                  <div className="p-5">
                    <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                      Lugares de interés
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{places.length} resultados</p>
                  </div>

                  {places.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => setSelectedPlaceId(place.id)}
                      className={`flex w-full gap-3 border-t border-gray-100 p-4 text-left transition-colors ${
                        selectedPlaceId === place.id ? 'bg-[#EAF2FF] border-l-4 border-l-[#1E6FD9]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <img
                        src={place.image}
                        alt={place.name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-[#1E0A4E]">{place.name}</h3>
                        <p className="text-xs text-gray-500">{place.location}</p>
                        <p className="mt-1 text-xs text-[#F59E0B]">
                          ★ {place.rating} <span className="text-gray-400">({place.reviews})</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </aside>

                <div className="absolute left-[48%] top-[26%] z-10">
                  <IconPin />
                </div>
                <div className="absolute left-[52%] top-[23%] z-10">
                  <IconPin color="#EF4444" />
                </div>
                <div className="absolute left-[70%] top-[50%] z-10">
                  <IconPin color="#EF4444" />
                </div>

                <PlaceDetailCard place={selectedPlace} onDetail={() => setViewMode('detail')} onPropose={handlePropose} />
              </>
            )}

            {viewMode === 'error' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-72 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xl">
                  <div className="mb-4 flex justify-center">
                    <IconAlert />
                  </div>
                  <h2 className="font-heading text-xl font-bold text-[#1E0A4E]">
                    No pudimos cargar los lugares
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Parece que hubo un problema al obtener los resultados. Intenta nuevamente.
                  </p>
                  <button
                    onClick={handleSearch}
                    className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
                  >
                    Reintentar búsqueda
                  </button>
                  <button
                    onClick={() => setViewMode('empty')}
                    className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#1E0A4E]"
                  >
                    Modificar búsqueda
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-[#1E0A4E] shadow-lg">
              <span>Centrar mapa</span>
              <button className="rounded-lg bg-[#F4F6F8] px-3 py-1">-</button>
              <span className="text-gray-500">Zoom 12</span>
              <button className="rounded-lg bg-[#F4F6F8] px-3 py-1">+</button>
            </div>

            {viewMode === 'detail' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                  <div className="relative h-64">
                    <img
                      src={selectedPlace.image}
                      alt={selectedPlace.name}
                      className="h-full w-full rounded-t-2xl object-cover"
                    />
                    <button
                      onClick={() => setViewMode('results')}
                      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1E0A4E] shadow"
                    >
                      <IconClose />
                    </button>
                  </div>

                  <div className="p-7">
                    <span className="rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-semibold text-[#1E6FD9]">
                      {selectedPlace.type}
                    </span>
                    <h2 className="mt-4 font-heading text-3xl font-bold text-[#1E0A4E]">
                      {selectedPlace.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{selectedPlace.location}</p>
                    <p className="mt-4 text-sm text-[#F59E0B]">
                      ★★★★☆ <span className="font-semibold text-[#1E0A4E]">{selectedPlace.rating}</span>{' '}
                      <span className="text-gray-500">({selectedPlace.reviews} reseñas)</span>
                    </p>

                    <div className="mt-5 border-t border-gray-100 pt-5">
                      <h3 className="font-semibold text-[#1E0A4E]">Descripción</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        {selectedPlace.description}
                      </p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <InfoBox label="Horario" value={selectedPlace.hours} />
                      <InfoBox label="Precio estimado" value="$480 MXN" />
                      <InfoBox label="Teléfono" value={selectedPlace.phone} />
                      <InfoBox label="Tiempo recomendado" value="3–4 horas" />
                      <InfoBox label="Sitio web" value={selectedPlace.website} />
                      <InfoBox label="Tipo de actividad" value="Cultural, Histórico, Familiar" />
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setViewMode('results')}
                        className="flex-1 rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
                      >
                        + Proponer al itinerario
                      </button>
                      <button className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-[#1E0A4E]">
                        Favoritos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AppLayout>
  )
}

function PlaceDetailCard({
  place,
  onDetail,
  onPropose,
}: {
  place: Place
  onDetail: () => void
  onPropose: () => void
}) {
  return (
    <aside className="absolute right-6 top-6 z-10 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      <img src={place.image} alt={place.name} className="h-40 w-full object-cover" />

      <div className="p-5">
        <span className="rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-semibold text-[#1E6FD9]">
          {place.type}
        </span>
        <h2 className="mt-4 font-heading text-2xl font-bold text-[#1E0A4E]">
          {place.name}
        </h2>
        <p className="text-sm text-gray-500">{place.location}</p>
        <p className="mt-3 text-sm text-[#F59E0B]">
          ★★★★☆ <span className="font-semibold text-[#1E0A4E]">{place.rating}</span>{' '}
          <span className="text-gray-500">({place.reviews} reseñas)</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          {place.description}
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <p className="text-[#1E0A4E]">
            <span className="text-gray-500">Horario: </span>
            {place.hours}
          </p>
          <p className="text-[#1E0A4E]">
            <span className="text-gray-500">Teléfono: </span>
            {place.phone}
          </p>
          <p className="text-[#1E0A4E]">
            <span className="text-gray-500">Sitio web: </span>
            {place.website}
          </p>
        </div>

        <button
          onClick={onPropose}
          className="mt-5 w-full rounded-xl bg-[#1E6FD9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1557B0]"
        >
          + Proponer al itinerario
        </button>
        <button
          onClick={onDetail}
          className="mt-3 w-full rounded-xl border border-[#1E6FD9] px-5 py-3 text-sm font-semibold text-[#1E6FD9]"
        >
          Ver detalles del lugar
        </button>
      </div>
    </aside>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#1E0A4E]">{value}</p>
    </div>
  )
}

export default MapPlacesPage