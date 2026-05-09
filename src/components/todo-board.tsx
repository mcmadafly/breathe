import { actions } from 'astro:actions';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import { Check, GripVertical, List, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MutableRefObject,
} from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sortTodoRows } from '@/lib/todo-sort';
import { breatheAccentOutlineHover, breatheAccentTight } from '@/lib/breathe-accent';
import { cn } from '@/lib/utils';
import {
  FREE_TODO_LIMIT,
  TODO_BOARD_EXPAND_SHELL_CHARS,
  TODO_LIST_NAME_MAX_LENGTH,
  TODO_BODY_MAX_LENGTH,
  TODO_CONTENT_MAX_LENGTH,
  TODO_TITLE_MAX_LENGTH,
} from '@/lib/todo-limits';
import { mergeTodoContent, splitTodoContent } from '@/lib/todo-text';

export interface TodoListRow {
  id: string;
  userId: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoRow {
  id: string;
  userId: string;
  title: string;
  body: string;
  listId: string;
  position: number;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  initialTodos: TodoRow[];
  initialLists: TodoListRow[];
  isPro: boolean;
  /** Cookie session before Clerk sign-in — hide list/category navigation. */
  isAnonymous?: boolean;
  /** SSR failed to read todos/lists from the DB; board still mounts with empty state + banner. */
  initialTodoDataFailed?: boolean;
}

type FilterId = 'all' | string;

function normalizeRow(raw: unknown): TodoRow {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    userId: String(r.userId),
    title: String(r.title),
    body: String(r.body ?? ''),
    listId: String(r.listId ?? ''),
    position: Number(r.position ?? 0),
    done: Boolean(r.done),
    createdAt: new Date(r.createdAt as string | number | Date),
    updatedAt: new Date(r.updatedAt as string | number | Date),
  };
}

/** Avoid redundant list updates when SSE / action responses only differ by timestamps (prevents double transition flashes). */
function todoRowVisualEquals(a: TodoRow, b: TodoRow): boolean {
  return (
    a.id === b.id &&
    a.done === b.done &&
    a.title === b.title &&
    a.body === b.body &&
    a.listId === b.listId &&
    a.position === b.position
  );
}

function normalizeListRow(raw: unknown): TodoListRow {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    userId: String(r.userId),
    name: String(r.name),
    position: Number(r.position ?? 0),
    createdAt: new Date(r.createdAt as string | number | Date),
    updatedAt: new Date(r.updatedAt as string | number | Date),
  };
}

type TodoLiSharedProps = {
  row: TodoRow;
  hasLongTodo: boolean;
  busy: string | null;
  editingId: string | null;
  editTitle: string;
  editBody: string;
  editDetailVisible: boolean;
  expanded: boolean;
  checkboxRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  skipEditBlurSaveRef: React.MutableRefObject<boolean>;
  setEditTitle: (v: string) => void;
  setEditBody: (v: string) => void;
  setEditDetailVisible: (visible: boolean) => void;
  commitEdit: (id: string) => void | Promise<void>;
  cancelEditing: () => void;
  startEdit: (row: TodoRow) => void;
  onToggleExpand: (id: string) => void;
  onToggle: (id: string, done: boolean) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
};

function todoRowCanExpand(row: TodoRow): boolean {
  return row.body.length > 0 || /[\r\n]/.test(row.title);
}

function todoRowCollapsedPreviewTitle(row: TodoRow): string {
  const line = row.title.split(/\r?\n/, 1)[0];
  return line ?? row.title;
}

/** Expanded view: prefer `body` from schema; else split multiline `title` after first line. */
function todoRowExpandedPrimaryAndDetail(row: TodoRow): { primary: string; detail: string | null } {
  if (row.body.trim().length > 0) {
    return { primary: row.title, detail: row.body };
  }
  const lines = row.title.split(/\r?\n/);
  if (lines.length > 1) {
    return {
      primary: lines[0] ?? '',
      detail: lines.slice(1).join('\n'),
    };
  }
  return { primary: row.title, detail: null };
}

type TodoRowTextColumnProps = Pick<
  TodoLiSharedProps,
  | 'row'
  | 'hasLongTodo'
  | 'editingId'
  | 'editTitle'
  | 'editBody'
  | 'editDetailVisible'
  | 'expanded'
  | 'skipEditBlurSaveRef'
  | 'setEditTitle'
  | 'setEditBody'
  | 'setEditDetailVisible'
  | 'commitEdit'
  | 'cancelEditing'
  | 'onToggleExpand'
>;

