import { useEffect, useRef, useState } from 'react'

type GoogleMiniMapProps = {
  lat?: number | null
  lng?: number | null
  title?: string | null
}

let googleMapsScriptPromise: Promise<void> | null = null

function loadGoogleMapsScript(apiKey: string) {
  if (window.google?.maps) return Promise.resolve()

  if (!googleMapsScriptPromise) {
    googleMapsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps'))
      document.head.appendChild(script)
    })
  }

  return googleMapsScriptPromise
}

export function GoogleMiniMap({ lat, lng, title = 'Destino' }: GoogleMiniMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState('')

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined
  const hasCoordinates = lat != null && lng != null

  useEffect(() => {
    if (!apiKey || !hasCoordinates) return

    let cancelled = false

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return

        const position = {
          lat: Number(lat),
          lng: Number(lng),
        }

        const map = new window.google.maps.Map(mapRef.current, {
          center: position,
          zoom: 12,
          disableDefaultUI: true,
          gestureHandling: 'none',
        })

        new window.google.maps.Marker({
          position,
          map,
          title: title || 'Destino',
        })
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar el mapa')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, hasCoordinates, lat, lng, title])

  if (!apiKey) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F0EEF8] px-3 text-center">
        <p className="font-body text-[11px] text-gray500">Falta VITE_GOOGLE_MAPS_BROWSER_KEY</p>
      </div>
    )
  }

  if (!hasCoordinates) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F0EEF8] px-3 text-center">
        <p className="font-body text-[11px] text-gray500">Destino sin coordenadas</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F0EEF8] px-3 text-center">
        <p className="font-body text-[11px] text-gray500">{error}</p>
      </div>
    )
  }

  return <div ref={mapRef} className="h-28 w-full overflow-hidden rounded-xl bg-[#D4E9F7]" />
}