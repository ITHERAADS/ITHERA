-- Evita viajes activos duplicados con el mismo nombre para el mismo creador.
-- Usa el mismo criterio lógico aplicado por el backend: trim, espacios consecutivos normalizados y comparación case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS uq_grupos_viaje_creador_nombre_activo
ON public.grupos_viaje (
  creado_por,
  lower(regexp_replace(btrim(nombre), '\\s+', ' ', 'g'))
)
WHERE estado IN ('activo', 'borrador');