function TodoRowTextColumn(props: TodoRowTextColumnProps) {
  const {
    row,
    hasLongTodo,
    editingId,
    editTitle,
    editBody,
    editDetailVisible,
    expanded,
    skipEditBlurSaveRef,
    setEditTitle,
    setEditBody,
    setEditDetailVisible,
    commitEdit,
    cancelEditing,
    onToggleExpand,
  } = props;
  const canExpand = todoRowCanExpand(row);
  const expandedDetails = expanded && canExpand ? todoRowExpandedPrimaryAndDetail(row) : null;

  const titleBlockClasses = cn(
    'min-w-0 break-words text-neutral-800 dark:text-neutral-100',
    canExpand && !expanded ? 'line-clamp-1 text-sm leading-snug' : 'whitespace-pre-wrap',
    hasLongTodo && (!canExpand || expanded) ? 'text-[15px] leading-relaxed' : 'text-sm leading-snug',
    row.done && 'text-[#8e8e8e] line-through decoration-neutral-400/80 dark:text-neutral-500',
    !row.done && 'font-normal',
  );

  const detailBlockClasses = cn(
    'mt-1 whitespace-pre-wrap border-l border-neutral-200/90 pl-3 text-sm leading-snug text-muted-foreground',
    'dark:border-neutral-600/90',
    row.done && 'text-[#8e8e8e]/90 line-through decoration-neutral-400/70 dark:text-neutral-500',
  );

  /** Mirrors title line metrics in read mode so the caret/text does not jump when editing. */
  const titleEditTypography = cn(
    hasLongTodo && (!canExpand || expanded) ? 'text-[15px] leading-relaxed' : 'text-sm leading-snug',
    !row.done
      ? 'text-neutral-800 dark:text-neutral-100'
      : 'text-[#8e8e8e] line-through decoration-neutral-400/80 dark:text-neutral-500',
    !row.done && 'font-normal',
  );

  const editFieldClass = cn(
    'field-sizing-content box-border min-h-10 w-full resize-none rounded-xl border border-neutral-200 bg-[#f7f7f7] px-4 py-2 text-[15px] leading-snug text-neutral-900 outline-none',
    'focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:border-neutral-600 dark:bg-white/5 dark:text-white dark:focus-visible:ring-white/15',
  );

  /** Single-line inline edit: metrics match static title; inset “border” via shadow so the box doesn’t reflow vs `<p>`. */
  const editTitleInlineClass = cn(
    'field-sizing-content box-border min-h-0 w-full resize-none rounded-md bg-transparent outline-none',
    'shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]',
    'pl-0 pr-2.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    'focus-visible:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18)] focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:focus-visible:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)] dark:focus-visible:ring-white/15',
    titleEditTypography,
  );

  return (
    <div className="min-w-0 flex-1">
      {editingId === row.id ? (
        <div
          className="flex min-w-0 flex-1 flex-col gap-4 outline-none"
          onBlur={(e) => {
            if (skipEditBlurSaveRef.current) {
              skipEditBlurSaveRef.current = false;
              return;
            }
            const rel = e.relatedTarget as Node | null;
            if (rel && e.currentTarget.contains(rel)) return;
            void commitEdit(row.id);
          }}
        >
          {!editDetailVisible ? (
            /** Same as read row: title + control are cross-centered (⋯ in read, Cancel here). */
            <div className="flex min-w-0 items-center gap-2.5">
              <textarea
                autoFocus
                aria-label="Task"
                value={mergeTodoContent(editTitle, editBody)}
                maxLength={TODO_CONTENT_MAX_LENGTH}
                rows={1}
                onChange={(ev) => {
                  const v = ev.target.value.slice(0, TODO_CONTENT_MAX_LENGTH);
                  const { title, body } = splitTodoContent(v);
                  setEditTitle(title);
                  setEditBody(body);
                  setEditDetailVisible(body.length > 0);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault();
                    void commitEdit(row.id);
                  }
                  if (ev.key === 'Escape') {
                    ev.preventDefault();
                    skipEditBlurSaveRef.current = true;
                    cancelEditing();
                  }
                }}
                className={cn(editTitleInlineClass, 'min-w-0 flex-1')}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0 rounded-xl px-3 py-2"
                onPointerDown={() => {
                  skipEditBlurSaveRef.current = true;
                }}
                onClick={() => {
                  cancelEditing();
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 items-start gap-3">
                <textarea
                  autoFocus
                  aria-label="Task title"
                  value={editTitle}
                  maxLength={TODO_TITLE_MAX_LENGTH}
                  rows={2}
                  onChange={(ev) => {
                    const t = ev.target.value.slice(0, TODO_TITLE_MAX_LENGTH);
                    setEditTitle(t);
                    if (t.length < TODO_TITLE_MAX_LENGTH && editBody.trim() === '') {
                      setEditDetailVisible(false);
                    }
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault();
                      void commitEdit(row.id);
                    }
                    if (ev.key === 'Escape') {
                      ev.preventDefault();
                      skipEditBlurSaveRef.current = true;
                      cancelEditing();
                    }
                  }}
                  className={cn(editFieldClass, 'min-w-0 flex-1')}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 shrink-0 rounded-xl px-3 py-2"
                  onPointerDown={() => {
                    skipEditBlurSaveRef.current = true;
                  }}
                  onClick={() => {
                    cancelEditing();
                  }}
                >
                  Cancel
                </Button>
              </div>
              <div className="min-w-0">
                <Label htmlFor={`todo-body-${row.id}`} className="mb-2 block text-xs font-medium text-muted-foreground">
                  More detail
                </Label>
                <textarea
                  id={`todo-body-${row.id}`}
                  aria-label="Task detail"
                  value={editBody}
                  maxLength={TODO_BODY_MAX_LENGTH}
                  rows={3}
                  onChange={(ev) => {
                    const b = ev.target.value.slice(0, TODO_BODY_MAX_LENGTH);
                    setEditBody(b);
                    if (b.trim() === '' && editTitle.length <= TODO_TITLE_MAX_LENGTH) {
                      setEditDetailVisible(false);
                    }
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
                      ev.preventDefault();
                      void commitEdit(row.id);
                    }
                    if (ev.key === 'Escape') {
                      ev.preventDefault();
                      skipEditBlurSaveRef.current = true;
                      cancelEditing();
                    }
                  }}
                  placeholder="Optional continuation…"
                  className={editFieldClass}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex min-w-0 gap-1',
            expanded && canExpand ? 'items-start' : 'items-center',
          )}
        >
          {expandedDetails ? (
            <div className="min-w-0 flex-1">
              <p className={cn(titleBlockClasses)}>{expandedDetails.primary}</p>
              {expandedDetails.detail ? (
                <div className={detailBlockClasses}>{expandedDetails.detail}</div>
              ) : null}
            </div>
          ) : (
            <p className={cn(titleBlockClasses, 'min-w-0 flex-1')}>
              {canExpand && !expanded ? todoRowCollapsedPreviewTitle(row) : row.title}
            </p>
          )}
          {canExpand ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 outline-none',
                'transition-colors hover:bg-neutral-200/70 hover:text-neutral-600',
                'focus-visible:ring-2 focus-visible:ring-neutral-900/15 dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-neutral-300 dark:focus-visible:ring-white/20',
                expanded && 'pt-0.5',
              )}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(row.id);
              }}
            >
              <MoreHorizontal className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StaticTodoLi(props: TodoLiSharedProps) {
  const {
    row,
    hasLongTodo,
    busy,
    editingId,
    editTitle,
    editBody,
    editDetailVisible,
    expanded,
    checkboxRefs,
    skipEditBlurSaveRef,
    setEditTitle,
    setEditBody,
    setEditDetailVisible,
    commitEdit,
    cancelEditing,
    startEdit,
    onToggleExpand,
    onToggle,
    onDelete,
  } = props;
  const canExpand = todoRowCanExpand(row);
  const editing = editingId === row.id;
  const editingCompact = editing && !editDetailVisible;
  /** Match read mode: collapsed rows use `items-center`. Full edit / expanded need top alignment. */
  const vAlign = (editing && !editingCompact) || expanded ? 'items-start' : 'items-center';
  return (
    <li className="group relative min-w-0">
      <div
        className={cn(
          'flex min-w-0 w-full rounded-2xl transition-colors hover:bg-neutral-100/90 dark:hover:bg-white/[0.06]',
          'gap-2.5 py-3.5 px-3.5',
          vAlign,
          hasLongTodo && !editing ? 'min-h-[3rem]' : !editing || editingCompact ? 'min-h-[2.75rem]' : null,
          editingId !== row.id && (!canExpand || expanded) && 'cursor-pointer',
        )}
        onClick={(e) => {
          if (busy === row.id || editingId === row.id) return;
          if ((e.target as HTMLElement).closest('button')) return;
          if (canExpand && !expanded) {
            onToggleExpand(row.id);
            return;
          }
          startEdit(row);
        }}
      >
      <button
        type="button"
        role="checkbox"
        aria-checked={row.done}
        aria-label={row.done ? 'Mark not done' : 'Mark done'}
        disabled={busy === row.id}
        ref={(el) => {
          if (el) checkboxRefs.current.set(row.id, el);
          else checkboxRefs.current.delete(row.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          void onToggle(row.id, !row.done);
        }}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border transition-none',
          'disabled:opacity-50',
          row.done
            ? cn(
                'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900',
                '[@media(hover:hover)]:opacity-45 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:opacity-100 focus-visible:opacity-100',
              )
            : 'border-neutral-300 bg-transparent dark:border-neutral-500',
        )}
      >
        {row.done ? <Check className="size-3 stroke-[2.5]" strokeLinecap="round" /> : null}
      </button>
      <TodoRowTextColumn
        row={row}
        hasLongTodo={hasLongTodo}
        editingId={editingId}
        editTitle={editTitle}
        editBody={editBody}
        editDetailVisible={editDetailVisible}
        expanded={expanded}
        skipEditBlurSaveRef={skipEditBlurSaveRef}
        setEditTitle={setEditTitle}
        setEditBody={setEditBody}
        setEditDetailVisible={setEditDetailVisible}
        commitEdit={commitEdit}
        cancelEditing={cancelEditing}
        onToggleExpand={onToggleExpand}
      />
      <div
        className={cn(
          'relative z-10 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          expanded && !editing && 'pt-0.5',
          editing && !editingCompact && 'self-start pt-1.5',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'size-8 rounded-full text-[#8e8e8e] transition-opacity hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400',
            '[@media(hover:hover)]:opacity-45 [@media(hover:hover)]:hover:opacity-100',
            '[@media(hover:none)]:opacity-100 focus-visible:opacity-100',
          )}
          aria-label="Delete"
          disabled={busy === row.id || editingId === row.id}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            void onDelete(row.id);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
    </li>
  );
}

