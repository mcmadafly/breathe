import { describe, expect, it } from 'vitest';

import { sortTodoRows } from '@/lib/todo-sort';

describe('sortTodoRows', () => {
  const t0 = new Date('2024-01-01T00:00:00.000Z');
  const t1 = new Date('2024-01-02T00:00:00.000Z');

  it('orders by list position then todo position then createdAt', () => {
    const lists = [
      { id: 'L2', position: 1, createdAt: t0 },
      { id: 'L1', position: 0, createdAt: t0 },
    ];
    const rows = [
      { listId: 'L2', position: 0, createdAt: t1 },
      { listId: 'L1', position: 1, createdAt: t1 },
      { listId: 'L1', position: 0, createdAt: t1 },
    ];
    const sorted = sortTodoRows(rows, lists);
    expect(sorted.map((r) => `${r.listId}:${r.position}`)).toEqual([
      'L1:0',
      'L1:1',
      'L2:0',
    ]);
  });

  it('puts unknown listId last', () => {
    const lists = [{ id: 'L1', position: 0, createdAt: t0 }];
    const rows = [
      { listId: 'LX', position: 0, createdAt: t0 },
      { listId: 'L1', position: 0, createdAt: t0 },
    ];
    const sorted = sortTodoRows(rows, lists);
    expect(sorted[0]!.listId).toBe('L1');
    expect(sorted[1]!.listId).toBe('LX');
  });
});
