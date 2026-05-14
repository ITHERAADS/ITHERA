# Releases y entregas - ITHERA

Esta guia define como cerrar sprints o entregas usando GitFlow.

## Ramas

| Rama | Uso |
| --- | --- |
| `develop` | Integracion diaria. |
| `release/vX.X` | Freeze de entrega. |
| `main` | Codigo estable entregable. |
| `hotfix/nombre` | Correccion urgente desde `main`. |

## Crear release

```bash
git checkout develop
git pull origin develop
git checkout -b release/vX.X-sprintN
git push -u origin release/vX.X-sprintN
```

## Durante release

- No agregar features nuevas.
- Solo aceptar fixes, docs de entrega y ajustes necesarios.
- Correr verificaciones backend y frontend.
- Revisar preview/deploy.
- Confirmar que README y docs reflejen el estado real.

## Checklist de entrega

- [ ] `develop` actualizado.
- [ ] CI backend en verde.
- [ ] CI frontend en verde.
- [ ] Frontend build exitoso.
- [ ] Endpoints documentados.
- [ ] Migraciones documentadas.
- [ ] Workflows documentados.
- [ ] Variables nuevas documentadas.
- [ ] Screenshots/demo revisados si aplica.
- [ ] PR aprobado por responsables.

## Merge a main

El PR de release hacia `main` debe incluir:

- Resumen de cambios.
- Issues incluidos.
- Evidencia de pruebas.
- Notas de despliegue.
- Riesgos conocidos.

Despues del merge a `main`, reintegrar cambios a `develop` si hubo ajustes dentro de release.

## Hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/nombre-del-fix
```

Reglas:

- Debe ser pequeno.
- Debe explicar urgencia.
- Debe pasar CI.
- Debe mergearse a `main` y despues a `develop`.