function SortableTodoLi(props: TodoLiSharedProps) {
  const {
    row,
    hasLongTodo,
    busy,
    editingId,
    editTitle,
    editBody,
    editDetailVisible,
    expanded,
    checkboxRefs,
    skipEditBlurSaveRef,
    setEditTitle,
    setEditBody,
    setEditDetailVisible,
    commitEdit,
    cancelEditing,
    startEdit,
    onToggleExpand,
    onToggle,
    onDelete,
  } = props;
  const disabled = editingId === row.id || busy === row.id;
  const editing = editingId === row.id;
  const editingCompact = editing && !editDetailVisible;
  /** Match read mode: collapsed rows use `items-center`. Full edit / expanded need top alignment. */
  const vAlign = (editing && !editingCompact) || expanded ? 'items-start' : 'items-center';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled,
  });
  const { onPointerDown: onPointerDownSortable, ...sortableAttributesRest } = {
    ...(listeners ?? {}),
  } as NonNullable<typeof listeners>;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.88 : undefined,
  } as CSSProperties;

  return (
    <li ref={setNodeRef} style={style} className="group relative min-w-0">
      <div
        className={cn(
          'absolute left-0 z-20 flex w-10 -translate-x-full justify-end pr-2',
          editing || expanded ? 'top-2.5' : 'top-1/2 -translate-y-1/2',
        )}
      >
        <button
          type="button"
          aria-label={`Reorder (${row.title.slice(0, 40)}${row.title.length > 40 ? '…' : ''})`}
          className={cn(
            'touch-none flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8e8e8e]',
            'transition-opacity hover:text-neutral-600 dark:hover:text-neutral-300',
            '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100',
            disabled ? 'cursor-not-allowed opacity-35' : 'cursor-grab active:cursor-grabbing',
          )}
          disabled={disabled}
          {...attributes}
          {...sortableAttributesRest}
          onPointerDown={(e) => {
            onPointerDownSortable?.(e);
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <div
        className={cn(
          'flex min-w-0 w-full rounded-2xl transition-colors hover:bg-neutral-100/90 dark:hover:bg-white/[0.06]',
          'gap-2.5 py-3.5 px-3.5',
          vAlign,
          hasLongTodo && !editing ? 'min-h-[3rem]' : !editing || editingCompact ? 'min-h-[2.75rem]' : null,
          editingId !== row.id &&
            !disabled &&
            (!todoRowCanExpand(row) || expanded) &&
            'cursor-pointer',
        )}
        onClick={(e) => {
          if (busy === row.id || editingId === row.id) return;
          if ((e.target as HTMLElement).closest('button')) return;
          if (todoRowCanExpand(row) && !expanded) {
            onToggleExpand(row.id);
            return;
          }
          startEdit(row);
        }}
      >
      <button
        type="button"
        role="checkbox"
        aria-checked={row.done}
        aria-label={row.done ? 'Mark not done' : 'Mark done'}
        disabled={busy === row.id}
        ref={(el) => {
          if (el) checkboxRefs.current.set(row.id, el);
          else checkboxRefs.current.delete(row.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          void onToggle(row.id, !row.done);
        }}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border transition-none',
          'disabled:opacity-50',
          row.done
            ? cn(
                'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900',
                '[@media(hover:hover)]:opacity-45 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:opacity-100 focus-visible:opacity-100',
              )
            : 'border-neutral-300 bg-transparent dark:border-neutral-500',
        )}
      >
        {row.done ? <Check className="size-3 stroke-[2.5]" strokeLinecap="round" /> : null}
      </button>
      <TodoRowTextColumn
        row={row}
        hasLongTodo={hasLongTodo}
        editingId={editingId}
        editTitle={editTitle}
        editBody={editBody}
        editDetailVisible={editDetailVisible}
        expanded={expanded}
        skipEditBlurSaveRef={skipEditBlurSaveRef}
        setEditTitle={setEditTitle}
        setEditBody={setEditBody}
        setEditDetailVisible={setEditDetailVisible}
        commitEdit={commitEdit}
        cancelEditing={cancelEditing}
        onToggleExpand={onToggleExpand}
      />
      <div
        className={cn(
          'relative z-10 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          expanded && !editing && 'pt-0.5',
          editing && !editingCompact && 'self-start pt-1.5',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'size-8 rounded-full text-[#8e8e8e] transition-opacity hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400',
            '[@media(hover:hover)]:opacity-45 [@media(hover:hover)]:hover:opacity-100',
            '[@media(hover:none)]:opacity-100 focus-visible:opacity-100',
          )}
          aria-label="Delete"
          disabled={busy === row.id || editingId === row.id}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            void onDelete(row.id);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      </div>
    </li>
  );
}

