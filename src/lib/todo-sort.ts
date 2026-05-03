export type TodoListPosition = { id: string; position: number; createdAt: Date };

export type TodoWithOrder = {
  listId: string;
  position: number;
  createdAt: Date;
};

/** Match server ordering: list order (sidebar), then per-list todo position, then createdAt. */
export function sortTodoRows<T extends TodoWithOrder>(rows: T[], lists: TodoListPosition[]): T[] {
  const listRank = new Map<string, number>();
  const orderedLists = [...lists].sort(
    (a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const l of orderedLists) {
    listRank.set(l.id, listRank.size);
  }
  return [...rows].sort((a, b) => {
    const la = listRank.get(a.listId) ?? 999_999;
    const lb = listRank.get(b.listId) ?? 999_999;
    if (la !== lb) return la - lb;
    if (a.position !== b.position) return a.position - b.position;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
