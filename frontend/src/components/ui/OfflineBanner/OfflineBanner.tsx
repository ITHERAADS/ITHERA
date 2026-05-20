/**
 * Banner global de estado offline.
 * Se muestra en la parte superior de toda la aplicación cuando se pierde
 * la conexión a internet. Es de solo lectura informativo — los módulos
 * individuales deben deshabilitar sus acciones de escritura según el
 * contexto usando el hook `useNetworkMonitor`.
 */
export function OfflineBanner() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      id="offline-banner"
      className="offline-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: '#FFF7ED',
        borderBottom: '1px solid #FED7AA',
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* Ícono WiFi tachado */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ color: '#B45309', flexShrink: 0 }}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <circle cx="12" cy="20" r="1" fill="#B45309" stroke="none" />
      </svg>

      <span style={{ fontSize: '14px', fontWeight: 600, color: '#B45309' }}>
        Sin conexión a internet
      </span>
      <span style={{ fontSize: '13px', color: '#92400E' }}>
        — La aplicación está en modo solo lectura hasta recuperar la señal.
      </span>
    </div>
  )
}