/**
 * Fast polling fallback when SSE is down/reconnecting (multi-instance deploys,
 * flaky connections). SSE is OPEN → use slow guardrail interval only.
 * Browser Push API is separate (background/offline subscriptions); SSE is
 * HTTP server-push for live updates in this session.
 */
const LIST_SYNC_VISIBLE_MS = 2_500;
const LIST_SYNC_HIDDEN_MS = 22_000;
/** Rare full refresh while SSE is healthy (SSE/todo-sync is same-process only). */
const LIST_SYNC_SSE_GUARD_VISIBLE_MS = 90_000;
const LIST_SYNC_SSE_GUARD_HIDDEN_MS = LIST_SYNC_HIDDEN_MS;

const TODO_BROADCAST = 'breathe-todo-sync';

function burstConfettiFromCheckbox(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  const origin = { x, y };
  const base = {
    origin,
    disableForReducedMotion: true,
    colors: ['#E65124', '#f97316', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
  } as const;
  void confetti({ ...base, particleCount: 60, spread: 48, startVelocity: 48 });
  void confetti({ ...base, particleCount: 45, spread: 100, scalar: 0.9, startVelocity: 38 });
  void confetti({ ...base, particleCount: 35, spread: 120, startVelocity: 32, ticks: 320 });
}

export function TodoBoard({
  initialTodos,
  initialLists,
  isPro,
  isAnonymous = false,
  initialTodoDataFailed = false,
}: Props) {
  const checkboxRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const skipEditBlurSaveRef = useRef(false);
  const [items, setItems] = useState<TodoRow[]>(() => sortTodoRows([...initialTodos], initialLists));
  const [lists, setLists] = useState<TodoListRow[]>(initialLists);
  const listsRef = useRef<TodoListRow[]>(initialLists);
  listsRef.current = lists;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editDetailVisible, setEditDetailVisible] = useState(false);
  const [expandedTodoIds, setExpandedTodoIds] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<FilterId>('all');
  const [listsOpen, setListsOpen] = useState(false);
  const [listFormOpen, setListFormOpen] = useState(false);
  const [listFormName, setListFormName] = useState('');
  const [listFormEditingId, setListFormEditingId] = useState<string | null>(null);
  const [savingList, setSavingList] = useState(false);
  const listsDrawerRef = useRef<HTMLDivElement>(null);
  const listsStripRef = useRef<HTMLButtonElement>(null);
  const createFormRef = useRef<HTMLFormElement>(null);
  const tabInstanceIdRef = useRef(crypto.randomUUID());
  const busyRef = useRef(busy);
  const editingIdRef = useRef(editingId);
  busyRef.current = busy;
  editingIdRef.current = editingId;

  const syncFromServer = useCallback(async (opts?: { bypassBusy?: boolean }) => {
    if (!opts?.bypassBusy && busyRef.current !== null) return;
    if (!opts?.bypassBusy && editingIdRef.current !== null) return;
    const [tRes, lRes] = await Promise.all([actions.listTodos({}), actions.listTodoLists({})]);
    if (tRes.error || !tRes.data) return;
    const normalizedTodos = tRes.data.map(normalizeRow);
    const nextLists = !lRes.error && lRes.data ? lRes.data.map(normalizeListRow) : listsRef.current;
    if (!lRes.error && lRes.data) {
      setLists(nextLists);
    }
    listsRef.current = nextLists;
    setItems(sortTodoRows(normalizedTodos, nextLists));
  }, []);

  useEffect(() => {
    if (!initialTodoDataFailed) return;
    void syncFromServer({ bypassBusy: true });
  }, [initialTodoDataFailed, syncFromServer]);

  const notifyOtherClients = useCallback(() => {
    try {
      const bc = new BroadcastChannel(TODO_BROADCAST);
      bc.postMessage({ type: 'todos-changed' as const, from: tabInstanceIdRef.current });
      bc.close();
    } catch {
      /* unsupported or blocked */
    }
  }, []);

  useEffect(() => {
    if (!isPro || isAnonymous) setFilter('all');
  }, [isPro, isAnonymous]);

  useEffect(() => {
    if (filter === 'all') return;
    if (!lists.some((l) => l.id === filter)) {
      setFilter('all');
    }
  }, [lists, filter]);

  useEffect(() => {
    if (!listsOpen) return;
    function onDocPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (listsDrawerRef.current?.contains(t)) return;
      if (listsStripRef.current?.contains(t)) return;
      setListsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setListsOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [listsOpen]);

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(TODO_BROADCAST);
      bc.onmessage = (ev: MessageEvent<{ type?: string; from?: string }>) => {
        if (ev.data?.type !== 'todos-changed') return;
        if (ev.data.from === tabInstanceIdRef.current) return;
        void syncFromServer({ bypassBusy: true });
      };
    } catch {
      /* no BroadcastChannel */
    }
    return () => bc?.close();
  }, [syncFromServer]);

  useEffect(() => {
    let intervalId = 0;
    const sseHealthyRef = { current: false };
    const es = new EventSource('/api/todos/stream');

    const armPolling = () => {
      window.clearInterval(intervalId);
      const visible = document.visibilityState === 'visible';
      const ms =
        sseHealthyRef.current && visible
          ? LIST_SYNC_SSE_GUARD_VISIBLE_MS
          : sseHealthyRef.current && !visible
            ? LIST_SYNC_SSE_GUARD_HIDDEN_MS
            : visible
              ? LIST_SYNC_VISIBLE_MS
              : LIST_SYNC_HIDDEN_MS;
      intervalId = window.setInterval(() => {
        void syncFromServer();
      }, ms);
    };

    es.onopen = () => {
      sseHealthyRef.current = true;
      armPolling();
    };
    es.onerror = () => {
      sseHealthyRef.current = false;
      armPolling();
    };

    es.onmessage = (ev) => {
      let msg: { type?: string; todo?: unknown; id?: string };
      try {
        msg = JSON.parse(ev.data) as typeof msg;
      } catch {
        return;
      }
      if (msg.type === 'sync:ready') return;
      if (msg.type === 'todo:created' && msg.todo) {
        const row = normalizeRow(msg.todo);
        setItems((prev) =>
          prev.some((x) => x.id === row.id)
            ? prev
            : sortTodoRows([...prev, row], listsRef.current),
        );
        return;
      }
      if (msg.type === 'todo:updated' && msg.todo) {
        const row = normalizeRow(msg.todo);
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === row.id);
          if (i === -1) return sortTodoRows([...prev, row], listsRef.current);
          const cur = prev[i]!;
          if (todoRowVisualEquals(cur, row)) return prev;
          return sortTodoRows(
            prev.map((x) => (x.id === row.id ? row : x)),
            listsRef.current,
          );
        });
        return;
      }
      if (msg.type === 'todos:reordered') {
        void syncFromServer({ bypassBusy: true });
        return;
      }
      if (msg.type === 'todo:deleted' && msg.id) {
        const id = msg.id;
        setItems((prev) => prev.filter((x) => x.id !== id));
        setEditingId((e) => (e === id ? null : e));
        setExpandedTodoIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    };

    armPolling();
    document.addEventListener('visibilitychange', armPolling);
    return () => {
      document.removeEventListener('visibilitychange', armPolling);
      window.clearInterval(intervalId);
      es.close();
    };
  }, [syncFromServer]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void syncFromServer();
    }
    function onFocus() {
      void syncFromServer();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncFromServer]);

  const atLimit = !isPro && items.length >= FREE_TODO_LIMIT;

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((t) => t.listId === filter);
  }, [items, filter]);

  const reorderListId = useMemo(() => {
    if (filteredItems.length === 0) return null;
    const ids = new Set(filteredItems.map((t) => t.listId));
    if (ids.size !== 1) return null;
    return filteredItems[0]!.listId;
  }, [filteredItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const tabs = useMemo(() => {
    return [{ id: 'all' as const, label: 'All' }, ...lists.map((l) => ({ id: l.id, label: l.name }))];
  }, [lists]);

  const hasLongTodo = useMemo(
    () => items.some((t) => t.title.length + t.body.length > TODO_BOARD_EXPAND_SHELL_CHARS),
    [items],
  );

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('todo-board-wide', hasLongTodo);
    return () => {
      document.documentElement.classList.remove('todo-board-wide');
    };
  }, [hasLongTodo]);

  const showCategoryNav = !isAnonymous;
  const categoriesLocked = showCategoryNav && !isPro;

  const activeListName = useMemo(() => {
    if (filter === 'all') return 'All';
    return lists.find((l) => l.id === filter)?.name ?? 'All';
  }, [filter, lists]);

  function tabButtonClasses(tabId: FilterId) {
    const selected = filter === tabId;
    return cn(
      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
      categoriesLocked && 'cursor-not-allowed opacity-50',
      !categoriesLocked && selected && 'bg-white/90 font-bold text-neutral-900 shadow-sm dark:bg-white/10 dark:text-white',
      !categoriesLocked &&
        !selected &&
        'font-normal text-[#8e8e8e] hover:bg-white/60 dark:text-neutral-400 dark:hover:bg-white/5',
      categoriesLocked && selected && 'bg-white/40 font-semibold text-neutral-600 dark:bg-white/5 dark:text-neutral-300',
      categoriesLocked && !selected && 'font-normal text-[#8e8e8e]/70 dark:text-neutral-500',
    );
  }

  function tabBarButtonClasses(tabId: FilterId) {
    const selected = filter === tabId;
    return cn(
      '-mb-px bg-transparent pb-2.5 pt-1 text-sm transition-colors',
      'border-b-[3px] border-transparent',
      categoriesLocked && 'cursor-not-allowed text-muted-foreground opacity-55',
      categoriesLocked && selected && 'border-muted-foreground/35 font-medium opacity-70',
      categoriesLocked && !selected && 'font-normal',
      !categoriesLocked &&
        selected &&
        'border-[#f97316] font-bold text-foreground dark:border-[#f97316]',
      !categoriesLocked &&
        !selected &&
        'font-normal text-neutral-500 hover:text-[#f97316] dark:text-neutral-400 dark:hover:text-[#f97316]',
    );
  }

  function onComposerTitleChange(raw: string) {
    if (raw.length <= TODO_TITLE_MAX_LENGTH) {
      setTitle(raw);
      return;
    }
    setTitle(raw.slice(0, TODO_TITLE_MAX_LENGTH));
    const extra = raw.slice(TODO_TITLE_MAX_LENGTH);
    setBody((prev) => (prev + extra).slice(0, TODO_BODY_MAX_LENGTH));
  }

  function readComposerFromForm(form: HTMLFormElement) {
    const titleTa = form.querySelector<HTMLTextAreaElement>('textarea[name="title"]');
    const bodyTa = form.querySelector<HTMLTextAreaElement>('textarea[name="body"]');
    return {
      domTitle: (titleTa?.value ?? '').trim(),
      domBody: (bodyTa?.value ?? '').trim(),
    };
  }

  function canSubmitCreate() {
    if (busy === 'create') return false;
    const form = createFormRef.current;
    if (form) {
      const { domTitle, domBody } = readComposerFromForm(form);
      if (domTitle || domBody) return true;
    }
    return Boolean(title.trim() || body.trim());
  }

  function requestCreateSubmit() {
    if (!canSubmitCreate()) return;
    createFormRef.current?.requestSubmit();
  }

  function onComposerTitleKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key !== 'Enter') return;
    if (ev.shiftKey) return;
    ev.preventDefault();
    requestCreateSubmit();
  }

  function onComposerBodyKeyDown(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (ev.key !== 'Enter') return;
    if (!ev.metaKey && !ev.ctrlKey) return;
    ev.preventDefault();
    requestCreateSubmit();
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const { domTitle, domBody } = readComposerFromForm(form);
    const merged = mergeTodoContent(domTitle || title.trim(), domBody || body.trim());
    if (!merged.trim() || busy === 'create') return;
    setBusy('create');
    const res = await actions.createTodo({
      title: merged,
      listId: isPro && filter !== 'all' ? filter : undefined,
    });
    setBusy(null);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (res.data) {
      const row = normalizeRow(res.data);
      setItems((prev) =>
        prev.some((x) => x.id === row.id)
          ? prev
          : sortTodoRows([...prev, row], listsRef.current),
      );
    }
    setTitle('');
    setBody('');
    setComposerOpen(false);
    notifyOtherClients();
  }

  async function onToggle(id: string, done: boolean) {
    const snapshot = items.find((x) => x.id === id);
    if (!snapshot) return;

    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, done, updatedAt: new Date() } : x)),
    );

    if (done) {
      queueMicrotask(() => {
        const el = checkboxRefs.current.get(id);
        if (el) burstConfettiFromCheckbox(el);
      });
    }

    const res = await actions.toggleTodo({ id, done });
    if (res.error || !res.data) {
      setItems((prev) => prev.map((x) => (x.id === id ? snapshot : x)));
      if (res.error) toast.error(res.error.message);
      return;
    }
    const row = normalizeRow(res.data);
    setItems((prev) => {
      const cur = prev.find((x) => x.id === id);
      if (cur && todoRowVisualEquals(cur, row)) return prev;
      return prev.map((x) => (x.id === id ? row : x));
    });
    notifyOtherClients();
  }

  async function onDelete(id: string) {
    setBusy(id);
    const res = await actions.deleteTodo({ id });
    setBusy(null);
    if (res.error) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    setExpandedTodoIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    notifyOtherClients();
  }

  async function commitEdit(id: string) {
    const nextTitle = editTitle.trim();
    const nextBody = editBody.trim();
    if (!nextTitle) {
      setEditingId(null);
      setEditDetailVisible(false);
      return;
    }
    const prevRow = items.find((x) => x.id === id);
    if (prevRow && prevRow.title === nextTitle && prevRow.body === nextBody) {
      setEditingId(null);
      setEditDetailVisible(false);
      return;
    }
    setEditingId(null);
    setEditDetailVisible(false);
    if (prevRow) {
      setItems((p) => p.map((x) => (x.id === id ? { ...x, title: nextTitle, body: nextBody } : x)));
    }
    setBusy(id);
    const res = await actions.updateTodoTitle({ id, title: nextTitle, body: nextBody });
    setBusy(null);
    if (res.error || !res.data) {
      if (prevRow) {
        setItems((p) => p.map((x) => (x.id === id ? prevRow : x)));
      }
      if (res.error) toast.error(res.error.message);
      return;
    }
    const row = normalizeRow(res.data);
    setItems((p) => p.map((x) => (x.id === id ? row : x)));
    notifyOtherClients();
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
    setEditDetailVisible(false);
  }

  function startEdit(row: TodoRow) {
    setEditingId(row.id);
    if (row.body.trim().length > 0) {
      setEditTitle(row.title);
      setEditBody(row.body);
      setEditDetailVisible(true);
      return;
    }
    if (/[\r\n]/.test(row.title)) {
      const lines = row.title.split(/\r?\n/);
      const title0 = (lines[0] ?? '').trimEnd();
      const body0 = lines.slice(1).join('\n');
      setEditTitle(title0);
      setEditBody(body0);
      setEditDetailVisible(body0.trim().length > 0 || title0.length > TODO_TITLE_MAX_LENGTH);
      return;
    }
    setEditTitle(row.title);
    setEditBody('');
    setEditDetailVisible(row.title.length > TODO_TITLE_MAX_LENGTH);
  }

  const onToggleExpand = useCallback((id: string) => {
    setExpandedTodoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!reorderListId) return;
      const listIdReorder = reorderListId;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      let orderedIds: string[] | null = null;
      setItems((prev) => {
        const slice = prev.filter((t) => t.listId === listIdReorder);
        const oldIndex = slice.findIndex((t) => t.id === String(active.id));
        const newIndex = slice.findIndex((t) => t.id === String(over.id));
        if (oldIndex < 0 || newIndex < 0) return prev;
        const moved = arrayMove(slice, oldIndex, newIndex);
        orderedIds = moved.map((t) => t.id);
        const withPos = moved.map((t, i) => ({ ...t, position: i }));
        const others = prev.filter((t) => t.listId !== listIdReorder);
        return sortTodoRows([...others, ...withPos], listsRef.current);
      });
      if (!orderedIds) return;
      const res = await actions.reorderTodos({ listId: listIdReorder, orderedIds });
      if (res.error) {
        toast.error(res.error.message);
        void syncFromServer({ bypassBusy: true });
        return;
      }
      notifyOtherClients();
    },
    [reorderListId, notifyOtherClients, syncFromServer],
  );

  function openCreateListForm() {
    setListFormEditingId(null);
    setListFormName('');
    setListFormOpen(true);
  }

  function openEditListForm(list: TodoListRow) {
    setListFormEditingId(list.id);
    setListFormName(list.name);
    setListFormOpen(true);
  }

  async function submitListForm(e: FormEvent) {
    e.preventDefault();
    const n = listFormName.trim();
    if (!n) return;
    setSavingList(true);
    if (listFormEditingId) {
      const res = await actions.updateTodoList({ id: listFormEditingId, name: n });
      setSavingList(false);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      if (res.data) {
        const normalized = normalizeListRow(res.data);
        setLists((prev) => prev.map((l) => (l.id === listFormEditingId ? normalized : l)));
      }
    } else {
      const res = await actions.createTodoList({ name: n });
      setSavingList(false);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      if (res.data) {
        const row = normalizeListRow(res.data);
        setLists((prev) => [...prev, row].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)));
      }
    }
    setListFormOpen(false);
    notifyOtherClients();
  }

  async function deleteListById(listId: string) {
    if (!globalThis.confirm('Delete this list? It must be empty first.')) return;
    setBusy(`list-${listId}`);
    const res = await actions.deleteTodoList({ id: listId });
    setBusy(null);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setLists((prev) => prev.filter((l) => l.id !== listId));
    if (filter === listId) setFilter('all');
    notifyOtherClients();
  }

  const sidebarNav = (
    <div className="flex flex-col gap-1">
      <nav className="flex flex-col gap-1" aria-label="Categories">
        <button
          key="all"
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          disabled={categoriesLocked}
          className={tabButtonClasses('all')}
          onClick={() => {
            if (!categoriesLocked) {
              setFilter('all');
              setListsOpen(false);
            }
          }}
        >
          <List className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
          All
        </button>
        {lists.map((list) => (
          <div key={list.id} className="group/row flex w-full min-w-0 items-center gap-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={filter === list.id}
              disabled={categoriesLocked}
              className={cn(tabButtonClasses(list.id), 'min-w-0 flex-1')}
              onClick={() => {
                if (!categoriesLocked) {
                  setFilter(list.id);
                  setListsOpen(false);
                }
              }}
            >
              <List className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
              <span className="truncate">{list.name}</span>
            </button>
            {isPro ? (
              <div className="flex shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 [@media(hover:none)]:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-[#8e8e8e] hover:text-[#f97316]"
                  aria-label={`Rename ${list.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditListForm(list);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-[#8e8e8e] hover:text-red-600"
                  aria-label={`Delete ${list.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteListById(list.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </nav>
      {isPro ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-1 size-9 rounded-xl text-[#8e8e8e] hover:bg-white/60 hover:text-[#f97316] dark:hover:bg-white/5"
          aria-label="Add list"
          onClick={openCreateListForm}
        >
          <Plus className="size-5" strokeWidth={2} />
        </Button>
      ) : null}
    </div>
  );

  const mobileCategoryTablist = (
    <div
      role="tablist"
      aria-label="Categories"
      aria-disabled={categoriesLocked}
      className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-neutral-200/80 dark:border-neutral-700/80"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={filter === tab.id}
          disabled={categoriesLocked}
          className={tabBarButtonClasses(tab.id)}
          onClick={() => {
            if (!categoriesLocked) setFilter(tab.id);
          }}
        >
          {tab.label}
        </button>
      ))}
      {isPro ? (
        <button
          type="button"
          className="-mb-px box-border inline-flex min-w-8 shrink-0 items-center justify-center rounded-lg border-b-[3px] border-transparent pb-2.5 pt-1 text-[#8e8e8e] transition-colors hover:bg-neutral-100 hover:text-[#f97316] dark:hover:bg-white/10 dark:hover:text-[#f97316]"
          aria-label="Add list"
          onClick={openCreateListForm}
        >
          <Plus className="size-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );

  const noTodosYet = items.length === 0;

  const listsDrawer = (
    <div className="hidden shrink-0 gap-0 lg:flex lg:flex-row lg:items-start">
      <button
        ref={listsStripRef}
        type="button"
        aria-expanded={listsOpen}
        aria-controls="lists-drawer-panel"
        className={cn(
          // self-start: do not stretch to drawer height (sidebar stays tall when collapsed).
          'flex shrink-0 cursor-pointer flex-col items-center justify-start self-start border-0 bg-transparent p-0 shadow-none outline-none',
          noTodosYet ? 'min-h-0' : 'min-h-[11rem]',
          'lg:mt-2 lg:min-h-0 lg:pt-0',
          'text-xs font-medium tracking-tight text-[#8e8e8e] transition-colors duration-150 ease-out hover:text-[#f97316]',
          'focus-visible:ring-2 focus-visible:ring-neutral-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'dark:text-neutral-500 dark:hover:text-[#f97316] dark:focus-visible:ring-white/20',
        )}
        onClick={() => setListsOpen((o) => !o)}
      >
        <span className="select-none [writing-mode:vertical-rl]">
          {activeListName} | show lists
        </span>
      </button>
      <div
        ref={listsDrawerRef}
        id="lists-drawer-panel"
        role="region"
        aria-label="Categories"
        className={cn(
          'flex min-h-0 shrink-0 flex-col self-start overflow-hidden rounded-xl border border-l-0',
          'border-transparent bg-white/50 backdrop-blur-xl transition-[max-width,opacity,border-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-neutral-900/45',
          listsOpen
            ? 'max-w-[min(13.5rem,calc(100vw-3rem))] border-black/[0.06] opacity-100 shadow-sm dark:border-white/[0.09]'
            : 'max-w-0 border-transparent opacity-0',
        )}
      >
        <div className="w-[min(13.5rem,calc(100vw-3rem))] min-w-0 p-3">{sidebarNav}</div>
      </div>
    </div>
  );

  const baseTodoLiProps: Omit<TodoLiSharedProps, 'row' | 'expanded'> = {
    hasLongTodo,
    busy,
    editingId,
    editTitle,
    editBody,
    editDetailVisible,
    checkboxRefs,
    skipEditBlurSaveRef,
    setEditTitle,
    setEditBody,
    setEditDetailVisible,
    commitEdit,
    cancelEditing,
    startEdit,
    onToggleExpand,
    onToggle,
    onDelete,
  };

  const listSection =
    items.length === 0 ? (
      <ul className="min-w-0 space-y-1" />
    ) : filteredItems.length === 0 ? (
      <ul className="space-y-1">
        <li className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-sm text-[#8e8e8e] dark:border-neutral-700 dark:text-neutral-500">
          {showCategoryNav ? 'Nothing in this category.' : 'Nothing here yet.'}
        </li>
      </ul>
    ) : reorderListId ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredItems.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="min-w-0 space-y-1">
            {filteredItems.map((row) => (
              <SortableTodoLi
                key={row.id}
                row={row}
                expanded={expandedTodoIds.has(row.id)}
                {...baseTodoLiProps}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    ) : (
      <ul className="min-w-0 space-y-1">
        {filteredItems.map((row) => (
          <StaticTodoLi key={row.id} row={row} expanded={expandedTodoIds.has(row.id)} {...baseTodoLiProps} />
        ))}
      </ul>
    );

  /** Empty focused composer keeps fixed height; `field-sizing-content` on textarea adds extra slack below the line. */
  const composerTitleAutoHeight =
    composerOpen && (title.trim().length > 0 || body.trim().length > 0);

  const formOrUpgrade = atLimit ? (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200/80 bg-orange-50/90 px-3 py-2 dark:border-orange-900/45 dark:bg-orange-950/35">
      <p className="min-w-0 flex-1 text-xs leading-tight text-muted-foreground">
        {isAnonymous
          ? `The free tier keeps up to ${FREE_TODO_LIMIT} todos in this session. Sign in to attach them to your account, then upgrade for unlimited todos, lists, and categories.`
          : `You're on the free plan (${FREE_TODO_LIMIT} todos). Upgrade to Pro for unlimited tasks, categories, and lists.`}
      </p>
      <Button className={cn('h-7 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-white', breatheAccentTight)} asChild>
        <a href="/upgrade">Upgrade</a>
      </Button>
    </div>
  ) : (
    <form
      method="post"
      ref={createFormRef}
      onSubmit={onCreate}
      className="flex flex-col gap-2"
      onClick={() => setComposerOpen(true)}
    >
      <div
        className={cn(
          'flex min-w-0 flex-row gap-2',
          composerTitleAutoHeight ? 'items-start' : 'items-center',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'relative flex min-w-0 flex-1',
            composerTitleAutoHeight ? 'min-h-10 items-start' : 'h-10 min-h-10 items-stretch',
          )}
        >
          <Label htmlFor="new-todo" className="sr-only">
            New item
          </Label>
          <textarea
            id="new-todo"
            name="title"
            value={title}
            onChange={(ev) => onComposerTitleChange(ev.target.value)}
            onKeyDown={onComposerTitleKeyDown}
            onFocus={() => setComposerOpen(true)}
            onBlur={() => {
              if (!title.trim() && !body.trim()) setComposerOpen(false);
            }}
            placeholder="Add a task…"
            autoComplete="off"
            rows={1}
            className={cn(
              'box-border w-full resize-none rounded-xl border border-transparent px-4 text-[15px] text-neutral-900 outline-none',
              composerTitleAutoHeight
                ? 'field-sizing-content min-h-10 max-h-none overflow-y-auto py-2 leading-snug [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                : '[field-sizing:fixed] h-10 max-h-10 min-h-0 overflow-hidden pt-px pb-0 leading-[calc(2.5rem-1px)]',
              'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:text-white dark:focus-visible:ring-white/15',
              'bg-[#f7f7f7] shadow-inner shadow-black/[0.04] dark:bg-white/[0.06]',
              'placeholder:text-[#8e8e8e]',
            )}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={busy === 'create'}
          className={cn(
            'box-border h-10 shrink-0 rounded-xl px-4 text-[15px] font-semibold transition-[color,background-color,border-color,box-shadow]',
            'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-neutral-900/15 dark:focus-visible:ring-white/15',
            breatheAccentOutlineHover,
          )}
        >
          Add task
        </Button>
      </div>
      {composerOpen && (title.length >= TODO_TITLE_MAX_LENGTH || body.length > 0) ? (
        <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
          <Label
            htmlFor="new-todo-detail"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            More detail
          </Label>
          <textarea
            id="new-todo-detail"
            name="body"
            value={body}
            onChange={(ev) => setBody(ev.target.value.slice(0, TODO_BODY_MAX_LENGTH))}
            onKeyDown={onComposerBodyKeyDown}
            onFocus={() => setComposerOpen(true)}
            placeholder="Continuation (overflow past the first 256 characters)…"
            autoComplete="off"
            rows={3}
            maxLength={TODO_BODY_MAX_LENGTH}
            className={cn(
              'field-sizing-content box-border min-h-[2.75rem] w-full resize-none overflow-y-auto rounded-xl border border-transparent px-4 py-2.5 text-[15px] text-neutral-900 outline-none',
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
              'bg-[#f7f7f7] shadow-inner shadow-black/[0.04] dark:bg-white/[0.06]',
              'focus-visible:ring-2 focus-visible:ring-[#f97316]/25 dark:text-white',
              'placeholder:text-[#8e8e8e]',
            )}
          />
        </div>
      ) : null}
    </form>
  );

  return (
    <>
      {initialTodoDataFailed ? (
        <div
          role="status"
          className="mb-3 rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="font-medium">Couldn’t load tasks from the database.</p>
          <p className="mt-1 text-amber-900/85 dark:text-amber-200/90">
            {import.meta.env.DEV ? (
              <>
                In dev, set <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">TURSO_DATABASE_URL</code>{' '}
                (e.g. <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">libsql://…</code>) and{' '}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">TURSO_AUTH_TOKEN</code> in{' '}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">.env</code>, run{' '}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">npm run db:push</code> if the schema
                is new, then refresh.
              </>
            ) : (
              <>
                Check <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">TURSO_DATABASE_URL</code> /{' '}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">TURSO_AUTH_TOKEN</code> on the
                machine that runs <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">npm run build</code>{' '}
                and in the Cloudflare Worker’s variables (wrong Worker secrets can override the DB). Run{' '}
                <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/50">npm run db:push</code> against the
                production database if the schema is new, redeploy, then refresh.
              </>
            )}
          </p>
        </div>
      ) : null}
      <div
        className={cn(
          'mx-auto flex w-full min-w-0 max-w-none flex-row items-start gap-2 sm:gap-2.5',
        )}
      >
        {showCategoryNav ? listsDrawer : null}
        <div
          className={cn(
            'min-w-0 flex-1 rounded-[1.75rem]',
            'bg-transparent shadow-none ring-0 dark:bg-transparent dark:shadow-none dark:ring-0',
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
            {showCategoryNav ? (
              <div
                className={cn(
                  'lg:hidden -mr-4 px-4',
                  noTodosYet ? 'pt-2' : 'pt-1',
                )}
              >
                {mobileCategoryTablist}
              </div>
            ) : null}

            <div className={cn('min-w-0 overflow-x-visible', noTodosYet ? '' : '-mx-1 min-h-0 rounded-xl px-1 py-0.5')}>
              {listSection}
            </div>

            <div
              className={cn(
                'flex min-h-0 flex-col overflow-x-visible',
                noTodosYet ? 'gap-1 pb-4 pt-2' : 'py-3 pb-4',
              )}
            >
              {formOrUpgrade}
            </div>
          </div>
        </div>
      </div>

      {listFormOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !savingList && setListFormOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="list-form-title"
            aria-modal="true"
            className="bg-background w-full max-w-sm rounded-2xl border p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="list-form-title" className="text-foreground text-sm font-semibold tracking-tight">
              {listFormEditingId ? 'Rename list' : 'New list'}
            </h2>
            <form onSubmit={submitListForm} className="mt-3 space-y-3">
              <Input
                value={listFormName}
                onChange={(ev) => setListFormName(ev.target.value)}
                maxLength={TODO_LIST_NAME_MAX_LENGTH}
                placeholder="List name"
                autoComplete="off"
                autoFocus
                className="rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingList}
                  onClick={() => setListFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingList || !listFormName.trim()}
                  className={cn('font-semibold text-white', breatheAccentTight)}
                >
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
