import { openDB } from 'idb';
import type { DBSchema } from 'idb';
import { useCallback, useEffect, useState } from 'react';

interface ItheraDB extends DBSchema {
  syncQueue: {
    key: number;
    value: {
      id?: number;
      action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL';
      payload: unknown;
      timestamp: string;
    };
    indexes: { 'by-action': string };
  };
}

const dbPromise = openDB<ItheraDB>('ithera-offline-db', 1, {
  upgrade(db) {
    db.createObjectStore('syncQueue', {
      keyPath: 'id',
      autoIncrement: true,
    }).createIndex('by-action', 'action');
  },
});

export const useSyncQueue = () => {
  const [queueSize, setQueueSize] = useState(0);

  const getQueue = useCallback(async () => {
    const db = await dbPromise;
    return db.getAll('syncQueue');
  }, []);

  const loadQueueSize = useCallback(async () => {
    const db = await dbPromise;
    const count = await db.count('syncQueue');
    setQueueSize(count);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    loadQueueSize();
  }, [loadQueueSize]);

  const enqueue = useCallback(async (action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL', payload: unknown) => {
    const db = await dbPromise;
    await db.add('syncQueue', {
      action,
      payload,
      timestamp: new Date().toISOString(), // LWW timestamp clave
    });
    setQueueSize((prev) => prev + 1);
  }, []);

  const clearItem = useCallback(async (id: number) => {
    const db = await dbPromise;
    await db.delete('syncQueue', id);
    setQueueSize((prev) => Math.max(0, prev - 1));
  }, []);

  return { queueSize, enqueue, getQueue, clearItem, loadQueueSize };
};
