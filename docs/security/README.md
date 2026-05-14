# Seguridad - ITHERA

Esta guia resume reglas de seguridad para desarrollo, revision y despliegue.

## Secrets

- No subir `.env`.
- No subir tokens ni credenciales.
- No exponer `SUPABASE_SECRET_KEY` en frontend.
- Las variables `VITE_` son publicas para el navegador.
- Secrets de deploy deben vivir en GitHub Actions o Vercel.

## Autenticacion

- El backend valida tokens Supabase con `requireAuth`.
- Los endpoints protegidos deben declarar `requireAuth`.
- Socket.IO valida token en handshake antes de registrar handlers.
- El backend debe mapear usuario Supabase a usuario local antes de operar datos internos.

## Autorizacion

Antes de modificar datos de grupo se debe validar:

- El usuario pertenece al grupo.
- El usuario tiene rol suficiente cuando el flujo lo requiere.
- El recurso pertenece al grupo indicado.

Casos sensibles:

- Cambiar roles.
- Eliminar integrantes.
- Aprobar/rechazar solicitudes.
- Editar presupuesto.
- Votar o comentar propuestas.
- Subir/eliminar documentos.

## CORS

El backend permite:

- `FRONTEND_URL`
- `http://localhost:5173`
- dominios `.vercel.app`

Si se agrega un dominio productivo nuevo, actualizar configuracion y documentacion.

## Uploads

Los uploads deben:

- Validar tipo MIME.
- Validar tamano maximo.
- Asociar archivo a usuario y grupo.
- Evitar exposicion publica no intencionada.

## Rate limit y abuso

El repo incluye `rateLimit.middleware.ts`. Si se activa o modifica:

- Documentar endpoints afectados.
- Definir limites por usuario/IP.
- Probar errores `429`.

## Checklist de revision

- [ ] No hay secrets en codigo o docs.
- [ ] Los endpoints sensibles usan `requireAuth`.
- [ ] Se valida pertenencia al grupo.
- [ ] Se valida rol cuando aplica.
- [ ] Los archivos subidos tienen limites.
- [ ] Las variables publicas del frontend no contienen secrets.
- [ ] Los errores no exponen informacion sensible.
