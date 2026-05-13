export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorCode {
  code: string;
  message: string;
  severity: ErrorSeverity;
}

export const ERROR_CODES: Record<string, ErrorCode> = {
  ERR_71_001: {
    code: 'ERR-71-001',
    message: 'No tienes notificaciones en este momento.',
    severity: 'low',
  },
  ERR_71_002: {
    code: 'ERR-71-002',
    message: 'No pudimos cargar tus notificaciones. Inténtalo más tarde.',
    severity: 'medium',
  },
  ERR_71_003: {
    code: 'ERR-71-003',
    message: 'Esta acción ya no está disponible.',
    severity: 'low',
  },
  ERR_72_001: {
    code: 'ERR-72-001',
    message: 'No se pudieron guardar tus preferencias. La configuración anterior se mantiene.',
    severity: 'medium',
  },
  ERR_73_001: {
    code: 'ERR-73-001',
    message: 'No tienes búsquedas guardadas aún. Busca vuelos, hospedajes o lugares para comenzar tu historial.',
    severity: 'low',
  },
  ERR_73_002: {
    code: 'ERR-73-002',
    message: 'No pudimos cargar tu historial. Inténtalo de nuevo.',
    severity: 'medium',
  },
  ERR_74_001: {
    code: 'ERR-74-001',
    message: 'Esta opción ya no está disponible porque expiró. Realiza una nueva búsqueda para obtener datos actualizados.',
    severity: 'medium',
  },
  ERR_74_002: {
    code: 'ERR-74-002',
    message: 'No se pudo reincorporar la opción como propuesta al itinerario. Inténtalo de nuevo.',
    severity: 'medium',
  },
  ERR_75_001: {
    code: 'ERR-75-001',
    message: 'El itinerario aún no está en estado consolidado. Cierra el viaje o bloquea todas las actividades antes de exportar.',
    severity: 'medium',
  },
  ERR_75_002: {
    code: 'ERR-75-002',
    message: 'No se pudo generar el archivo. Inténtalo de nuevo. Si el problema persiste, contacta soporte.',
    severity: 'high',
  },
} as const;
