# Reporte de pruebas de integridad - Backend

Este reporte resume pruebas historicas ejecutadas sobre el backend de ITHERA. Para la estrategia vigente de pruebas consulta [../../docs/testing/README.md](../../docs/testing/README.md).

## Alcance original

- Modulo de propuestas.
- Votos, resultados y comentarios.
- Seguridad por pertenencia a grupo.
- Compilacion TypeScript y estabilidad del modulo.

## Validaciones cubiertas

| Validacion | Resultado historico |
| --- | --- |
| Voto unico por usuario y propuesta | Validado |
| Resultados ordenados por popularidad | Validado |
| CRUD de comentarios | Validado |
| Seguridad por pertenencia al grupo | Validado |
| Build TypeScript | Validado |
| Tests unitarios con Jest | Validado |

## Comandos relacionados

```bash
cd backend
npm run build
npm test -- --runInBand
```

## Archivos relacionados

- `backend/src/domain/proposals/proposals.service.ts`
- `backend/src/routes/proposals.router.ts`
- `backend/src/domain/groups/groups.service.ts`
- `backend/tests/proposals.service.test.ts`
- `backend/src/infrastructure/db/migrations/20260419_unique_vote_per_user_proposal.sql`

## Nota de mantenimiento

Este archivo debe mantenerse como evidencia historica. Los nuevos lineamientos de pruebas, cobertura minima y comandos oficiales deben documentarse en `docs/testing/README.md`.
