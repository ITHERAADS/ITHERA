# Frontend - Ithera

Frontend de Ithera construido con React, TypeScript, Vite y Tailwind CSS. Contiene las vistas del producto, rutas publicas/protegidas, componentes reutilizables, clientes HTTP para el backend, integracion con Supabase y hooks de tiempo real.

## Responsabilidades

- Renderizar la experiencia web de Ithera.
- Manejar rutas publicas y protegidas.
- Consumir la API REST del backend.
- Integrarse con Supabase desde cliente cuando aplica.
- Escuchar eventos de Socket.IO y refrescar vistas colaborativas.
- Mantener componentes reutilizables y tipados.
- Construir el bundle estatico desplegable en Vercel.

## Stack

| Area | Tecnologia |
| --- | --- |
| Framework UI | React |
| Build tool | Vite |
| Lenguaje | TypeScript |
| Routing | React Router DOM |
| Estilos | Tailwind CSS |
| Charts | Recharts |
| Tiempo real | socket.io-client |
| Persistencia local | idb |
| Backend/auth | Supabase y API propia |

## Estructura

```text
frontend/
|-- public/
|-- src/
|   |-- assets/                  # Imagenes, logos y recursos visuales
|   |-- components/
|   |   |-- auth/                 # Guardas PublicRoute y ProtectedRoute
|   |   |-- budget/               # UI de presupuesto
|   |   |-- chat/                 # Drawers de chat
|   |   |-- checkout/             # UI de pagos simulados
|   |   |-- documents/            # Boveda documental
|   |   |-- layout/               # Navbar, Sidebar, Layout
|   |   |-- subgroups/            # Componentes de subgrupos
|   |   `-- ui/                   # Primitivos reutilizables
|   |-- constants/                # Constantes compartidas
|   |-- context/                  # AuthContext y TripContext
|   |-- hooks/                    # Sockets, sync, red y notificaciones
|   |-- lib/                      # Clientes base como Supabase
|   |-- mock/                     # Datos mock de apoyo
|   |-- pages/                    # Vistas completas por ruta
|   |-- services/                 # API clients por modulo
|   |-- styles/                   # Entradas de estilos
|   |-- types/                    # Tipos globales
|   |-- App.tsx                   # Tabla de rutas
|   |-- main.tsx                  # Bootstrap React
|   `-- index.css                 # Tailwind/base global
|-- vercel.json                   # Rewrite SPA hacia index.html
|-- vite.config.ts
|-- tailwind.config.js
`-- package.json
```

## Rutas principales

Las rutas se registran en `src/App.tsx`.

| Ruta | Vista | Acceso |
| --- | --- | --- |
| `/` | Landing | Publico |
| `/login` | Login | Solo publico |
| `/register` | Registro | Solo publico |
| `/forgot-password` | Recuperacion | Solo publico |
| `/reset-password` | Reset password | Publico |
| `/otp` | Verificacion OTP | Solo publico |
| `/join-group` | Unirse a grupo | Publico |
| `/my-trips` | Mis viajes | Protegido |
| `/dashboard` | Itinerario/dashboard | Protegido |
| `/create-group` | Crear grupo | Protegido |
| `/grouppanel` | Panel de grupo | Protegido |
| `/group-settings` | Configuracion de grupo | Protegido |
| `/profile` | Perfil | Protegido |
| `/search/flights-hotels` | Busqueda vuelos/hoteles | Protegido |
| `/search/map-places` | Mapas y lugares | Protegido |
| `/search/routes-weather` | Rutas, transporte y clima | Protegido |
| `/checkout/:type/:proposalId` | Checkout | Protegido |
| `*` | Not found | Publico |

## Variables de entorno

Crear `frontend/.env` a partir de `frontend/.env.example`.

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL base del backend. Localmente `http://localhost:3001/api`. |
| `VITE_SUPABASE_URL` | URL publica del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Llave anonima publica de Supabase. |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Llave de Google Maps para uso en navegador. |

Las variables de Vite expuestas al navegador deben iniciar con `VITE_`. No colocar secrets privados en el frontend.

## Instalacion y ejecucion

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Por defecto Vite levanta la app en:

```text
http://localhost:5173
```

El backend debe estar disponible en el valor configurado en `VITE_API_URL`.

## Scripts

| Script | Uso |
| --- | --- |
| `npm run dev` | Levanta Vite en modo desarrollo. |
| `npm run build` | Ejecuta `tsc -b` y genera el build con Vite. |
| `npm run lint` | Corre ESLint sobre el frontend. |
| `npm run preview` | Sirve localmente el build generado. |

## Servicios HTTP

Los clientes por modulo viven en `src/services`.

```text
src/services/
|-- apiClient.ts
|-- budget.ts
|-- chat.ts
|-- checkout.ts
|-- context-links.ts
|-- documents.ts
|-- flights.ts
|-- groups.ts
|-- hotels.ts
|-- maps.ts
|-- notifications.ts
|-- proposals.ts
|-- subgroup-chat.ts
`-- subgroups.ts
```

Convenciones:

- Reutilizar `apiClient.ts` para llamadas al backend.
- Mantener cada archivo de servicio enfocado en un modulo.
- Tipar request/response usando `src/types`.
- No mezclar logica de UI dentro de servicios.

## Estado, auth y tiempo real

| Area | Ubicacion |
| --- | --- |
| Auth global | `src/context/AuthContext.tsx`, `src/context/useAuth.ts` |
| Viaje/grupo activo | `src/context/TripContext.tsx` |
| Rutas protegidas | `src/components/auth/ProtectedRoute.tsx` |
| Rutas solo publicas | `src/components/auth/PublicRoute.tsx` |
| Socket.IO | `src/hooks/useSocket.ts` |
| Refresco realtime de grupo | `src/hooks/useGroupRealtimeRefresh.ts` |
| Estado offline/sync | `src/hooks/useNetworkMonitor.ts`, `src/hooks/useSyncQueue.ts` |
| Notificaciones | `src/hooks/useNotifications.ts` |

Cuando un cambio de backend agregue o modifique eventos de Socket.IO, actualizar los hooks relacionados y validar manualmente el flujo en dos sesiones si el caso es colaborativo.

## Convenciones para componentes

- Las paginas completas viven en `src/pages/<Nombre>/<Nombre>Page.tsx`.
- Los componentes reutilizables viven en `src/components`.
- Los componentes de UI genericos viven en `src/components/ui`.
- Mantener componentes de pagina orquestando datos y componentes hijos renderizando UI.
- Exportar desde `index.ts` cuando el patron ya exista en esa carpeta.
- Preferir tipos compartidos desde `src/types` cuando el dato cruza servicios, paginas o componentes.

## Build y despliegue

El proyecto usa Vite y `frontend/vercel.json` configura rewrite de SPA:

```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Esto permite que rutas como `/dashboard` o `/checkout/:type/:proposalId` funcionen al refrescar en Vercel.

## CI/CD

El workflow `ci-frontend.yml` valida PRs hacia `main` o `develop`.

Valida:

- `npm ci`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Los despliegues de frontend se documentan en [../docs/workflows/README.md](../docs/workflows/README.md).
