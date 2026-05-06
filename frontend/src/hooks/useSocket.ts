import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSyncQueue } from './useSyncQueue';

type QueueItem = Awaited<ReturnType<ReturnType<typeof useSyncQueue>['getQueue']>>[number];

type QueueHandlers = {
  getQueue: () => Promise<QueueItem[]>;
  clearItem: (id: number) => Promise<void>;
};

type SocketSnapshot = {
  socket: Socket | null;
  isConnected: boolean;
};

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let sharedConnected = false;
let activeConsumers = 0;
let queueHandlers: QueueHandlers | null = null;

let snapshot: SocketSnapshot = {
  socket: null,
  isConnected: false,
};

const listeners = new Set<() => void>();

const updateSnapshot = () => {
  snapshot = {
    socket: sharedSocket,
    isConnected: sharedConnected,
  };

  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;

const getServerSnapshot = () => ({
  socket: null,
  isConnected: false,
});

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

const flushOfflineQueue = async (socket: Socket) => {
  if (!queueHandlers) return;

  const queue = await queueHandlers.getQueue();
  if (queue.length === 0) return;

  console.log(`[Sync] Vaciando ${queue.length} operaciones diferidas...`);

  for (const item of queue) {
    if (!item.id) continue;

    socket.timeout(5000).emit(item.action, item.payload, async (err: unknown) => {
      if (!err) {
        await queueHandlers?.clearItem(item.id!);
        return;
      }

      console.warn(`[Sync] Operación ${item.action} sin ack, se reintentará en el próximo connect`);
    });
  }
};

const disconnectSharedSocket = () => {
  if (!sharedSocket) return;

  sharedSocket.removeAllListeners();
  sharedSocket.disconnect();

  sharedSocket = null;
  sharedToken = null;
  sharedConnected = false;

  updateSnapshot();
};

const ensureSharedSocket = (token: string, handlers: QueueHandlers): Socket => {
  queueHandlers = handlers;

  if (sharedSocket && sharedToken === token) {
    return sharedSocket;
  }

  disconnectSharedSocket();

  const socket = io(getSocketUrl(), {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    sharedConnected = true;
    updateSnapshot();
    void flushOfflineQueue(socket);
  });

  socket.on('disconnect', () => {
    sharedConnected = false;
    updateSnapshot();
  });

  socket.on('connect_error', (error) => {
    sharedConnected = false;
    updateSnapshot();
    console.warn('[socket.io] Error de conexión:', error.message);
  });

  sharedSocket = socket;
  sharedToken = token;
  sharedConnected = socket.connected;

  updateSnapshot();

  return socket;
};

export const useSocket = (token: string | null) => {
  const { enqueue, getQueue, clearItem, queueSize } = useSyncQueue();
  const socketState = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      socketRef.current = null;
      return;
    }

    activeConsumers += 1;

    const nextSocket = ensureSharedSocket(token, { getQueue, clearItem });
    socketRef.current = nextSocket;

    return () => {
      activeConsumers = Math.max(0, activeConsumers - 1);

      if (activeConsumers === 0) {
        disconnectSharedSocket();
      }
    };
  }, [token, getQueue, clearItem]);

  useEffect(() => {
    socketRef.current = token ? socketState.socket : null;
  }, [token, socketState.socket]);

  const emitCancellable = useCallback(
    async (action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL', payload: unknown) => {
      if (sharedConnected && socketRef.current) {
        socketRef.current.emit(action, payload);
        return;
      }

      console.warn(`[Offline] Difiriendo acción: ${action}`);
      await enqueue(action, payload);
    },
    [enqueue],
  );

  return {
    socket: token ? socketState.socket : null,
    isConnected: token ? socketState.isConnected : false,
    emitCancellable,
    missedEvents: queueSize,
  };
};