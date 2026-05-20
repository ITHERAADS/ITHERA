# Requerimientos - ITHERA

Esta carpeta documenta los requerimientos funcionales, no funcionales y reglas de negocio del sistema.

## Convencion de identificadores

| Prefijo | Significado | Ejemplo |
| --- | --- | --- |
| `RF-X.Y` | Requerimiento funcional del modulo X. | `RF-1.1 Autenticacion de usuarios` |
| `RNF-X.Y` | Requerimiento no funcional del modulo X. | `RNF-1.1 Proteccion de datos` |
| `RNB-X.Y` | Regla de negocio del modulo X. | `RNB-1.1 Validez del token` |
| `CU-X.Y` | Caso de uso del modulo X. | `CU-1.1 Iniciar sesion` |

## Modulos

| ID | Modulo |
| --- | --- |
| M1 | Autenticacion y acceso |
| M2 | Gestion de grupos y viajes |
| M3 | Itinerario colaborativo |
| M4 | Busqueda y APIs externas |
| M5 | Sincronizacion en tiempo real |
| M6 | Presupuesto y gastos |
| M7 | Documentos, notificaciones e historial |

## Criterios para mantener requerimientos

- Cada requerimiento debe ser claro, verificable y trazable.
- Si un requerimiento cambia, actualizar tambien los casos de uso relacionados.
- Si un requerimiento ya esta implementado, enlazarlo con endpoint, pantalla o modulo.
- No mezclar notas temporales con requerimientos oficiales.

## Relacion con otros documentos

- Casos de uso: [../casos-de-uso/README.md](../casos-de-uso/README.md)
- API implementada: [../api/endpoints.md](../api/endpoints.md)
- Arquitectura actual: [../architecture/README.md](../architecture/README.md)

Los documentos fuente exportados desde PDFs o herramientas externas deben revisarse antes de considerarse documentacion oficial.
