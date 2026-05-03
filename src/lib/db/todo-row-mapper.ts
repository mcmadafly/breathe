function pickCol(raw: Record<string, unknown>, snake: string, camel: string): unknown {
  if (Object.prototype.hasOwnProperty.call(raw, snake)) return raw[snake];
  if (Object.prototype.hasOwnProperty.call(raw, camel)) return raw[camel];
  return undefined;
}

function msToDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'bigint') return new Date(Number(v));
  if (typeof v === 'number' && !Number.isNaN(v)) return new Date(v);
  if (typeof v === 'string' && v !== '') return new Date(Number(v));
  return new Date(0);
}

export type TodoSqliteRow = {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  listId: string | null;
  position: number;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function mapSqliteTodoRow(raw: Record<string, unknown>): TodoSqliteRow {
  return {
    id: String(pickCol(raw, 'id', 'id') ?? ''),
    userId: String(pickCol(raw, 'user_id', 'userId') ?? ''),
    title: String(pickCol(raw, 'title', 'title') ?? ''),
    body: pickCol(raw, 'body', 'body') != null ? String(pickCol(raw, 'body', 'body')) : '',
    category: pickCol(raw, 'category', 'category') != null ? String(pickCol(raw, 'category', 'category')) : 'work',
    listId:
      pickCol(raw, 'list_id', 'listId') != null && pickCol(raw, 'list_id', 'listId') !== ''
        ? String(pickCol(raw, 'list_id', 'listId'))
        : null,
    position:
      typeof pickCol(raw, 'position', 'position') === 'number'
        ? (pickCol(raw, 'position', 'position') as number)
        : pickCol(raw, 'position', 'position') != null
          ? Number(pickCol(raw, 'position', 'position'))
          : 0,
    done:
      pickCol(raw, 'done', 'done') === true ||
      pickCol(raw, 'done', 'done') === 1 ||
      pickCol(raw, 'done', 'done') === '1',
    createdAt: msToDate(pickCol(raw, 'created_at', 'createdAt')),
    updatedAt: msToDate(pickCol(raw, 'updated_at', 'updatedAt')),
  };
}

/** PRAGMA / driver row shape varies; normalize to lowercase sqlite column names. */
export function pragmaNameCell(row: Record<string, unknown>): string {
  return String(pickCol(row, 'name', 'Name') ?? '');
}
