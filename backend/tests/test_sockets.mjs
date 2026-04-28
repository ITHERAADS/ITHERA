import { io } from 'socket.io-client';
import axios from 'axios';

// Cambia estos datos si quieres usar otros usuarios
const USER_A = { email: 'said_test_a@ithera.com', password: 'TestPassword123!', nombre: 'Said A' };
const USER_B = { email: 'said_test_b@ithera.com', password: 'TestPassword123!', nombre: 'Said B' };
const TRIP_ID = '1'; 
const PROPUESTA_ID = '1';

async function setupUser(user) {
  try {
    // Intentar register (si ya existe, fallará, lo cual está bien)
    try {
      await axios.post('http://localhost:3001/api/auth/test-signup', user);
      console.log(`[AUTH] Registrado: ${user.email}`);
    } catch (e) {
      if (e.response?.status !== 400) console.log(`[AUTH] Nota en register:`, e.response?.data?.error || e.message);
    }

    // Hacer login
    const loginRes = await axios.post('http://localhost:3001/api/auth/test-login', user);
    const token = loginRes.data.session.access_token;
    
    // Sync user (importante para que esté en la DB local)
    await axios.post('http://localhost:3001/api/auth/sync-user', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    return token;
  } catch (error) {
    console.error(`Error configurando ${user.email}:`, error.response?.data || error.message);
    process.exit(1);
  }
}

async function runTest() {
  console.log('--- SETUP AUTH ---');
  const tokenA = await setupUser(USER_A);
  const tokenB = await setupUser(USER_B);
  console.log('--- TOKENS OBTENIDOS ---');

  // Conectar 2 sockets
  const socketA = io('http://localhost:3001', { auth: { token: `Bearer ${tokenA}` } });
  const socketB = io('http://localhost:3001', { auth: { token: `Bearer ${tokenB}` } });

  socketA.on('connect', () => console.log('🟢 Socket A conectado'));
  socketB.on('connect', () => console.log('🟢 Socket B conectado'));

  // Listeners A
  socketA.on('lock_acquired', (data) => console.log('✅ A: Lock adquirido!', data));
  socketA.on('lock_error', (data) => console.log('❌ A: Error de lock:', data));
  socketA.on('item_locked', (data) => console.log('🔒 A: Otro usuario bloqueó:', data));
  socketA.on('item_unlocked', (data) => console.log('🔓 A: Ítem liberado:', data));
  socketA.on('error_event', (data) => console.error('A: Error Event:', data));

  // Listeners B
  socketB.on('lock_acquired', (data) => console.log('✅ B: Lock adquirido!', data));
  socketB.on('lock_error', (data) => console.log('❌ B: Error de lock:', data));
  socketB.on('item_locked', (data) => console.log('🔒 B: Otro usuario bloqueó:', data));
  socketB.on('item_unlocked', (data) => console.log('🔓 B: Ítem liberado:', data));
  socketB.on('error_event', (data) => console.error('B: Error Event:', data));

  const wait = (ms) => new Promise(res => setTimeout(res, ms));

  await wait(1000);

  console.log('\n--- PRUEBA 1: JOIN ROOM ---');
  socketA.emit('join_room', { tripId: TRIP_ID });
  socketB.emit('join_room', { tripId: TRIP_ID });
  await wait(1000);

  console.log('\n--- PRUEBA 2: USUARIO A BLOQUEA ---');
  socketA.emit('item_lock', { propuestaId: PROPUESTA_ID, tripId: TRIP_ID });
  await wait(1000);

  console.log('\n--- PRUEBA 3: USUARIO B INTENTA BLOQUEAR (Debe fallar) ---');
  socketB.emit('item_lock', { propuestaId: PROPUESTA_ID, tripId: TRIP_ID });
  await wait(1000);

  console.log('\n--- PRUEBA 4: USUARIO A DESBLOQUEA ---');
  socketA.emit('item_unlock', { propuestaId: PROPUESTA_ID, tripId: TRIP_ID });
  await wait(1000);

  console.log('\n--- PRUEBA 5: USUARIO B BLOQUEA AHORA (Debe pasar) ---');
  socketB.emit('item_lock', { propuestaId: PROPUESTA_ID, tripId: TRIP_ID });
  await wait(1000);

  console.log('\n--- PRUEBA 6: USUARIO B SE DESCONECTA (Cierra pestaña) ---');
  socketB.disconnect();
  // El auto-cleanup de desconexión debería emitir "item_unlocked" a todos los de la room (A)
  await wait(1500);

  console.log('\n--- PRUEBAS TERMINADAS ---');
  socketA.disconnect();
  process.exit(0);
}

runTest();
