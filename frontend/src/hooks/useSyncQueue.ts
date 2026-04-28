import { openDB, DBSchema } from 'idb';
import { useState } from 'react';

interface ItheraDB extends DBSchema {
  syncQueue: {
    key: number;
    value: {
      id?: number;
      action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL';
      payload: any;
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

  const enqueue = async (action: 'UPDATE_PROPOSAL' | 'CREATE_COMMENT' | 'VOTE_PROPOSAL', payload: any) => {
    const db = await dbPromise;
    await db.add('syncQueue', {
      action,
      payload,
      timestamp: new Date().toISOString(), // LWW timestamp clave
    });
    setQueueSize((prev) => prev + 1);
  };

  const getQueue = async () => {
    const db = await dbPromise;
    return db.getAll('syncQueue');
  };

  const clearItem = async (id: number) => {
    const db = await dbPromise;
    await db.delete('syncQueue', id);
    setQueueSize((prev) => Math.max(0, prev - 1));
  };

  return { queueSize, enqueue, getQueue, clearItem };
};
