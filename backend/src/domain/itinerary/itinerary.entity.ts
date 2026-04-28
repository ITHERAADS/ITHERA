export type ItineraryActivityStatus = 'pendiente' | 'confirmada' | 'cancelada';

export interface ItineraryActivity {
  id: string;
  title: string;
  description: string;
  category: 'transporte' | 'hospedaje' | 'actividad';
  status: 'confirmada' | 'pendiente';
  price: number;
  currency: string;
  time: string;
  location?: string;
  image: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  activities: ItineraryActivity[];
}