import type { Activity } from '../components/ui/DayView/DayView'

// ── Día 1: Llegada a Cancún ────────────────────────────────────────────────────

export const DAY1_ACTIVITIES: Activity[] = [
  {
    id: 'd1-a1',
    title: 'Traslado aeropuerto – hotel',
    description:
      'Servicio privado de traslado con aire acondicionado y conductor profesional. Incluye asistencia con equipaje.',
    category: 'transporte',
    status: 'confirmada',
    price: 280,
    currency: 'MXN',
    time: '09:00 hrs',
    location: 'Aeropuerto · Hotel Malecón',
    image:
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=300&fit=crop',
  },
  {
    id: 'd1-a2',
    title: 'Hotel Malecón Premium',
    description:
      'Hotel frente al mar con alberca infinity, desayuno incluido y acceso a playa privada. Vista al Caribe garantizada.',
    category: 'hospedaje',
    status: 'confirmada',
    price: 2100,
    currency: 'MXN',
    time: 'Check-in 14:00',
    location: 'Zona Hotelera, Cancún',
    image:
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=300&fit=crop',
  },
  {
    id: 'd1-a3',
    title: 'Tour de snorkel en arrecife',
    description:
      'Explora arrecifes de coral con equipo incluido, guía certificado y transporte desde el hotel.',
    category: 'actividad',
    status: 'pendiente',
    price: 650,
    currency: 'MXN',
    time: '16:00 hrs',
    location: 'Playa Delfines',
    votes: 6,
    proposedBy: 'Bryan A.',
    image:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop',
  },
]

// ── Día 2: Riviera Maya ────────────────────────────────────────────────────────

export const DAY2_ACTIVITIES: Activity[] = [
  {
    id: 'd2-a1',
    title: 'Cena en La Habichuela',
    description:
      'Restaurante tradicional mexicano en el centro de Cancún con ambiente romántico y jardín tropical.',
    category: 'actividad',
    status: 'confirmada',
    price: 390,
    currency: 'MXN',
    time: '20:00 hrs',
    location: 'Centro, Cancún',
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
  },
  {
    id: 'd2-a2',
    title: 'Tour a Chichén Itzá',
    description:
      'Visita guiada a una de las 7 maravillas del mundo moderno. Incluye transporte, guía bilingüe y almuerzo típico.',
    category: 'actividad',
    status: 'pendiente',
    price: 1200,
    currency: 'MXN',
    time: '07:00 hrs',
    location: 'Chichén Itzá, Yucatán',
    votes: 3,
    proposedBy: 'Ana L.',
    image:
      'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=600&h=300&fit=crop',
  },
]

// ── Todos los días ─────────────────────────────────────────────────────────────

export interface DayData {
  dayNumber: number
  date: string
  activities: Activity[]
}

export const ITINERARY_DAYS: DayData[] = [
  { dayNumber: 1, date: '16 Junio 2025', activities: DAY1_ACTIVITIES },
  { dayNumber: 2, date: '17 Junio 2025', activities: DAY2_ACTIVITIES },
  { dayNumber: 3, date: '18 Junio 2025', activities: [] },
  { dayNumber: 4, date: '19 Junio 2025', activities: [] },
]
