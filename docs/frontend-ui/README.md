# Frontend UI - ITHERA

Esta guia resume convenciones visuales y de organizacion para la interfaz.

## Estructura UI

| Carpeta | Uso |
| --- | --- |
| `frontend/src/pages` | Vistas completas por ruta. |
| `frontend/src/components` | Componentes reutilizables por dominio. |
| `frontend/src/components/ui` | Primitivos visuales genericos. |
| `frontend/src/components/layout` | Layouts, navbars, sidebars y paneles. |
| `frontend/src/assets` | Logos, imagenes y recursos visuales. |
| `frontend/src/styles` | Entradas de estilos. |

## Rutas

Las rutas viven en:

```text
frontend/src/App.tsx
```

Al agregar una pagina:

1. Crear carpeta en `frontend/src/pages/<Nombre>`.
2. Crear `<Nombre>Page.tsx`.
3. Exportar desde `index.ts` si aplica.
4. Registrar ruta en `App.tsx`.
5. Proteger con `ProtectedRoute` si requiere sesion.

## Componentes

- Mantener componentes de pagina como orquestadores.
- Mover piezas reutilizables a `components`.
- Usar `components/ui` solo para primitivas genericas.
- Tipar props cuando el componente cruza mas de una pagina.
- Evitar duplicar logica de llamadas API dentro de componentes visuales.

## Servicios y estado

- Llamadas HTTP viven en `frontend/src/services`.
- Estado global vive en `frontend/src/context`.
- Hooks compartidos viven en `frontend/src/hooks`.
- Tipos compartidos viven en `frontend/src/types`.

## Checklist UI

- [ ] La vista funciona en desktop y mobile.
- [ ] Estados de carga, error y vacio estan cubiertos.
- [ ] Los botones y formularios tienen textos claros.
- [ ] No hay texto que se desborde.
- [ ] Los cambios visuales incluyen screenshot en PR.
- [ ] Si se agrega ruta, se documenta en `frontend/README.md`.
