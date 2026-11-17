import { Injectable } from '@angular/core';
import { LiveScore } from './live-score.service';

export interface QueuedDelivery {
  commandId: string;
  inningsId: string;
  createdAt: number;
  syncStatus?: 'PENDING' | 'BLOCKED';
  payload: {
    inningsId: string;
    overNumber: number;
    ballNumber: number;
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
    batRuns: number;
    extraRuns: number;
    extraType: string | null;
    wicketType: string | null;
    dismissedPlayerId?: string | null;
    newBatterId?: string | null;
    legalDelivery?: boolean;
  };
}

const DB_NAME = 'cricpulse-offline-scoring';
const DB_VERSION = 2;
const QUEUE_STORE = 'pending-deliveries';
const SNAPSHOT_STORE = 'innings-snapshots';
const SESSION_STORE = 'match-sessions';

@Injectable({ providedIn: 'root' })
export class OfflineScoringStore {
  private database?: Promise<IDBDatabase>;

  isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  async saveSnapshot(score: LiveScore): Promise<void> {
    const db = await this.open();
    await this.request(
      db.transaction(SNAPSHOT_STORE, 'readwrite').objectStore(SNAPSHOT_STORE).put({
        inningsId: score.inningsId,
        savedAt: Date.now(),
        score,
      }),
    );
  }

  async loadSnapshot(inningsId: string): Promise<LiveScore | null> {
    const db = await this.open();
    const value = await this.request<any>(
      db.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(inningsId),
    );
    return value?.score ?? null;
  }

  async enqueue(command: QueuedDelivery): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const allRequest = store.getAll();
      allRequest.onsuccess = () => {
        const all = allRequest.result as QueuedDelivery[];
        const lastCreatedAt = all
          .filter((item) => item.inningsId === command.inningsId)
          .reduce((latest, item) => Math.max(latest, item.createdAt), 0);
        const write = store.add({
          ...command,
          createdAt: Math.max(command.createdAt, lastCreatedAt + 1),
        });
        write.onsuccess = () => resolve();
        write.onerror = () => reject(write.error ?? new Error('Could not queue offline delivery.'));
      };
      allRequest.onerror = () =>
        reject(allRequest.error ?? new Error('Could not read offline queue.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Offline queue transaction was aborted.'));
    });
  }

  async saveSession(matchId: string, session: unknown): Promise<void> {
    const db = await this.open();
    await this.request(
      db
        .transaction(SESSION_STORE, 'readwrite')
        .objectStore(SESSION_STORE)
        .put({ matchId, session }),
    );
  }

  async loadSession<T>(matchId: string): Promise<T | null> {
    const db = await this.open();
    const value = await this.request<any>(
      db.transaction(SESSION_STORE, 'readonly').objectStore(SESSION_STORE).get(matchId),
    );
    return value?.session ?? null;
  }

  async list(inningsId: string): Promise<QueuedDelivery[]> {
    const db = await this.open();
    const values = await this.request<QueuedDelivery[]>(
      db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll(),
    );
    return values
      .filter((item) => item.inningsId === inningsId)
      .sort((a, b) => a.createdAt - b.createdAt || a.commandId.localeCompare(b.commandId));
  }

  async remove(commandId: string): Promise<void> {
    const db = await this.open();
    await this.request(
      db.transaction(QUEUE_STORE, 'readwrite').objectStore(QUEUE_STORE).delete(commandId),
    );
  }

  async markInningsQueueBlocked(inningsId: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        for (const item of request.result as QueuedDelivery[]) {
          if (item.inningsId === inningsId) {
            store.put({ ...item, syncStatus: 'BLOCKED' });
          }
        }
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Could not inspect offline queue.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not block offline queue.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Blocking offline queue was aborted.'));
    });
  }

  async markInningsQueuePending(inningsId: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(QUEUE_STORE, 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        for (const item of request.result as QueuedDelivery[]) {
          if (item.inningsId === inningsId) {
            store.put({ ...item, syncStatus: 'PENDING' });
          }
        }
      };
      request.onerror = () => reject(request.error ?? new Error('Could not inspect offline queue.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not resume offline queue.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Resuming offline queue was aborted.'));
    });
  }

  async count(inningsId: string): Promise<number> {
    return (await this.list(inningsId)).length;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.isSupported())
      return Promise.reject(new Error('This browser does not support durable offline storage.'));
    if (!this.database) {
      this.database = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(QUEUE_STORE)) {
            db.createObjectStore(QUEUE_STORE, { keyPath: 'commandId' });
          }
          if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
            db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'inningsId' });
          }
          if (!db.objectStoreNames.contains(SESSION_STORE)) {
            db.createObjectStore(SESSION_STORE, { keyPath: 'matchId' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error('Could not open offline scoring storage.'));
        request.onblocked = () =>
          reject(new Error('Offline scoring storage upgrade is blocked by another tab.'));
      });
    }
    return this.database;
  }

  private request<T = unknown>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Offline scoring storage operation failed.'));
    });
  }
}
