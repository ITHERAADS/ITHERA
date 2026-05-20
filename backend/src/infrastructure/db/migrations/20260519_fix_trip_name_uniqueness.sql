-- ITHERA · Fix ERR-23-005
-- Evita viajes activos/borrador con el mismo nombre normalizado para el mismo creador.
-- Antes de ejecutar, resuelve manualmente duplicados existentes si el índice falla.

CREATE UNIQUE INDEX IF NOT EXISTS ux_grupos_viaje_creador_nombre_activo
ON public.grupos_viaje (creado_por, lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')))
WHERE estado IN ('activo', 'borrador');
