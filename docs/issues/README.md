# Issues - Ithera

Esta guia define que issues debe levantar el equipo y que informacion minima deben incluir. Las reglas operativas completas viven en [../../CONTRIBUTING.md](../../CONTRIBUTING.md).

## Cuándo levantar un issue

Levanta un issue cuando el trabajo:

- Agrega una funcionalidad.
- Corrige un bug.
- Cambia comportamiento existente.
- Modifica endpoints, modelos, sockets o servicios externos.
- Cambia UI o flujos de usuario.
- Cambia workflows, deploy, configuracion o variables de entorno.
- Documenta una parte importante del proyecto.
- Requiere seguimiento o aprobacion del equipo.

No hace falta issue para cambios minimos como typo pequeño o ajuste trivial aprobado directamente por el lider del area.

## Tipos

| Tipo | Uso | Ejemplo |
| --- | --- | --- |
| Bug | Algo existente falla. | Login no redirige despues de OTP. |
| Feature | Nueva capacidad funcional. | Agregar boveda de documentos por grupo. |
| Task | Trabajo tecnico o deuda controlada. | Separar servicio de checkout. |
| Docs | Documentacion. | Actualizar README de frontend. |
| CI | Workflows, deploy o automatizacion. | Agregar preview deploy en Vercel. |
| Refactor | Reorganizacion sin cambio funcional esperado. | Unificar servicios de mapas. |

## Campos minimos

Todo issue debe tener:

- Titulo claro.
- Contexto.
- Alcance.
- Criterios de aceptacion.
- Modulo afectado.
- Evidencia o links si aplica.
- Prioridad o sprint si el equipo lo esta usando.

## Bug

Formato recomendado:

```md
## Contexto
Describe donde ocurre el bug.

## Pasos para reproducir
1. Ir a ...
2. Hacer ...
3. Observar ...

## Resultado actual
Que pasa hoy.

## Resultado esperado
Que deberia pasar.

## Ambiente
Local, preview o produccion.

## Evidencia
Screenshots, logs o video si aplica.
```

Criterios de aceptacion para bug:

- El flujo afectado funciona.
- No se rompe el flujo relacionado.
- Se agregan pruebas si el bug era de logica reutilizable.
- Se documenta si el fix cambia contrato de API o comportamiento visible.

## Feature

Formato recomendado:

```md
## Objetivo
Que usuario necesita esto y para que.

## Alcance
Que incluye.

## Fuera de alcance
Que no se hara en este issue.

## Criterios de aceptacion
- [ ] ...
- [ ] ...

## Impacto tecnico
Backend, frontend, datos, sockets, workflows o docs.
```

Criterios de aceptacion para feature:

- El usuario puede completar el flujo esperado.
- La UI maneja estados de carga, exito y error cuando aplica.
- El backend valida entradas y permisos.
- Los endpoints o eventos nuevos quedan documentados.

## Task tecnica

Formato recomendado:

```md
## Motivo
Por que se necesita.

## Trabajo esperado
Lista de cambios tecnicos.

## Riesgos
Que podria romperse.

## Verificacion
Comandos, pruebas o revision manual necesaria.
```

## Labels sugeridas

| Label | Uso |
| --- | --- |
| `backend` | Cambios en `backend`. |
| `frontend` | Cambios en `frontend`. |
| `docs` | Cambios documentales. |
| `ci` | Workflows o deploy. |
| `bug` | Correccion de bug. |
| `feature` | Nueva funcionalidad. |
| `refactor` | Reorganizacion tecnica. |
| `blocked` | Bloqueado por dependencia o decision. |
| `needs-review` | Listo para revision. |

## Relacion con PRs

Cada PR debe enlazar su issue:

```md
Closes #123
```

Si el PR no cierra por completo el issue:

```md
Relates #123
```

Evita cerrar issues grandes con PRs que solo resuelven una parte.
