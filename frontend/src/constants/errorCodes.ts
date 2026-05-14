export type ErrorSeverity = 'low' | 'medium' | 'high'

export type ErrorCode = {
  code: string
  message: string
  severity: ErrorSeverity
}

export const ERROR_CODES: Record<string, ErrorCode> = {
  'ERR-71-001': {
    code: 'ERR-71-001',
    message: 'La notificación no pudo enviarse. Inténtalo de nuevo.',
    severity: 'low',
  },
  'ERR-71-002': {
    code: 'ERR-71-002',
    message: 'No pudimos cargar tus notificaciones. Inténtalo más tarde.',
    severity: 'medium',
  },
  'ERR-71-003': {
    code: 'ERR-71-003',
    message: 'Tus preferencias de notificación no pudieron guardarse.',
    severity: 'low',
  },
  'ERR-72-001': {
    code: 'ERR-72-001',
    message: 'No se pudo cargar el historial de actividad del grupo.',
    severity: 'medium',
  },
  'ERR-73-001': {
    code: 'ERR-73-001',
    message: 'Tu búsqueda no arrojó resultados. Intenta con otros términos.',
    severity: 'low',
  },
  'ERR-73-002': {
    code: 'ERR-73-002',
    message: 'Ocurrió un error al realizar la búsqueda. Inténtalo de nuevo.',
    severity: 'medium',
  },
  'ERR-74-001': {
    code: 'ERR-74-001',
    message: 'No se pudo cargar la vista de exportación. Recarga la página.',
    severity: 'medium',
  },
  'ERR-74-002': {
    code: 'ERR-74-002',
    message: 'Hubo un error al generar el archivo. Inténtalo nuevamente.',
    severity: 'medium',
  },
  'ERR-75-001': {
    code: 'ERR-75-001',
    message: 'Esta acción no está disponible para el estado actual del viaje.',
    severity: 'medium',
  },
  'ERR-75-002': {
    code: 'ERR-75-002',
    message: 'Fallo crítico del servidor. Contacta al soporte si el problema persiste.',
    severity: 'high',
  },
}
