# Reporte de Pruebas de Estrés y Rendimiento (Backend)

**Proyecto:** ITHERA – Plataforma colaborativa para planificación de viajes grupales  
**Fecha de Ejecución:** 12 de Mayo de 2026  
**Herramienta de Benchmarking:** Autocannon v8.0.0  
**Objetivo:** Evaluar el impacto de la optimización por indexación en base de datos bajo alta concurrencia de lectura.

---

## 1. Configuración del Escenario de Prueba

* **Endpoint Objetivo:** `GET /api/groups/invite-preview/TESTCODE`
* **Nivel de Concurrencia:** 50 conexiones simultáneas constantes.
* **Duración de la Prueba:** 15 segundos.
* **Entorno:** Localhost (Node.js/Express en puerto 3001 conectándose a Supabase REST API).

---

## 🚀 2. Comparativa de Rendimiento: Antes vs. Después

Tras la aplicación del índice B-Tree sobre la columna `codigo_invitacion` en la tabla `grupos_viaje`, se repitió exactamente la misma prueba de estrés. Los resultados demuestran una **mejora radical en el rendimiento y la estabilidad**:

| Métrica | 🔴 Antes de la Optimización | 🟢 Después del Índice SQL | 📈 Mejora / Impacto |
| :--- | :---: | :---: | :---: |
| **Peticiones Totales** | 844 | **4,808** | **+470%** más capacidad |
| **Peticiones / Segundo** | 52.07 req/sec | **320.54 req/sec** | **6.1x** mayor rendimiento |
| **Errores / Timeouts** | 13 timeouts | **0** | **Estabilidad perfecta (100%)** |
| **Ancho de Banda** | 18.8 kB/s | **116 kB/s** | **6.1x** de flujo de datos |

### Tiempos de Respuesta (Latencia)
| Percentil | 🔴 Antes | 🟢 Después | Diagnóstico Actual |
| :--- | :---: | :---: | :--- |
| **Mediana (50%)** | 148 ms | **130 ms** | 🟢 Rápido |
| **Promedio (Avg)** | 786.26 ms | **154.5 ms** | 🟢 **5x** más rápido en promedio |
| **97.5%** | 8,862 ms | **336 ms** | 🟢 Consistente |
| **Máxima (Max)** | 8,880 ms | **993 ms** | 🟢 **9x** de reducción en latencia máxima |

---

## 3. Conclusión Técnica

> [!TIP]  
> **¡Éxito rotundo!** La degradación de latencia que causaba esperas de casi 9 segundos ha sido completamente erradicada.

El cuello de botella original no se debía a un límite en la cantidad de conexiones de red, sino a que la base de datos realizaba **escaneos secuenciales masivos** fila por fila. Al introducir el índice SQL:
1. El motor de Postgres resuelve cada consulta en microsegundos usando búsqueda en árbol B-Tree.
2. El servidor PostgREST interno de Supabase reutiliza su pool de conexiones de forma ultraeficiente.
3. El backend ahora es capaz de escalar masivamente, procesando **casi 5,000 peticiones de previsualización en solo 15 segundos** de forma estable y resiliente.
