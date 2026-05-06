/**
 * In-process pub/sub so one user's sessions (tabs, PWA, mobile browser) see todo
 * changes immediately when they share the same Node process (e.g. local dev or a
 * single container). It does not cross load-balanced instances or serverless
 * isolates; the app also polls the database on an interval for those cases.
 */

export type TodoWire = {
  id: string;
  userId: string;
  title: string;
  body: string;
  listId: string | null;
  position: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TodoSyncMessage =
  | { type: 'sync:ready' }
  | { type: 'todo:created'; todo: TodoWire }
  | { type: 'todo:updated'; todo: TodoWire }
  | { type: 'todo:deleted'; id: string }
  | { type: 'todos:reordered' };

type Listener = (msg: TodoSyncMessage) => void;

const channels = new Map<string, Set<Listener>>();

export function toTodoWire(row: {
  id: string;
  userId: string;
  title: string;
  body: string;
  listId: string | null;
  position: number;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TodoWire {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    listId: row.listId,
    position: row.position,
    done: row.done,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const todoSync = {
  subscribe(userId: string, listener: Listener): () => void {
    let set = channels.get(userId);
    if (!set) {
      set = new Set();
      channels.set(userId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) channels.delete(userId);
    };
  },

  publish(userId: string, msg: TodoSyncMessage): void {
    const set = channels.get(userId);
    if (!set) return;
    /**
     * Call listeners synchronously from the mutating request’s stack (before it finishes).
     * Queueing with `queueMicrotask` runs after that request completes, which triggers Workers /
     * Vite’s “promise resolved from a different request context” warning when `enqueue` writes
     * to an SSE stream opened by another request.
     */
    for (const l of Array.from(set)) {
      try {
        l(msg);
      } catch {
        /* listener failed; ignore */
      }
    }
  },
};
