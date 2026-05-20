# Guia de contribucion - ITHERA

Este documento define las reglas oficiales para trabajar en ITHERA: issues, ramas, commits, pull requests, revisiones, CI/CD y documentacion obligatoria.

```text
Proyecto academico: Analisis y Diseno de Sistemas
Carrera: Ingenieria en Sistemas Computacionales
Escuela: Escuela Superior de Computo - IPN
Ciclo: 2026/2
Grupo: 5CM3
Profesora: Idalia Maldonado
Equipo: 3
```

## Indice

1. [Principios de trabajo](#principios-de-trabajo)
2. [Preparacion local](#preparacion-local)
3. [Issues](#issues)
4. [GitFlow](#gitflow)
5. [Commits](#commits)
6. [Pull requests](#pull-requests)
7. [Verificaciones](#verificaciones)
8. [CI/CD](#cicd)
9. [Documentacion obligatoria](#documentacion-obligatoria)
10. [Reglas de oro](#reglas-de-oro)

## Principios de trabajo

- Todo cambio debe ser rastreable.
- Todo PR debe tener un alcance claro.
- La rama `develop` integra el trabajo aprobado.
- La rama `main` representa codigo estable de entrega.
- La documentacion debe actualizarse junto con el cambio que la vuelve obsoleta.
- Nadie debe subir secrets, `.env`, tokens o credenciales.
- El CI debe pasar antes de mergear.

## Preparacion local

Configura Git:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@correo.com"
```

Clona el repositorio:

```bash
git clone https://github.com/ximcaher20/repo-equipo3ads
cd ithera
```

Instala dependencias:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Copia variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Levanta el backend:

```bash
cd backend
npm run dev
```

Levanta el frontend:

```bash
cd frontend
npm run dev
```

## Issues

Todo trabajo relevante debe tener issue antes de abrir PR.

### Tipos de issue

| Tipo | Uso | Rama sugerida |
| --- | --- | --- |
| Bug | Algo existente falla. | `fix/nombre` |
| Feature | Nueva funcionalidad. | `feature/nombre` |
| Task | Trabajo tecnico, deuda, configuracion o refactor controlado. | `feature/nombre` o `chore/nombre` |
| Docs | Cambios exclusivos de documentacion. | `docs/nombre` |
| CI | Workflows, Vercel, checks o automatizacion. | `ci/nombre` |
| Hotfix | Correccion urgente sobre estable. | `hotfix/nombre` |

### Contenido minimo

Un issue debe incluir:

- Contexto.
- Objetivo.
- Alcance.
- Criterios de aceptacion.
- Modulo afectado: `backend`, `frontend`, `docs`, `workflows` o varios.
- Evidencia si aplica: capturas, logs, pasos de reproduccion o links.

### Criterios de aceptacion

Usa criterios verificables:

```md
- [ ] El usuario puede crear un grupo con datos validos.
- [ ] El backend rechaza fechas invalidas.
- [ ] El frontend muestra error cuando la API responde 400.
- [ ] El endpoint queda documentado en docs/api/endpoints.md.
```

Mas detalle: [docs/issues/README.md](docs/issues/README.md).

## GitFlow

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
| `ci/nombre` | `develop` | `develop` | Workflows o automatizacion. |
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

### Crear rama

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-tarea
```

### Sincronizar antes de PR

```bash
git checkout develop
git pull origin develop
git checkout feature/nombre-de-la-tarea
git merge develop
git push -u origin feature/nombre-de-la-tarea
```

Mas detalle: [docs/gitflow/README.md](docs/gitflow/README.md).

## Commits

Formato:

```text
tipo: descripcion corta en presente
```

Tipos permitidos:

| Tipo | Uso |
| --- | --- |
| `feat` | Nueva funcionalidad. |
| `fix` | Correccion de bug. |
| `docs` | Documentacion. |
| `refactor` | Cambio interno sin alterar comportamiento esperado. |
| `test` | Pruebas. |
| `ci` | Workflows o configuracion CI/CD. |
| `chore` | Mantenimiento, dependencias o configuracion. |
| `style` | Formato sin cambio logico. |

Ejemplos correctos:

```text
feat: agregar busqueda de hoteles
fix: corregir validacion de token expirado
docs: actualizar endpoints de api
refactor: separar servicio de presupuesto
test: agregar pruebas de checkout
ci: ajustar deploy preview de vercel
chore: actualizar dependencias frontend
```

Evita:

```text
WIP
cambios
arreglos
fix cosas
actualizacion
```

## Pull requests

Todo PR debe:

- Apuntar a `develop`, salvo `release` o `hotfix`.
- Estar asociado a un issue.
- Llenar el template completo.
- Tener alcance pequeno y revisable.
- Explicar que cambia y por que.
- Incluir evidencia visual si modifica frontend.
- Indicar comandos de verificacion ejecutados.
- Pasar CI.
- Tener aprobacion requerida.

### Checklist antes de abrir PR

- [ ] Mi rama parte de `develop` actualizado.
- [ ] El PR esta asociado a un issue.
- [ ] Corri verificaciones locales del paquete afectado.
- [ ] No subi `.env`, tokens, secrets ni credenciales.
- [ ] No mezcle cambios no relacionados.
- [ ] Actualice documentacion si cambio endpoints, estructura, workflows o comportamiento visible.
- [ ] El PR apunta a la rama correcta.

### Aprobaciones

| PR hacia | Aprobaciones requeridas | Quien aprueba |
| --- | --- | --- |
| `develop` | 1 | Scrum Master o lider de celula. |
| `main` | 2 | Scrum Master y Product Owner. |

No hagas merge de tu propio PR.

## Verificaciones

Backend:

```bash
cd backend
npm run lint
npx tsc --noEmit
npm run build
npm test -- --runInBand
```

Frontend:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Documentacion:

- Revisar links internos.
- Confirmar que no haya informacion desactualizada.
- Confirmar que rutas, scripts y variables mencionadas existan.

## CI/CD

Workflows actuales:

| Workflow | Que valida |
| --- | --- |
| `ci-backend.yml` | Dependencias, lint, type check, build y tests backend. |
| `ci-frontend.yml` | Dependencias, lint, type check y build frontend. |
| `vercel-frontend-preview.yml` | Preview deploy del frontend en PRs hacia `develop`. |
| `vercel-frontend-production.yml` | Deploy productivo del frontend desde `develop` o ejecucion manual. |

Guias:

- [docs/workflows/README.md](docs/workflows/README.md)
- [.github/workflows/README.md](.github/workflows/README.md)

Si falla CI:

1. Leer el log del job fallido.
2. Reproducir localmente el comando que fallo.
3. Corregir en la misma rama.
4. Subir nuevo commit.
5. Esperar que el CI vuelva a pasar.

No pedir merge con checks rojos.

## Documentacion obligatoria

Actualizar documentacion en el mismo PR cuando:

| Cambio | Documento a actualizar |
| --- | --- |
| Nuevo endpoint o cambio de contrato API | [docs/api/endpoints.md](docs/api/endpoints.md) |
| Nueva variable de entorno | [docs/env/README.md](docs/env/README.md) |
| Nueva migracion o cambio de esquema | [docs/database/README.md](docs/database/README.md) |
| Nuevo evento Socket.IO o cambio realtime | [docs/realtime/README.md](docs/realtime/README.md) |
| Cambio de pruebas o comandos de verificacion | [docs/testing/README.md](docs/testing/README.md) |
| Cambio de seguridad, permisos o secrets | [docs/security/README.md](docs/security/README.md) |
| Cambio de release/hotfix/entrega | [docs/releases/README.md](docs/releases/README.md) |
| Cambio visual estructural frontend | [docs/frontend-ui/README.md](docs/frontend-ui/README.md) |
| Cambio de estructura backend | [backend/README.md](backend/README.md) y [docs/architecture/README.md](docs/architecture/README.md) |
| Cambio de estructura frontend | [frontend/README.md](frontend/README.md) y [docs/architecture/README.md](docs/architecture/README.md) |
| Cambio de workflow | [docs/workflows/README.md](docs/workflows/README.md) y [.github/workflows/README.md](.github/workflows/README.md) |
| Cambio de reglas de colaboracion | [CONTRIBUTING.md](CONTRIBUTING.md) y, si aplica, [README.md](README.md) |
| Cambio de GitFlow | [docs/gitflow/README.md](docs/gitflow/README.md) y [CONTRIBUTING.md](CONTRIBUTING.md) |
| Cambio de criterios de issues | [docs/issues/README.md](docs/issues/README.md) y [CONTRIBUTING.md](CONTRIBUTING.md) |

## Reglas de oro

1. No hacer push directo a `main` ni a `develop`.
2. No hacer merge de tu propio PR.
3. Todo cambio relevante debe tener issue.
4. Todo PR debe apuntar a la rama correcta.
5. Un PR debe resolver una cosa clara.
6. Todo endpoint nuevo debe documentarse.
7. Todo cambio de workflow debe documentarse.
8. Todo cambio de variable, migracion, evento realtime o seguridad debe documentarse.
9. Todo cambio estructural debe reflejarse en el README correspondiente.
10. No subir `.env`, secrets, tokens ni credenciales.
11. No pedir merge con CI fallando.
12. Si hay cambios visuales, agregar evidencia en el PR.
13. Si hay duda de alcance, preguntar antes de mezclar cambios no relacionados.

Proyecto academico - ESCOM IPN - Ingenieria en Sistemas Computacionales - Analisis y Diseno de Sistemas - Ciclo 2026/2 - Grupo 5CM3.
