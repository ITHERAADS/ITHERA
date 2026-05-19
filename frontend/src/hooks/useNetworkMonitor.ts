import { useState, useEffect } from 'react'

/**
 * Monitorea el estado de conexión a internet del navegador en tiempo real.
 * Escucha los eventos nativos `online` / `offline` de la ventana.
 *
 * @returns `true` si hay conexión, `false` si no la hay.
 */
export function useNetworkMonitor(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
