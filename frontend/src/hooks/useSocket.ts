import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSyncQueue } from './useSyncQueue';

export const useSocket = (token: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { enqueue, getQueue, clearItem, queueSize } = useSyncQueue();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    const newSocket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', async () => {
      setIsConnected(true);
      
      const queue = await getQueue();
      if (queue.length > 0) {
        console.log(`[Sync] Vaciando ${queue.length} operaciones diferidas...`);
        for (const item of queue) {
          if (item.id) {
            // Emite con un timeout y ACK si el backend responde (si no responde y hace timeout, no borramos el item para reintentar)
            newSocket.timeout(5000).emit(item.action, item.payload, (err: unknown) => {
              // Si no recibimos ack/timeout, asumimos que se procesó (algunos eventos backend Ithera no mandan ack explícito, 
              // pero la sugerencia indica limpiar post confirmación. En este mock, si el socket al menos no cae, limpiamos).
              if (!err) {
                 clearItem(item.id!);
              } else {
                 console.warn(`[Sync] Operación ${item.action} sin ack, se reintentará en el próximo connect`);
              }
            });
            // Hacemos el clearItem de todos modos si tu backend no está emitiendo callbacks para omitir timeout errors: 
            // await clearItem(item.id);
            // Sin embargo, usaremos timeout por la review. Asumiendo Backend sí puede responder ack, 
            // de lo contrario, podemos simplificar. Copilot Review sugirió "acks/timeout".
          }
        }
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // eslint-disable-next-line
    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, [token, getQueue, clearItem]);

  const emitCancellable = useCallback(async (action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL', payload: unknown) => {
    if (isConnected && socketRef.current) {
      // Directamente enviamos el payload que recibe del cliente (con el updatedAt ya enriquecido en el UI)
      socketRef.current.emit(action, payload);
    } else {
      console.warn(`[Offline] Difiriendo acción: ${action}`);
      await enqueue(action, payload);
    }
  }, [isConnected, enqueue]);

  return { socket, isConnected, emitCancellable, missedEvents: queueSize };
};
