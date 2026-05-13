import crypto from 'crypto';
import { supabase } from '../../infrastructure/db/supabase.client';

interface ExportGroup {
  nombre: string;
  destino: string | null;
  destino_formatted_address: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface ExportActivity {
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string | null;
  ubicacion: string | null;
}

interface ItineraryExportData {
  group: ExportGroup;
  activities: ExportActivity[];
}

const escapeHtml = (v: string): string =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const validateConsolidated = async (grupoId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('grupos_viaje')
    .select('estado')
    .eq('id', grupoId)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  }

  if (!['cerrado', 'finalizado'].includes(data.estado)) {
    throw Object.assign(
      new Error(
        'El itinerario aún no está en estado consolidado. Cierra el viaje o bloquea todas las actividades antes de exportar.'
      ),
      { statusCode: 422, code: 'ERR-75-001' }
    );
  }
};

export const getItineraryData = async (
  grupoId: string
): Promise<ItineraryExportData> => {
  const { data: group, error: groupError } = await supabase
    .from('grupos_viaje')
    .select('nombre, destino, destino_formatted_address, fecha_inicio, fecha_fin')
    .eq('id', grupoId)
    .single();

  if (groupError || !group) {
    throw Object.assign(new Error('Grupo no encontrado'), { statusCode: 404 });
  }

  const { data: itinerary, error: itineraryError } = await supabase
    .from('itinerarios')
    .select('id_itinerario')
    .eq('grupo_id', grupoId)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (itineraryError) throw new Error(itineraryError.message);

  let activities: ExportActivity[] = [];
  if (itinerary) {
    const { data: acts, error: actsError } = await supabase
      .from('actividades')
      .select('titulo, descripcion, fecha_inicio, ubicacion')
      .eq('itinerario_id', itinerary.id_itinerario)
      .eq('estado', 'confirmada')
      .order('fecha_inicio', { ascending: true });

    if (actsError) throw new Error(actsError.message);
    activities = (acts ?? []) as ExportActivity[];
  }

  return { group: group as ExportGroup, activities };
};

