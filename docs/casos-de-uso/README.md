# Casos de Uso - ITHERA

Esta carpeta concentra la documentacion de casos de uso del sistema. Los casos de uso describen como interactuan los actores con ITHERA y sirven como puente entre requerimientos, diseno e implementacion.

## Modulos cubiertos

| Modulo | Nombre | Ejemplos de casos |
| --- | --- | --- |
| M1 | Autenticacion y acceso | Registro, login, recuperacion de contrasena, perfil. |
| M2 | Gestion de grupos y viajes | Crear grupo, invitar, unirse, administrar integrantes. |
| M3 | Itinerario colaborativo | Ver itinerario, crear actividades, editar agenda. |
| M4 | Busqueda y APIs externas | Buscar vuelos, hoteles, lugares, rutas y clima. |
| M5 | Sincronizacion en tiempo real | Chat, actualizaciones colaborativas, eventos Socket.IO. |
| M6 | Presupuesto y gastos | Registrar gastos, consultar saldos, liquidaciones. |
| M7 | Documentos y notificaciones | Boveda, notificaciones y preferencias. |

## Formato recomendado

Cada caso de uso debe incluir:

- ID: `CU-X.Y`.
- Nombre.
- Actor principal.
- Proposito.
- Precondiciones.
- Flujo principal.
- Flujos alternos.
- Errores o excepciones.
- Postcondiciones.
- Requerimientos relacionados.
- Pantallas o endpoints relacionados si ya existen.

## Convencion de IDs

```text
CU-1.1 Iniciar sesion
CU-1.2 Registrar cuenta
CU-2.1 Crear grupo de viaje
CU-2.2 Unirse a grupo por invitacion
CU-3.1 Consultar itinerario
CU-4.1 Buscar vuelos
CU-5.1 Enviar mensaje en chat
CU-6.1 Registrar gasto
CU-7.1 Consultar notificaciones
```

## Relacion con otros documentos

- Requerimientos: [../requerimientos/README.md](../requerimientos/README.md)
- Endpoints implementados: [../api/endpoints.md](../api/endpoints.md)
- Arquitectura: [../architecture/README.md](../architecture/README.md)

Si un caso de uso ya esta implementado, debe poder rastrearse hacia su ruta frontend, endpoint backend o servicio de dominio.
