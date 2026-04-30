export type ItineraryActivityStatus = 'pendiente' | 'confirmada' | 'cancelada';

export interface ItineraryActivity {
  id: string;
  proposalId?: string | null;
  title: string;
  description: string;
  category: 'transporte' | 'hospedaje' | 'actividad';
  status: 'confirmada' | 'pendiente';
  price: number;
  currency: string;
  time: string;
  location?: string;
  image: string;
  externalReference?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdBy?: string | null;
  hasVoted?: boolean;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  activities: ItineraryActivity[];
}

export interface CreateItineraryActivityPayload {
  titulo: string;
  descripcion?: string | null;
  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  referencia_externa?: string | null;
  fuente?: string | null;
  payload?: Record<string, unknown> | null;
}
