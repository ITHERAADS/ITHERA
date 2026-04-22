<<<<<<< HEAD
// Representa una propuesta con campos de bloqueo
export interface Propuesta {
  id_propuesta: number;
  id_viaje: number;
  titulo: string;
  descripcion?: string;
  estado: 'abierta' | 'en_votacion' | 'aprobada' | 'bloqueada' | 'descartada' | 'empate';
  creado_por: number;
  is_locked: boolean;
  locked_by?: number | null;
  locked_at?: string | null;
  fecha_creacion?: string;
}

// Lo que el frontend manda para bloquear una propuesta
export interface LockPayload {
  id_propuesta: number;
  id_usuario: number;
}

// Lo que se transmite por WebSocket a todos del grupo
export interface LockEvent {
  id_propuesta: number;
  id_usuario: number | null;
  accion: 'BLOQUEADO' | 'LIBERADO';
  timestamp: string;
}
=======
export type ProposalItemType = 'vuelo' | 'hospedaje';
export type ProposalStatus = 'guardada' | 'aprobada' | 'rechazada';

export interface SaveFlightProposalPayload {
  grupoId: number;
  fuente: string;
  titulo: string;
  descripcion?: string;
  payload?: Record<string, unknown>;
  vuelo: {
    aerolinea: string;
    numeroVuelo?: string;
    origenCodigo: string;
    origenNombre?: string;
    destinoCodigo: string;
    destinoNombre?: string;
    salida: string;
    llegada: string;
    duracion?: string;
    precio: number;
    moneda: string;
    escalas?: number;
    payload?: Record<string, unknown>;
  };
}

export interface SaveHotelProposalPayload {
  grupoId: number;
  fuente: string;
  titulo: string;
  descripcion?: string;
  payload?: Record<string, unknown>;
  hospedaje: {
    nombre: string;
    proveedor?: string;
    referenciaExterna?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
    checkIn?: string;
    checkOut?: string;
    precioTotal?: number;
    moneda?: string;
    calificacion?: number;
    payload?: Record<string, unknown>;
  };
}

export interface UpdateProposalPayload {
  titulo?: string;
  descripcion?: string;
  estado?: ProposalStatus;
  payload?: Record<string, unknown>;
  detalle?: {
    aerolinea?: string;
    numeroVuelo?: string;
    origenCodigo?: string;
    origenNombre?: string;
    destinoCodigo?: string;
    destinoNombre?: string;
    salida?: string;
    llegada?: string;
    duracion?: string;
    precio?: number;
    moneda?: string;
    escalas?: number;
    nombre?: string;
    proveedor?: string;
    referenciaExterna?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
    checkIn?: string;
    checkOut?: string;
    precioTotal?: number;
    calificacion?: number;
    payload?: Record<string, unknown>;
  };
}
>>>>>>> origin/develop
// Representa una propuesta con campos de bloqueo
export interface Propuesta {
  id_propuesta: number;
  id_viaje: number;
  titulo: string;
  descripcion?: string;
  estado: 'abierta' | 'en_votacion' | 'aprobada' | 'bloqueada' | 'descartada' | 'empate';
  creado_por: number;
  is_locked: boolean;
  locked_by?: number | null;
  locked_at?: string | null;
  fecha_creacion?: string;
}

// Lo que el frontend manda para bloquear una propuesta
export interface LockPayload {
  id_propuesta: number;
  id_usuario: number;
}

// Lo que se transmite por WebSocket a todos los del grupo
export interface LockEvent {
  id_propuesta: number;
  timestamp: string;
}