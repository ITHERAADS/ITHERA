# GitFlow - Ithera

Esta guia describe la estrategia de ramas del proyecto. Las reglas completas de contribucion viven en [../../CONTRIBUTING.md](../../CONTRIBUTING.md).

## Ramas permanentes

| Rama | Proposito | Regla |
| --- | --- | --- |
| `main` | Codigo estable para entrega. | Protegida, sin commits directos. |
| `develop` | Integracion de trabajo aprobado. | Protegida, recibe PRs de trabajo diario. |

## Ramas temporales

| Rama | Sale de | Entra a | Uso |
| --- | --- | --- | --- |
| `feature/nombre` | `develop` | `develop` | Nueva funcionalidad. |
| `fix/nombre` | `develop` | `develop` | Correccion no urgente. |
| `docs/nombre` | `develop` | `develop` | Documentacion. |
| `ci/nombre` | `develop` | `develop` | Workflows o automatizacion. |
| `release/vX.X` | `develop` | `main` y `develop` | Cierre de sprint o entrega. |
| `hotfix/nombre` | `main` | `main` y `develop` | Correccion urgente sobre estable. |

## Flujo normal

```text
develop
  -> feature/nombre
  -> pull request hacia develop
  -> CI pasa
  -> revision aprobada
  -> merge a develop
```

Comandos:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-la-tarea
```

Antes del PR:

```bash
git checkout develop
git pull origin develop
git checkout feature/nombre-de-la-tarea
git merge develop
git push -u origin feature/nombre-de-la-tarea
```

## Release

Usar `release/vX.X` cuando el equipo quiera congelar una entrega.

```text
develop -> release/vX.X -> main
                         -> develop
```

Durante release:

- Solo entran fixes necesarios para estabilizar.
- No entran features nuevas.
- Se validan frontend, backend, docs y demo.
- Al cerrar, se mergea a `main` y se reintegra a `develop`.

## Hotfix

Usar `hotfix/nombre` solo si hay un problema urgente en la rama estable.

```text
main -> hotfix/nombre -> main
                      -> develop
```

Reglas:

- Debe ser pequeno.
- Debe explicar el problema y la urgencia.
- Debe pasar CI.
- Debe reintegrarse a `develop` para no perder el fix.

## Nombres de ramas

Usa kebab-case, sin espacios ni caracteres especiales:

```text
feature/auth-registro-otp
feature/frontend-dashboard-viaje
fix/socket-disconnect
docs/readmes-proyecto
ci/vercel-preview
release/v1.2-sprint3
hotfix/token-expiry
```

## Merge

Reglas:

- No hacer merge de tu propio PR.
- No mergear con CI fallando.
- No mergear si el PR no tiene aprobacion requerida.
- No mezclar cambios no relacionados.
- Borrar ramas temporales despues del merge si ya no se necesitan.

## Relacion con CI/CD

- PRs hacia `develop` o `main` disparan CI backend/frontend segun paths.
- PRs de frontend hacia `develop` pueden crear preview en Vercel.
- Push a `develop` con cambios de frontend despliega produccion segun el workflow actual.
- Si el equipo decide que produccion salga desde `main`, debe actualizar el workflow y [../workflows/README.md](../workflows/README.md).
