# ITHERA

> Ecosistema digital colaborativo para planificar viajes grupales en tiempo real.

```text
Instituto Politecnico Nacional
Escuela Superior de Computo
Ingenieria en Sistemas Computacionales
Unidad de aprendizaje: Analisis y Diseno de Sistemas
Ciclo escolar: 2026/2
Grupo: 5CM3
Profesora: Idalia Maldonado
Equipo: Ithera
```

## Vision del proyecto

ITHERA es una plataforma web para organizar viajes grupales de forma colaborativa. El sistema concentra en una sola experiencia los procesos de autenticacion, creacion de grupos, invitaciones, busqueda de servicios, itinerario colaborativo, propuestas, votaciones, presupuesto, documentos, checkout simulado, notificaciones y comunicacion en tiempo real.

El objetivo academico del proyecto es aplicar el analisis, diseno, documentacion, construccion y control de cambios de un sistema realista dentro de la materia de Analisis y Diseno de Sistemas.

## Que problema resuelve

Organizar un viaje entre varias personas suele dispersarse entre chats, hojas de calculo, links, notas, capturas y acuerdos verbales. ITHERA propone un espacio centralizado donde el grupo puede:

- Crear y administrar viajes.
- Invitar integrantes.
- Proponer actividades, vuelos, hoteles y rutas.
- Votar y comentar propuestas.
- Mantener un itinerario comun.
- Registrar presupuesto y gastos.
- Consultar mapas, clima y servicios externos.
- Guardar documentos del viaje.
- Recibir notificaciones.
- Sincronizar cambios en tiempo real.

## Stack actualizado

| Capa | Tecnologia actual |
| --- | --- |
| Backend | Node.js, TypeScript, Express |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Base de datos y auth | Supabase |
| Tiempo real | Socket.IO |
| Email | Resend |
| Mapas, rutas y lugares | Google Maps Platform |
| Vuelos | Amadeus, Duffel |
| Hoteles | LiteAPI |
| Clima | Open-Meteo, WeatherAPI |
| CI/CD | GitHub Actions, Vercel |
| Testing backend | Jest, ts-jest |
| Build frontend | Vite |

## Vista rapida de arquitectura

```text
Frontend React/Vite
  -> services/apiClient
  -> Backend Express /api
  -> Servicios de dominio
  -> Supabase o APIs externas

Socket.IO
  -> Backend HTTP server
  -> socket handlers
  -> Hooks frontend de realtime
```

## Distribucion completa del repositorio

