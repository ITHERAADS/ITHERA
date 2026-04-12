# 📝 Casos de Uso — Ithera

Esta carpeta contiene los documentos detallados de casos de uso por módulo.

## Archivos

| Archivo | Módulos | Autor |
|---------|---------|-------|
| `CU_Modulos1y2.docx` | M1 Autenticación · M2 Gestión de Grupo | Gabriel Hernández Flores |
| `CU_Modulos3y4.docx` | M3 Itinerario · M4 APIs Externas | Gabriel Hernández Flores |
| `CU_Modulos5y6.docx` | M5 Sincronización · M6 Presupuesto | Demian Romero Bautista |
| `CU_Modulo7.docx` | M7 Notificaciones e Historial | Por asignar |

## Formato de cada CU

Cada caso de uso sigue la estructura:

- **Título** con ID (`CU-X.Y Nombre`)
- **Resumen** — descripción narrativa breve
- **Descripción** — tabla de atributos:
  - Autor, Actor, Propósito
  - Entradas, Salidas
  - Precondiciones, Postcondiciones
  - Errores, Tipo, Fuente (RF relacionado)
- **Observaciones** — reglas de negocio y notas de implementación

## Convención de IDs

```
CU-1.1  Iniciar Sesión              (M1)
CU-2.1  Detectar y reanudar viaje   (M2)
CU-3.1  Ver itinerario general      (M3)
CU-4.1  Buscar vuelos               (M4)
CU-5.1  Iniciar conexión WebSocket  (M5)
CU-6.1  Modificar presupuesto base  (M6)
CU-7.1  Visualizar notificaciones   (M7)
```
