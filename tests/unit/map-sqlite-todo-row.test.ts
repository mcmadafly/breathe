import { describe, expect, it } from 'vitest';

import { mapSqliteTodoRow } from '@/lib/db/todo-row-mapper';

describe('mapSqliteTodoRow', () => {
  it('maps snake_case columns', () => {
    const row = mapSqliteTodoRow({
      id: '1',
      user_id: 'u',
      title: 'T',
      body: 'B',
      category: 'work',
      list_id: 'L1',
      position: 2,
      done: 0,
      created_at: 1700000000000,
      updated_at: 1700000000001,
    });
    expect(row).toMatchObject({
      id: '1',
      userId: 'u',
      title: 'T',
      body: 'B',
      listId: 'L1',
      position: 2,
      done: false,
    });
    expect(row.createdAt.getTime()).toBe(1700000000000);
  });

  it('maps camelCase columns', () => {
    const row = mapSqliteTodoRow({
      id: '1',
      userId: 'u',
      title: 'T',
      body: '',
      listId: null,
      position: 0,
      done: true,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    });
    expect(row.userId).toBe('u');
    expect(row.listId).toBeNull();
    expect(row.done).toBe(true);
  });

  it('defaults missing optionals', () => {
    const row = mapSqliteTodoRow({
      id: '1',
      user_id: 'u',
      title: 'T',
      done: 1,
      created_at: 1,
      updated_at: 1,
    });
    expect(row.body).toBe('');
    expect(row.category).toBe('work');
    expect(row.listId).toBeNull();
    expect(row.position).toBe(0);
  });
});