```text
ithera/
|-- .github/
|   |-- ISSUE_TEMPLATE/
|   |   |-- bug_report.md           # Plantilla para reportar bugs
|   |   |-- feature_request.md      # Plantilla para nuevas funcionalidades
|   |   |-- task.md                 # Plantilla para tareas tecnicas
|   |   `-- config.yml             # Configuracion de templates
|   |-- workflows/
|   |   |-- README.md               # Resumen rapido de workflows
|   |   |-- ci-backend.yml          # CI de backend
|   |   |-- ci-frontend.yml         # CI de frontend
|   |   |-- vercel-frontend-preview.yml
|   |   `-- vercel-frontend-production.yml
|   |-- CODEOWNERS                 # Revisores automaticos
|   `-- PULL_REQUEST_TEMPLATE.md   # Template obligatorio de PR
|
|-- backend/
|   |-- src/
|   |   |-- config/                 # Variables, env y configuracion base
|   |   |-- domain/                 # Logica de negocio por modulo
|   |   |   |-- auth/
|   |   |   |-- budget/
|   |   |   |-- checkout/
|   |   |   |-- context-links/
|   |   |   |-- documents/
|   |   |   |-- flights/
|   |   |   |-- groups/
|   |   |   |-- hotels/
|   |   |   |-- itinerary/
|   |   |   |-- maps/
|   |   |   |-- notifications/
|   |   |   |-- proposals/
|   |   |   `-- votes-comments/
|   |   |-- infrastructure/         # Supabase, sockets, email y APIs externas
|   |   |   |-- db/
|   |   |   |-- email/
|   |   |   |-- external-apis/
|   |   |   |-- redis/
|   |   |   `-- sockets/
|   |   |-- middlewares/            # Auth, errores y rate limit
|   |   |-- routes/                 # Routers Express por modulo
|   |   |-- services/               # Servicios transversales
|   |   `-- index.ts                # Bootstrap HTTP + Socket.IO
|   |-- tests/                      # Pruebas e informes
|   |-- .env.example                # Variables requeridas por backend
|   |-- package.json                # Scripts y dependencias backend
|   `-- README.md                   # Guia tecnica de backend
|
|-- frontend/
|   |-- public/                     # Archivos publicos
|   |-- src/
|   |   |-- assets/                 # Logos, imagenes y recursos visuales
|   |   |-- components/             # Componentes reutilizables
|   |   |-- constants/              # Constantes compartidas
|   |   |-- context/                # AuthContext y TripContext
|   |   |-- hooks/                  # Sockets, red, sync y notificaciones
|   |   |-- lib/                    # Clientes base como Supabase
|   |   |-- mock/                   # Datos mock de apoyo
|   |   |-- pages/                  # Vistas completas por ruta
|   |   |-- services/               # Clientes HTTP por modulo
|   |   |-- styles/                 # Entradas de estilos
|   |   |-- types/                  # Tipos compartidos
|   |   |-- App.tsx                 # Definicion de rutas
|   |   `-- main.tsx                # Bootstrap React
|   |-- .env.example                # Variables publicas Vite
|   |-- vercel.json                 # Rewrite SPA para Vercel
|   |-- package.json                # Scripts y dependencias frontend
|   `-- README.md                   # Guia tecnica de frontend
|
|-- docs/
|   |-- README.md                   # Indice general de documentacion
|   |-- ADS/                        # Entregables academicos de ADS
|   |-- api/                        # Endpoints REST
|   |-- architecture/               # Arquitectura actual
|   |-- casos-de-uso/               # Casos de uso
|   |-- diagramas/                  # Diagramas del sistema
|   |-- gitflow/                    # Reglas de ramas y releases
|   |-- issues/                     # Reglas para levantar issues
|   |-- requerimientos/             # Requerimientos del sistema
|   |-- workflows/                  # Guia completa de GitHub Actions
|   `-- vercel-frontend-deploy.md   # Notas de despliegue frontend
|
|-- CONTRIBUTING.md                 # Manual de trabajo del equipo
|-- LICENSE
|-- package.json                    # Archivo raiz del workspace
|-- package-lock.json
`-- README.md                       # Este documento
```

## Documentacion principal

| Documento | Uso |
| --- | --- |
| [backend/README.md](backend/README.md) | Arquitectura, scripts, variables, modulos y convenciones del backend. |
| [frontend/README.md](frontend/README.md) | Arquitectura, rutas, servicios, componentes, variables y build del frontend. |
| [docs/README.md](docs/README.md) | Indice general de documentacion tecnica, funcional y academica. |
| [docs/architecture/README.md](docs/architecture/README.md) | Vista de arquitectura actual del proyecto. |
| [docs/api/endpoints.md](docs/api/endpoints.md) | Inventario de endpoints REST. |
| [docs/workflows/README.md](docs/workflows/README.md) | Guia completa de CI/CD, Vercel y GitHub Actions. |
| [docs/env/README.md](docs/env/README.md) | Variables de entorno locales, GitHub Actions y Vercel. |
| [docs/database/README.md](docs/database/README.md) | Supabase, migraciones, RLS y cambios de esquema. |
| [docs/testing/README.md](docs/testing/README.md) | Estrategia de pruebas y comandos de verificacion. |
| [docs/realtime/README.md](docs/realtime/README.md) | Eventos Socket.IO, salas, locks y sincronizacion. |
| [docs/security/README.md](docs/security/README.md) | Secrets, permisos, CORS, uploads y revision segura. |
| [docs/releases/README.md](docs/releases/README.md) | Checklist de releases, hotfixes y entregas. |
| [docs/frontend-ui/README.md](docs/frontend-ui/README.md) | Convenciones de paginas, componentes y UI frontend. |
| [.github/workflows/README.md](.github/workflows/README.md) | Resumen rapido junto a los YAML. |
| [docs/issues/README.md](docs/issues/README.md) | Reglas para levantar issues. |
| [docs/gitflow/README.md](docs/gitflow/README.md) | Explicacion del flujo de ramas. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Reglas oficiales de colaboracion del equipo. |

## Modulos funcionales

| ID | Modulo | Backend | Frontend |
| --- | --- | --- | --- |
| M1 | Autenticacion y acceso | `auth` | `Login`, `Register`, `OTP`, `Profile` |
| M2 | Gestion de grupos y viajes | `groups`, `trips` | `MyTrips`, `CreateGroup`, `JoinGroup`, `GroupPanel` |
| M3 | Itinerario colaborativo | `itinerary`, `proposals`, `votes-comments` | `Itinerary`, modales de propuestas |
| M4 | Busqueda y APIs externas | `flights`, `hotels`, `maps` | `Search` |
| M5 | Sincronizacion en tiempo real | `infrastructure/sockets` | `useSocket`, `useGroupRealtimeRefresh` |
| M6 | Presupuesto y gastos | `budget`, `checkout` | `budget`, `Checkout` |
| M7 | Documentos y notificaciones | `documents`, `notifications`, `context-links` | `documents`, `useNotifications` |

## Instalacion local

Requisitos:

- Node.js 20.
- npm.
- Credenciales de Supabase y servicios externos si se probaran integraciones reales.

Instalar backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Instalar frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

URLs locales:

| Servicio | URL |
| --- | --- |
| Backend | `http://localhost:3001` |
| Healthcheck | `http://localhost:3001/health` |
| API base | `http://localhost:3001/api` |
| Frontend | `http://localhost:5173` |

## Scripts principales

Backend:

```bash
npm run dev
npm run build
npm run start
npm run test
npm run lint
```

Frontend:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## GitFlow del equipo

El flujo oficial esta documentado con mas detalle en [docs/gitflow/README.md](docs/gitflow/README.md) y [CONTRIBUTING.md](CONTRIBUTING.md).

