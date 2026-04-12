# 🤝 Guía de Contribución — Ithera

Toda contribución debe seguir este flujo para mantener la integridad del código y cumplir los Work Agreements del equipo.

---

## 🌿 Flujo Gitflow obligatorio

### 1. Parte siempre de `develop` actualizado

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo
```

### 2. Convención de nombres de ramas

```
feature/modulo-descripcion     ← nueva funcionalidad o tarea de sprint
hotfix/descripcion-del-bug     ← fix urgente sobre main
release/vX.X-sprintN           ← preparación de entrega académica
```

Ejemplos:
```
feature/auth-registro-otp
feature/backend-socket-heartbeat
feature/frontend-presupuesto-cartera
hotfix/fix-jwt-expiry-redis
release/v1.2-sprint3
```

### 3. Mensajes de commit

```
tipo(módulo): descripción corta en imperativo

feat(auth): agregar validación OTP con expiración de 10 min
fix(sockets): corregir reconexión en modo offline
docs(m6): actualizar casos de uso de presupuesto
refactor(itinerary): extraer lógica de bloqueo atómico a servicio
test(budget): agregar pruebas de división equitativa
chore(ci): actualizar versión de Node en workflow
```

Tipos válidos: `feat` · `fix` · `docs` · `refactor` · `test` · `chore` · `style`

### 4. Antes de abrir el PR

```bash
git pull origin develop        # actualizar desde la base
npx tsc --noEmit               # TypeScript sin errores
npm run lint                   # ESLint sin errores
```

### 5. Abre el Pull Request

- **Base branch:** `develop` (nunca directo a `main`)
- Llena **completamente** el template del PR
- Asigna al menos **1 reviewer** distinto a ti
- Enlaza la tarea de Notion o issue correspondiente

### 6. Aprobaciones requeridas

| Destino | Aprobaciones necesarias |
|---------|------------------------|
| `develop` | 1 compañero distinto al autor |
| `main` | 2 (Scrum Master + líder de célula) |

---

## ✅ Checklist antes de hacer push

- [ ] Compila sin errores: `npx tsc --noEmit`
- [ ] Linter pasa: `npm run lint`
- [ ] No hay `console.log` de debug en el código final
- [ ] Variables de entorno nuevas están en `.env.example` (sin valores reales)
- [ ] No hay API keys ni secrets hardcodeados
- [ ] Rama actualizada respecto a `develop`

---

## 🚫 Prohibido

| Acción | Motivo |
|--------|--------|
| Push directo a `main` | Rompe el código estable de entrega |
| Push directo a `develop` | Salta la revisión por pares |
| `git push --force` en ramas compartidas | Destruye el historial del equipo |
| Commitear `.env` con valores reales | Riesgo de seguridad |
| Mergear tu propio PR | Viola el protocolo de revisión |

---

## 🗂️ CODEOWNERS — Áreas y responsables

| Área | Responsables |
|------|-------------|
| `/backend/` | Hector Said, Ali Yair, Yael, Leonardo |
| `/frontend/` | Bryan, Carlos Daniel, Kevin |
| `/docs/` | Gabriel, Emilio, Edgar |
| `/.github/workflows/` | Demian (Scrum Master) |
| Global / merges a `main` | Demian + Ximena |

Si tu PR toca un área que no es la tuya, el owner de esa área será notificado automáticamente.

---

## ❓ Dudas

Comunícate en el canal de Discord del proyecto o en el tablero de Notion.
