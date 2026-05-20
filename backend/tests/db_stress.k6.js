import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * ====================================================================
 * PRUEBA DE ESTRÉS PARA ENDPOINTS DE BASE DE DATOS (ITHERA BACKEND)
 * ====================================================================
 * 
 * Este script de k6 está diseñado específicamente para estresar y evaluar
 * el rendimiento de los endpoints del backend que realizan consultas directas
 * a Supabase (ej. conteos, búsquedas simples y joins de historial).
 * 
 * 🚀 CÓMO EJECUTARLO:
 * -------------------
 * 1. Prueba básica (Endpoint público de consulta a DB):
 *    k6 run backend/tests/db_stress.k6.js
 * 
 * 2. Prueba con un Código de Invitación real de tu base de datos:
 *    k6 run -e INVITE_CODE=tu_codigo_real backend/tests/db_stress.k6.js
 * 
 * 3. Prueba estresando consultas autenticadas complejas (ej. Mi Historial):
 *    k6 run -e TOKEN=tu_token_jwt_aqui backend/tests/db_stress.k6.js
 * 
 * 📊 FASES DE CARGA (Rampa):
 * --------------------------
 * - 15s: Subir suavemente de 0 a 50 usuarios concurrentes.
 * - 30s: Mantener la carga constante de 50 usuarios atacando la DB.
 * - 15s: Bajar la carga hasta 0 usuarios.
 */

export const options = {
  stages: [
    { duration: '15s', target: 50 }, // Subida
    { duration: '30s', target: 50 }, // Mantenimiento
    { duration: '15s', target: 0 },  // Bajada
  ],
  thresholds: {
    // El 95% de las peticiones deben responder en menos de 500ms
    http_req_duration: ['p(95)<500'],
    // Tasa de error menor al 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const INVITE_CODE = __ENV.INVITE_CODE || 'TESTCODE'; // Reemplazar con uno válido al ejecutar si se desea
const TOKEN = __ENV.TOKEN || '';

export default function () {
  // ─── ESCENARIO 1: Endpoint de DB Público (Preview de Invitación) ───
  // Realiza un .select() a 'grupos_viaje' y cuenta los miembros en 'grupo_miembros'
  const previewRes = http.get(`${BASE_URL}/api/groups/invite-preview/${INVITE_CODE}`);
  
  check(previewRes, {
    'GET invite-preview responde rápido o con status esperado (200/404)': (r) => r.status === 200 || r.status === 404,
  });

  // ─── ESCENARIO 2: Endpoints Protegidos de DB (Si se provee TOKEN) ───
  if (TOKEN) {
    const params = {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    // Consultar el historial de viajes (hace joins complejos en Supabase)
    const historyRes = http.get(`${BASE_URL}/api/groups/my-history`, params);
    check(historyRes, {
      'GET my-history status es 200': (r) => r.status === 200,
    });

    // Consultar notificaciones del usuario (otra tabla frecuente)
    const notifRes = http.get(`${BASE_URL}/api/notifications`, params);
    check(notifRes, {
      'GET notificaciones status es 200': (r) => r.status === 200,
    });
  }

  // Pausa de 1 segundo para simular el comportamiento de un usuario real
  sleep(1);
}
