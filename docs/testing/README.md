# Testing - ITHERA

Esta guia define como ejecutar y mantener pruebas del proyecto.

## Estado actual

El backend tiene pruebas con Jest en:

```text
backend/tests/
```

Archivos relevantes:

| Archivo | Proposito |
| --- | --- |
| `budget.service.test.ts` | Reglas de presupuesto, gastos y liquidaciones. |
| `context-links.service.test.ts` | Enlaces contextuales por grupo. |
| `proposals.service.test.ts` | Propuestas, votos y comentarios. |
| `amadeus.integrity.test.ts` | Integridad de integracion Amadeus. |
| `test_sockets.mjs` | Pruebas manuales/auxiliares de sockets. |
| `setup.ts` | Setup Jest. |
| `INTEGRITY_TEST_REPORT.md` | Evidencia historica de pruebas. |

## Comandos backend

```bash
cd backend
npm test
npm test -- --runInBand
npm run build
npx tsc --noEmit
```

## Comandos frontend

El frontend no tiene suite de tests automatizada en este momento. La verificacion minima es:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

## Que probar

Agregar o actualizar pruebas cuando cambie:

- Logica de negocio en `backend/src/domain`.
- Validaciones de permisos.
- Calculos de presupuesto o liquidaciones.
- Votos, comentarios, propuestas o locks.
- Transformaciones de datos que afecten API.
- Mocks de clientes externos.

## Convenciones

- Tests unitarios cerca de `backend/tests`.
- Usar mocks para Supabase cuando se pruebe logica de dominio.
- Evitar tests que dependan de credenciales reales salvo que sean pruebas de integridad documentadas.
- Los tests deben ser deterministas.

## Checklist antes de PR

- Backend: correr `npm test -- --runInBand`.
- Backend: correr `npx tsc --noEmit`.
- Frontend: correr `npm run build`.
- Si no se puede correr algo, explicar el motivo en el PR.
