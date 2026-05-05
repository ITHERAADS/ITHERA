export type ProposalItemType = 'vuelo' | 'hospedaje';
export type ProposalStatus = 'guardada' | 'aprobada' | 'descartada';

export interface SaveFlightProposalPayload {
  grupoId: string;
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
  grupoId: string;
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
  updatedAt?: string;
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

export interface Proposal {
  id_propuesta: string;
  grupo_id: string;
  tipo_item: 'vuelo' | 'hospedaje';
  titulo?: string;
  descripcion?: string;
  fecha_creacion?: string;
  ultima_actualizacion?: string;
}

export interface ProposalVote {
  id_voto: string;
  id_propuesta: string;
  id_usuario: string;
  created_at?: string;
}

export type ProposalVoteType = 'a_favor' | 'en_contra' | 'abstencion';

export interface CreateVotePayload {
  voto?: ProposalVoteType;
}

export interface ProposalVoteResult {
  id_propuesta: string;
  tipo_item: 'vuelo' | 'hospedaje';
  titulo: string;
  votos: number;
  votos_a_favor: number;
  votos_en_contra: number;
  abstenciones: number;
  votos_pendientes: number;
  requiere_desempate_admin: boolean;
  estado_actual: string;
  mi_voto?: ProposalVoteType | null;
}

export interface ProposalComment {
  id_comentario: string;
  id_propuesta: string;
  id_usuario: string;
  contenido: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCommentPayload {
  contenido: string;
}

export interface UpdateCommentPayload {
  contenido: string;
}
