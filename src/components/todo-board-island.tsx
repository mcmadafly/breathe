import { TodoBoardErrorBoundary } from '@/components/todo-board-error-boundary';
import { TodoBoard, type TodoListRow, type TodoRow } from '@/components/todo-board';

export type { TodoListRow, TodoRow };

export function TodoBoardIsland(props: {
  initialTodos: TodoRow[];
  initialLists: TodoListRow[];
  isPro: boolean;
  isAnonymous?: boolean;
  /** True when SSR could not load lists/todos (e.g. Turso HTTP 400); show a soft banner, avoid crashing. */
  initialTodoDataFailed?: boolean;
}) {
  return (
    <TodoBoardErrorBoundary>
      <TodoBoard {...props} />
    </TodoBoardErrorBoundary>
  );
}
