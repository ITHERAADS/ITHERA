# Documentacion - ITHERA

Este directorio concentra la documentacion funcional, tecnica y academica del proyecto. El objetivo es que una persona nueva pueda entender que existe, donde esta y que documento debe consultar segun su necesidad.

## Lectura recomendada

Para incorporarse rapido al proyecto:

1. Leer [../README.md](../README.md) para entender el producto, stack y estructura general.
2. Leer [../CONTRIBUTING.md](../CONTRIBUTING.md) antes de crear ramas, issues o PRs.
3. Leer [../backend/README.md](../backend/README.md) si se trabajara en backend.
4. Leer [../frontend/README.md](../frontend/README.md) si se trabajara en frontend.
5. Revisar [workflows/README.md](workflows/README.md) si el cambio toca CI/CD, deploy o Vercel.

## Indice

| Documento | Audiencia | Contenido |
| --- | --- | --- |
| [api/endpoints.md](api/endpoints.md) | Backend, frontend, QA | Inventario funcional de endpoints REST. |
| [architecture/README.md](architecture/README.md) | Devs nuevos, lideres tecnicos | Vista tecnica de carpetas, capas y convenciones. |
| [workflows/README.md](workflows/README.md) | Todo el equipo | CI, checks, preview deploys, production deploys y secrets. |
| [env/README.md](env/README.md) | Backend, frontend, DevOps | Variables de entorno locales, Vercel y GitHub Actions. |
| [database/README.md](database/README.md) | Backend, datos | Supabase, clientes, migraciones y reglas de esquema. |
| [testing/README.md](testing/README.md) | Devs, QA | Estrategia de pruebas y comandos de verificacion. |
| [realtime/README.md](realtime/README.md) | Backend, frontend | Socket.IO, eventos, salas, locks y hooks consumidores. |
| [security/README.md](security/README.md) | Todo el equipo | Secrets, auth, permisos, CORS, uploads y revision segura. |
| [releases/README.md](releases/README.md) | Lideres, equipo | Cierre de sprint, releases, hotfixes y checklist de entrega. |
| [frontend-ui/README.md](frontend-ui/README.md) | Frontend | Convenciones de paginas, componentes, servicios y UI. |
| [issues/README.md](issues/README.md) | Todo el equipo | Tipos de issues, contenido minimo y criterios de aceptacion. |
| [gitflow/README.md](gitflow/README.md) | Todo el equipo | Ramas, destinos, releases, hotfixes y reglas de merge. |
| [requerimientos/README.md](requerimientos/README.md) | Analisis, PO, QA | Requerimientos del sistema. |
| [casos-de-uso/README.md](casos-de-uso/README.md) | Analisis, devs, QA | Casos de uso del producto. |
| [diagramas/README.md](diagramas/README.md) | Analisis, arquitectura | Diagramas y modelos de soporte. |
| [ADS/README.md](ADS/README.md) | Equipo academico | Entregables de Analisis y Diseno de Sistemas. |
| [extracted/README.md](extracted/README.md) | Docs/analisis | Artefactos fuente o exportaciones crudas, no documentacion final. |
| [vercel-frontend-deploy.md](vercel-frontend-deploy.md) | DevOps/frontend | Notas especificas de despliegue del frontend en Vercel. |

## Documentacion oficial vs artefactos fuente

Usa como documentacion oficial:

- `README.md` dentro de cada carpeta.
- `api/endpoints.md`.
- `architecture/README.md`.
- `workflows/README.md`.
- `env/README.md`.
- `database/README.md`.
- `testing/README.md`.
- `realtime/README.md`.
- `security/README.md`.
- `releases/README.md`.
- `frontend-ui/README.md`.
- `issues/README.md`.
- `gitflow/README.md`.

Usa `extracted/` solo como referencia cruda. No debe ser la primera fuente para entender el proyecto porque puede contener archivos exportados automaticamente desde PDF u otras herramientas.

## Como mantener esta documentacion

- Cada cambio de endpoint debe actualizar [api/endpoints.md](api/endpoints.md).
- Cada cambio de workflow debe actualizar [workflows/README.md](workflows/README.md).
- Cada cambio de variable de entorno debe actualizar [env/README.md](env/README.md).
- Cada cambio de migracion o esquema debe actualizar [database/README.md](database/README.md).
- Cada cambio de evento Socket.IO debe actualizar [realtime/README.md](realtime/README.md).
- Cada cambio de pruebas o comandos de verificacion debe actualizar [testing/README.md](testing/README.md).
- Cada cambio de reglas de entrega debe actualizar [releases/README.md](releases/README.md).
- Cada cambio visual estructural debe actualizar [frontend-ui/README.md](frontend-ui/README.md) o [../frontend/README.md](../frontend/README.md).
- Cada cambio al flujo de trabajo debe actualizar [issues/README.md](issues/README.md), [gitflow/README.md](gitflow/README.md) o [../CONTRIBUTING.md](../CONTRIBUTING.md), segun aplique.
- Cada cambio relevante de estructura debe actualizar [../README.md](../README.md), [../backend/README.md](../backend/README.md), [../frontend/README.md](../frontend/README.md) o [architecture/README.md](architecture/README.md), segun aplique.
- Las reglas de trabajo del equipo viven en [../CONTRIBUTING.md](../CONTRIBUTING.md), no duplicarlas en cada documento.
- Si un documento queda obsoleto, corregirlo en el mismo PR que introduce el cambio.
- No subir extracciones `.txt` si no fueron revisadas y son legibles.

## Criterios de calidad

Una buena actualizacion de documentacion debe:

- Decir donde esta el codigo relacionado.
- Decir como se ejecuta o verifica.
- Distinguir reglas obligatorias de recomendaciones.
- Evitar datos inventados o deseados; documentar el estado real del repo.
- Enlazar documentos relacionados en vez de repetir bloques largos.

## Documentacion pendiente sugerida

Estos documentos pueden agregarse cuando el equipo los necesite:

- `docs/observability/README.md`: logs, monitoreo y diagnostico de errores.
- `docs/accessibility/README.md`: criterios de accesibilidad de interfaz.