### Ramas permanentes

| Rama | Proposito | Regla |
| --- | --- | --- |
| `main` | Codigo estable para entrega. | No recibe commits directos. |
| `develop` | Integracion del trabajo aprobado. | Todo entra por PR. |

### Ramas temporales

| Rama | Sale de | Entra a | Uso |
| --- | --- | --- | --- |
| `feature/nombre` | `develop` | `develop` | Nueva funcionalidad o tarea de sprint. |
| `fix/nombre` | `develop` | `develop` | Correccion de bug no urgente. |
| `docs/nombre` | `develop` | `develop` | Cambios de documentacion. |
| `ci/nombre` | `develop` | `develop` | Cambios en workflows o automatizacion. |
| `release/vX.X` | `develop` | `main` y `develop` | Cierre de sprint o entrega. |
| `hotfix/nombre` | `main` | `main` y `develop` | Correccion urgente sobre estable. |

Ejemplos:

```text
feature/auth-registro-otp
feature/frontend-dashboard-viaje
feature/backend-socket-heartbeat
fix/socket-disconnect
docs/readmes-proyecto
ci/vercel-preview
release/v1.2-sprint3
hotfix/token-expiry
```

### Flujo normal de trabajo

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-tarea
```

Antes de abrir PR:

```bash
git checkout develop
git pull origin develop
git checkout feature/nombre-de-la-tarea
git merge develop
git push -u origin feature/nombre-de-la-tarea
```

Todo PR normal debe apuntar a `develop`.

## Reglas de oro

1. No hacer push directo a `main` ni a `develop`.
2. No hacer merge de tu propio PR.
3. Todo cambio relevante debe tener issue.
4. Todo PR debe apuntar a la rama correcta.
5. Un PR debe resolver una cosa clara.
6. Todo endpoint nuevo debe documentarse en `docs/api/endpoints.md`.
7. Todo cambio de workflow debe documentarse en `docs/workflows/README.md`.
8. Todo cambio de variable, migracion, evento realtime o regla de seguridad debe documentarse.
9. Todo cambio estructural debe reflejarse en el README correspondiente.
10. No subir `.env`, secrets, tokens ni credenciales.
11. No pedir merge con CI fallando.
12. Si hay cambios visuales, agregar evidencia en el PR.
13. Si hay duda de alcance, preguntar antes de mezclar cambios no relacionados.

## CI/CD

| Workflow | Archivo | Proposito |
| --- | --- | --- |
| CI Backend | `.github/workflows/ci-backend.yml` | Valida backend con lint, type check, build y tests. |
| CI Frontend | `.github/workflows/ci-frontend.yml` | Valida frontend con lint, type check y build. |
| Preview Vercel | `.github/workflows/vercel-frontend-preview.yml` | Genera deploy preview en PRs hacia `develop`. |
| Produccion Vercel | `.github/workflows/vercel-frontend-production.yml` | Despliega frontend desde `develop` o manualmente. |

Guia completa: [docs/workflows/README.md](docs/workflows/README.md).

## Variables de entorno

Backend:

- Copiar `backend/.env.example` a `backend/.env`.
- Configurar Supabase, APIs externas, email y puerto local.

Frontend:

- Copiar `frontend/.env.example` a `frontend/.env`.
- Configurar `VITE_API_URL`, Supabase publico y llave de Google Maps para navegador.

Regla: ninguna variable secreta debe subirse al repositorio.

## Recursos

- [Tablero Notion](https://www.notion.so/3169d31c051280f69a33cb0401001bd0)
- [Seguimiento Google Sheets](https://docs.google.com/spreadsheets/d/1usizFziQstavDTBPxTMygbx_ATeBYn-N/edit)
- [Documentacion del proyecto](docs/README.md)

## Equipo

| Rol | Integrante | GitHub |
| --- | --- | --- |
| Scrum Master | Demian Romero Bautista | `@DemianRomero` |
| Frontend Dev | Ximena Cardenas Hernandez | `@ximcaher20` |
| Lider Backend | Hector Said Ferreira Rodriguez | `@HectorSaidFerreira` |
| Backend Dev | Ali Yair Riano Ortiz | `@AliYairRiano` |
| Backend Dev | Yael Sebastian Sangrador Curiel | `@YaelSangrador` |
| Backend Dev | Leonardo Esau Olivares Valdez | `@LeonardoOlivares` |
| Lider Frontend | Bryan Ayala Banos | `@BryanAyala` |
| Frontend Dev | Carlos Daniel Juarez Gomez | `@CarlosDanielJuarez` |
| Frontend Dev | Kevin Antonio Lopez Toledo | `@KevinLopez` |
| Lider Docs | Gabriel Hernandez Flores | `@GabrielHernandez` |
| Analista | Emilio Diaz Maturano | `@EmilioDiaz` |
| Analista | Edgar Correa Cano | `@EdgarCorrea` |

---

Proyecto academico de Analisis y Diseno de Sistemas - Ingenieria en Sistemas Computacionales - ESCOM IPN - Ciclo 2026/2 - Grupo 5CM3.
