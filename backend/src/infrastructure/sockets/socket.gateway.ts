import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { lockPropuesta, unlockPropuesta, liberarBloqueosTTL } from '../../domain/proposals/proposals.service';

let io: SocketServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.id}`);

    // El frontend se une al "canal" de su viaje
    socket.on('unirse_viaje', (id_viaje: number) => {
      socket.join(`viaje_${id_viaje}`);
      console.log(`[Socket] ${socket.id} se unió al canal viaje_${id_viaje}`);
    });

    // Cuando alguien hace clic en "Editar"
    socket.on('bloquear_propuesta', async ({ id_propuesta, id_usuario, id_viaje }) => {
      try {
        await lockPropuesta({ id_propuesta, id_usuario });

        // Notifica a TODOS los del viaje
        io.to(`viaje_${id_viaje}`).emit('propuesta_bloqueada', {
          id_propuesta,
          id_usuario,
          accion: 'BLOQUEADO',
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        socket.emit('error_bloqueo', { mensaje: err.message });
      }
    });

    // Cuando alguien termina de editar
    socket.on('liberar_propuesta', async ({ id_propuesta, id_usuario, id_viaje }) => {
      await unlockPropuesta(id_propuesta, id_usuario);

      io.to(`viaje_${id_viaje}`).emit('propuesta_bloqueada', {
        id_propuesta,
        id_usuario: null,
        accion: 'LIBERADO',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}`);
    });
  });

  // TTL: revisar cada minuto si hay bloqueos expirados
  setInterval(async () => {
    const liberadas = await liberarBloqueosTTL();
    for (const propuesta of liberadas) {
      io.to(`viaje_${propuesta.id_viaje}`).emit('propuesta_bloqueada', {
        id_propuesta: propuesta.id_propuesta,
        id_usuario: null,
        accion: 'LIBERADO',
        timestamp: new Date().toISOString(),
      });
    }
  }, 60_000);
};

export const getIO = () => io;