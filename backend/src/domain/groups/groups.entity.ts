export interface GrupoViaje {
  id: string;
  nombre: string;
  descripcion?: string;
  codigo_invitacion: string;
  creado_por: string;
  estado: 'activo' | 'finalizado';
  created_at?: string;
}

export interface GrupoMiembro {
  id: string;
  grupo_id: string;
  usuario_id: string;
  rol: 'admin' | 'viajero';
}

export type MemberRole = 'admin' | 'viajero';

export interface CreateGroupPayload {
  nombre: string;
  descripcion?: string;
}

export interface JoinGroupPayload {
  codigo: string;
}