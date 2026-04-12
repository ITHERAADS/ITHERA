# 🧭 Ithera

> Ecosistema digital colaborativo para la planificación de viajes grupales en tiempo real.

**IPN ESCOM · Análisis y Diseño de Sistemas · 5CM3 · Equipo 3**

---

## 📖 Descripción

Ithera centraliza en una sola interfaz todos los flujos de trabajo de un viaje grupal: itinerario colaborativo, presupuesto compartido, logística de transporte, bóveda de documentos y comunicación en tiempo real.

El núcleo del sistema es la sincronización multiusuario mediante WebSockets — cualquier propuesta, cambio de presupuesto o bloqueo de itinerario se refleja instantáneamente en todos los dispositivos conectados.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + TypeScript + Express.js |
| Real-time | Socket.io + Redis (adaptador) |
| Frontend | React.js + TypeScript + Tailwind CSS |
| Base de datos | PostgreSQL (principal) + Redis (sesiones/caché) |
| ORM | TypeORM |
| HTTP Client | Axios + React Query |
| APIs externas | Amadeus, Google Maps Platform, OpenWeatherMap, ExchangeRate-API, Navitia |

---

## 🗂️ Estructura del proyecto

```
ithera/
├── .github/                   ← CI, templates de PR e issues, CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── task.md
│   ├── workflows/
│   │   ├── ci-backend.yml
│   │   └── ci-frontend.yml
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
│
├── backend/
│   └── src/
│       ├── config/            ← db, redis, env
│       ├── domain/            ← lógica de negocio por módulo
│       │   ├── auth/
│       │   ├── groups/
│       │   ├── itinerary/
│       │   ├── proposals/
│       │   ├── budget/
│       │   └── notifications/
│       ├── infrastructure/    ← adaptadores externos
│       │   ├── db/
│       │   ├── redis/
│       │   ├── sockets/
│       │   └── external-apis/
│       ├── routes/            ← Express routers por módulo
│       └── middlewares/       ← JWT, error handler, rate limit
│
├── frontend/
│   └── src/
│       ├── components/        ← componentes React reutilizables
│       ├── pages/             ← vistas por módulo
│       ├── hooks/             ← custom hooks (socket, network)
│       ├── context/           ← AuthContext, TripContext
│       ├── services/          ← llamadas HTTP (Axios)
│       └── types/             ← TypeScript interfaces globales
│
└── docs/                      ← Documentación oficial del proyecto
    ├── requerimientos/
    ├── diagramas/
    ├── casos-de-uso/
    ├── api/
    └── ADS/
```

---

## 🏛️ Módulos del sistema

| ID | Módulo |
|----|--------|
| M1 | Autenticación y Acceso |
| M2 | Gestión de Grupo |
| M3 | Itinerario Colaborativo y Colaboración |
| M4 | Búsqueda y APIs Externas |
| M5 | Sincronización en Tiempo Real |
| M6 | Presupuesto y Gastos |
| M7 | Notificaciones, Historial y Exportación |

---

## 🌿 Flujo de trabajo — Gitflow

| Rama | Propósito |
|------|-----------|
| `main` | Código estable para entrega. **CERO commits directos.** |
| `develop` | Integración. Todo PR aprobado converge aquí. |
| `feature/nombre` | Nueva funcionalidad o tarea de Sprint. |
| `hotfix/nombre` | Fix urgente sobre `main`. |
| `release/vX.X` | Freeze para entrega académica. |

**Convención de nombres:**
```
feature/auth-registro-otp
feature/backend-socket-heartbeat
feature/frontend-dashboard-financiero
hotfix/fix-token-expiry
release/v1.2-sprint3
```

**Protocolo de Pull Request:**
1. `git checkout -b feature/nombre develop`
2. Desarrolla y commitea
3. `git pull origin develop` antes del PR
4. Abre PR hacia `develop` — asigna mínimo **1 reviewer distinto a ti**
5. Para mergear a `main` se requieren **2 aprobaciones** (SM + líder de célula)
6. Nunca hagas merge tú mismo sin aprobaciones

> ⚠️ `main` y `develop` tienen **Branch Protection** activo. No se puede hacer push directo ni force push, ni siquiera como admin.

---

## ⚙️ Configuración local

```bash
# 1. Clonar
git clone https://github.com/ximcaher20/repo-equipo3ads
cd ithera

# 2. Variables de entorno
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edita los .env con tus credenciales locales

# 3. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 4. Correr en desarrollo
cd backend && npm run dev
cd ../frontend && npm run dev
```

---

## 🔒 Branch Protection — Resumen de reglas

### `main`
- PR obligatorio · 2 aprobaciones · CI debe pasar
- Solo SM y PO pueden hacer merge
- Force push y eliminación **desactivados**
- "Do not allow bypassing" **activado** (aplica a admins también)

### `develop`
- PR obligatorio · 1 aprobación de compañero distinto al autor
- CI (lint + build) debe pasar
- Force push y eliminación **desactivados**

---

## 👥 Equipo

| Rol | Integrante | GitHub |
|-----|-----------|--------|
| Scrum Master | Demian Romero Bautista | @DemianRomero |
| Product Owner | Ximena Cárdenas Hernández | @ximcaher20 |
| Líder Backend | Hector Said Ferreira Rodríguez | @HectorSaidFerreira |
| Backend Dev | Ali Yair Riaño Ortiz | @AliYairRiano |
| Backend Dev | Yael Sebastián Sangrador Curiel | @YaelSangrador |
| Backend Dev | Leonardo Esaú Olivares Valdez | @LeonardoOlivares |
| Líder Frontend | Bryan Ayala Baños | @BryanAyala |
| Frontend Dev | Carlos Daniel Juárez Gómez | @CarlosDanielJuarez |
| Frontend Dev | Kevin Antonio López Toledo | @KevinLopez |
| Líder Docs | Gabriel Hernández Flores | @GabrielHernandez |
| Analista | Emilio Díaz Maturano | @EmilioDiaz |
| Analista | Edgar Correa Cano | @EdgarCorrea |

---

## 🔗 Recursos

- 📋 [Tablero Notion](https://www.notion.so/3169d31c051280f69a33cb0401001bd0)
- 📊 [Seguimiento Google Sheets](https://docs.google.com/spreadsheets/d/1usizFziQstavDTBPxTMygbx_ATeBYn-N/edit)
- 📁 Documentación completa en `/docs`

---

*Proyecto académico — IPN ESCOM 2026 · Equipo 3*
