import { splitTodoContent } from '@/lib/todo-text';

type TodoRow = {
  id: string;
  userId: string;
  title: string;
  body: string;
  listId: string;
  position: number;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TodoListRow = {
  id: string;
  userId: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

const userId = 'test-user';

let lists: TodoListRow[] = [];
let todos: TodoRow[] = [];

function now() {
  return new Date();
}

function cloneTodo(t: TodoRow): TodoRow {
  return {
    ...t,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  };
}

function cloneList(l: TodoListRow): TodoListRow {
  return {
    ...l,
    createdAt: new Date(l.createdAt),
    updatedAt: new Date(l.updatedAt),
  };
}

/** Reset in-memory “server” state. Call from `beforeEach`. */
export function resetActionMocks() {
  const t = now();
  lists = [
    {
      id: 'list-default',
      userId,
      name: 'Inbox',
      position: 0,
      createdAt: t,
      updatedAt: t,
    },
  ];
  todos = [];
}

resetActionMocks();

/** Snapshot lists for `TodoBoard` `initialLists` after `resetActionMocks`. */
export function getTestLists(): TodoListRow[] {
  return lists.map(cloneList);
}

export const actions = {
  async listTodos() {
    return { data: todos.map(cloneTodo) as unknown[], error: undefined };
  },

  async listTodoLists() {
    return { data: lists.map(cloneList) as unknown[], error: undefined };
  },

  async createTodo(input: { title: string; listId?: string }) {
    const { title, body } = splitTodoContent(input.title);
    if (!title.trim()) {
      return { data: undefined, error: { message: 'Add some text for this task.' } };
    }
    const listId =
      input.listId && lists.some((l) => l.id === input.listId) ? input.listId : lists[0]!.id;
    const id = crypto.randomUUID();
    const ts = now();
    const row: TodoRow = {
      id,
      userId,
      title,
      body,
      listId,
      position: todos.filter((x) => x.listId === listId).length,
      done: false,
      createdAt: ts,
      updatedAt: ts,
    };
    todos.push(row);
    return { data: row as unknown, error: undefined };
  },

  async toggleTodo(input: { id: string; done: boolean }) {
    const row = todos.find((t) => t.id === input.id);
    if (!row) return { data: undefined, error: { message: 'not found' } };
    row.done = input.done;
    row.updatedAt = now();
    return { data: cloneTodo(row) as unknown, error: undefined };
  },

  async deleteTodo(input: { id: string }) {
    const row = todos.find((t) => t.id === input.id);
    if (!row) return { data: undefined, error: { message: 'not found' } };
    todos = todos.filter((t) => t.id !== input.id);
    return { data: { ok: true as const } as unknown, error: undefined };
  },

  async updateTodoTitle(input: { id: string; title: string; body: string }) {
    const row = todos.find((t) => t.id === input.id);
    if (!row) return { data: undefined, error: { message: 'not found' } };
    row.title = input.title;
    row.body = input.body;
    row.updatedAt = now();
    return { data: cloneTodo(row) as unknown, error: undefined };
  },

  async reorderTodos(_input: { listId: string; orderedIds: string[] }) {
    return { data: { ok: true as const } as unknown, error: undefined };
  },

  async updateTodoList(_input: { id: string; name: string }) {
    return { data: { ok: true as const } as unknown, error: undefined };
  },

  async createTodoList(_input: { name: string }) {
    return { data: undefined, error: undefined };
  },

  async deleteTodoList(_input: { id: string }) {
    return { data: { ok: true as const } as unknown, error: undefined };
  },
};
