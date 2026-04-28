import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSyncQueue } from './useSyncQueue';

export const useSocket = (token: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { enqueue, getQueue, clearItem, queueSize } = useSyncQueue();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
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
            newSocket.emit(item.action, item.payload);
            await clearItem(item.id); 
          }
        }
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const emitCancellable = async (action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL', payload: any) => {
    if (isConnected && socketRef.current) {
      socketRef.current.emit(action, { ...payload, updatedAt: new Date().toISOString() });
    } else {
      console.warn(`[Offline] Difiriendo acción: ${action}`);
      await enqueue(action, payload);
    }
  };

  return { socket, isConnected, emitCancellable, missedEvents: queueSize };
};