export const generateHTMLForPDF = (data: ItineraryExportData): string => {
  const { group, activities } = data;

  const generatedAt = new Date().toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dayMap = new Map<string, ExportActivity[]>();
  for (const act of activities) {
    const dayKey = act.fecha_inicio
      ? new Date(act.fecha_inicio).toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Sin fecha';
    const existing = dayMap.get(dayKey) ?? [];
    existing.push(act);
    dayMap.set(dayKey, existing);
  }

  let dayNum = 1;
  const sectionsHtml = [...dayMap.entries()]
    .map(([dayLabel, dayActs]) => {
      const items = dayActs
        .map(
          (act, idx) => `
          <article class="activity-card">
            <div class="activity-index">${idx + 1}</div>
            <div class="activity-content">
              <h4>${escapeHtml(act.titulo)}</h4>
              <p class="desc">${escapeHtml(act.descripcion ?? 'Sin descripción')}</p>
              <div class="chips">
                ${
                  act.fecha_inicio
                    ? `<span>${escapeHtml(
                        new Date(act.fecha_inicio).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      )}</span>`
                    : '<span>Hora pendiente</span>'
                }
                ${act.ubicacion ? `<span>${escapeHtml(act.ubicacion)}</span>` : ''}
              </div>
            </div>
          </article>`
        )
        .join('');

      return `
        <section class="day-section">
          <div class="day-header">
            <h3>Día ${dayNum++}</h3>
            <span>${escapeHtml(dayLabel)}</span>
          </div>
          ${items}
        </section>`;
    })
    .join('');

  const tripName = escapeHtml(group.nombre ?? 'Itinerario');
  const tripDestination = escapeHtml(
    group.destino ?? group.destino_formatted_address ?? 'Destino pendiente'
  );

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Itinerario Confirmado - ${tripName}</title>
    <style>
      :root { --ink:#1E0A4E; --blue:#1E6FD9; --green:#35C56A; --lav:#F6F3FF; --paper:#fff; }
      * { box-sizing: border-box; }
      body { margin:0; font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif; color:#1f2937; background:linear-gradient(145deg,#f3f0ff 0%,#eef4ff 100%); padding:28px; }
      .sheet { max-width:900px; margin:0 auto; background:var(--paper); border:1px solid #e5e7eb; border-radius:18px; overflow:hidden; box-shadow:0 16px 36px rgba(30,10,78,.12); }
      .hero { background:linear-gradient(110deg,var(--ink),#3A1B7A); color:#fff; padding:26px 28px; }
      .hero h1 { margin:0; font-size:28px; line-height:1.1; }
      .hero p { margin:8px 0 0; opacity:.88; font-size:14px; }
      .meta { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
      .meta span { background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25); padding:6px 10px; border-radius:999px; font-size:12px; }
      .content { padding:20px 22px 26px; }
      .day-section + .day-section { margin-top:16px; }
      .day-header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; border-bottom:1px dashed #dbe3f2; padding-bottom:8px; }
      .day-header h3 { margin:0; color:var(--ink); font-size:18px; }
      .day-header span { color:#64748b; font-size:13px; font-weight:600; }
      .activity-card { display:flex; gap:12px; background:#fafcff; border:1px solid #d9e4fb; border-radius:14px; padding:12px; margin-bottom:10px; }
      .activity-index { width:28px; height:28px; border-radius:999px; background:var(--blue); color:#fff; display:grid; place-items:center; font-size:13px; font-weight:700; flex-shrink:0; }
      .activity-content h4 { margin:0; color:var(--ink); font-size:16px; }
      .activity-content .desc { margin:5px 0 0; color:#475569; font-size:13px; line-height:1.5; }
      .chips { display:flex; gap:7px; flex-wrap:wrap; margin-top:9px; }
      .chips span { background:var(--lav); border:1px solid #dfd4ff; color:#3f2a83; font-size:11px; padding:5px 8px; border-radius:999px; }
      .footer { border-top:1px solid #e5e7eb; padding:14px 22px; color:#64748b; font-size:12px; display:flex; justify-content:space-between; align-items:center; }
      .dot { width:8px; height:8px; border-radius:999px; background:var(--green); display:inline-block; margin-right:6px; }
      @media print { body { background:#fff; padding:0; } .sheet { border:0; border-radius:0; box-shadow:none; max-width:100%; } @page { size:A4; margin:12mm; } }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="hero">
        <h1>Itinerario confirmado</h1>
        <p>${tripName} · ${tripDestination}</p>
        <div class="meta">
          <span>${dayMap.size} día(s) con actividades confirmadas</span>
          <span>${activities.length} actividad(es) confirmada(s)</span>
        </div>
      </header>
      <section class="content">${
        sectionsHtml ||
        '<p style="color:#7A8799;text-align:center;padding:24px;">Sin actividades confirmadas para exportar.</p>'
      }</section>
      <footer class="footer">
        <span><i class="dot"></i>Generado por ITHERA</span>
        <span>${escapeHtml(generatedAt)}</span>
      </footer>
    </main>
  </body>
</html>`;
};

export const createShareLink = async (
  grupoId: string,
  usuarioId: string
): Promise<string> => {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('export_share_links')
    .insert({ grupo_id: grupoId, usuario_id: usuarioId, token, expires_at: expiresAt });

  if (error) {
    throw Object.assign(
      new Error('No se pudo generar el enlace de compartir.'),
      { statusCode: 500, code: 'ERR-75-002' }
    );
  }

  return token;
};

export const getShareLink = async (grupoId: string): Promise<string | null> => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('export_share_links')
    .select('token')
    .eq('grupo_id', grupoId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { token: string } | null)?.token ?? null;
};
