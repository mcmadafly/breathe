import { TodoBoardErrorBoundary } from '@/components/todo-board-error-boundary';
import { TodoBoard, type TodoListRow, type TodoRow } from '@/components/todo-board';

export type { TodoListRow, TodoRow };

export function TodoBoardIsland(props: {
  initialTodos: TodoRow[];
  initialLists: TodoListRow[];
  isPro: boolean;
}) {
  return (
    <TodoBoardErrorBoundary>
      <TodoBoard {...props} />
    </TodoBoardErrorBoundary>
  );
}
