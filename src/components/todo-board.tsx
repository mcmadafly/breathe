import { actions } from 'astro:actions';
import confetti from 'canvas-confetti';
import { Check, List, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DEFAULT_TODO_CATEGORY, TODO_CATEGORY_TABS, type TodoCategorySlug } from '@/lib/todo-categories';
import { FREE_TODO_LIMIT } from '@/lib/todo-limits';

export interface TodoRow {
  id: string;
  userId: string;
  title: string;
  category: string;
  done: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  initialTodos: TodoRow[];
  isPro: boolean;
}

type FilterId = 'all' | TodoCategorySlug;

function normalizeRow(raw: unknown): TodoRow {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    userId: String(r.userId),
    title: String(r.title),
    category: String(r.category ?? DEFAULT_TODO_CATEGORY),
    done: Boolean(r.done),
    createdAt: new Date(r.createdAt as string | number | Date),
    updatedAt: new Date(r.updatedAt as string | number | Date),
  };
}

const accentOrange = 'bg-[#f97316] hover:bg-[#ea580c] dark:bg-[#f97316] dark:hover:bg-[#ea580c]';

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

export function TodoBoard({ initialTodos, isPro }: Props) {
  const checkboxRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const skipEditBlurSaveRef = useRef(false);
  const [items, setItems] = useState<TodoRow[]>(initialTodos);
  const [title, setTitle] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [listsOpen, setListsOpen] = useState(false);
  const listsDrawerRef = useRef<HTMLDivElement>(null);
  const listsStripRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isPro) setFilter('all');
  }, [isPro]);

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

  const atLimit = !isPro && items.length >= FREE_TODO_LIMIT;

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((t) => t.category === filter);
  }, [items, filter]);

  const categoriesLocked = !isPro;

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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy('create');
    const category =
      isPro && filter !== 'all' ? filter : DEFAULT_TODO_CATEGORY;
    const res = await actions.createTodo({ title: t, category });
    setBusy(null);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    if (res.data) setItems((prev) => [normalizeRow(res.data), ...prev]);
    setTitle('');
    setComposerOpen(false);
  }

  async function onToggle(id: string, done: boolean) {
    setBusy(id);
    const res = await actions.toggleTodo({ id, done });
    setBusy(null);
    if (res.error || !res.data) return;
    const row = normalizeRow(res.data);
    setItems((prev) => prev.map((x) => (x.id === id ? row : x)));
    if (done) {
      const el = checkboxRefs.current.get(id);
      if (el) burstConfettiFromCheckbox(el);
    }
  }

  async function onDelete(id: string) {
    setBusy(id);
    const res = await actions.deleteTodo({ id });
    setBusy(null);
    if (res.error) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  async function commitEdit(id: string) {
    const t = editText.trim();
    if (!t) {
      setEditingId(null);
      return;
    }
    const prev = items.find((x) => x.id === id)?.title;
    if (prev !== undefined && t === prev) {
      setEditingId(null);
      return;
    }
    setBusy(id);
    const res = await actions.updateTodoTitle({ id, title: t });
    setBusy(null);
    if (res.error || !res.data) return;
    const row = normalizeRow(res.data);
    setItems((prev) => prev.map((x) => (x.id === id ? row : x)));
    setEditingId(null);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  function startEdit(row: TodoRow) {
    setEditingId(row.id);
    setEditText(row.title);
  }

  const sidebarNav = (
    <nav className="flex flex-col gap-1" aria-label="Categories">
      {TODO_CATEGORY_TABS.map((tab) => {
        const selected = filter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={categoriesLocked}
            className={tabButtonClasses(tab.id)}
            onClick={() => {
              if (!categoriesLocked) {
                setFilter(tab.id);
                setListsOpen(false);
              }
            }}
          >
            <List className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );

  const mobileCategoryTablist = (
    <div
      role="tablist"
      aria-label="Categories"
      aria-disabled={categoriesLocked}
      className="flex flex-wrap items-end gap-x-8 gap-y-1 border-b border-neutral-200/80 dark:border-neutral-700/80"
    >
      {TODO_CATEGORY_TABS.map((tab) => (
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
    </div>
  );

  const listsDrawer = (
    <div className="hidden shrink-0 gap-0 self-stretch lg:flex">
      <button
        ref={listsStripRef}
        type="button"
        aria-expanded={listsOpen}
        aria-controls="lists-drawer-panel"
        className={cn(
          'flex min-h-[11rem] shrink-0 cursor-pointer flex-col items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none',
          'text-xs font-medium tracking-tight text-[#8e8e8e] transition-colors duration-150 ease-out hover:text-[#f97316]',
          'focus-visible:ring-2 focus-visible:ring-neutral-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'dark:text-neutral-500 dark:hover:text-[#f97316] dark:focus-visible:ring-white/20',
          'lg:min-h-0 lg:flex-1',
        )}
        onClick={() => setListsOpen((o) => !o)}
      >
        <span className="select-none [writing-mode:vertical-rl]">Show lists</span>
      </button>
      <div
        ref={listsDrawerRef}
        id="lists-drawer-panel"
        role="region"
        aria-label="Categories"
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-xl border border-l-0',
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

  const listSection = (
    <ul className="space-y-1">
      {items.length === 0 ? (
        <li className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-sm text-[#8e8e8e] dark:border-neutral-700 dark:text-neutral-500">
          Nothing here yet. Add a task below.
        </li>
      ) : filteredItems.length === 0 ? (
        <li className="rounded-2xl border border-dashed border-neutral-200 py-8 text-center text-sm text-[#8e8e8e] dark:border-neutral-700 dark:text-neutral-500">
          Nothing in this category.
        </li>
      ) : (
        filteredItems.map((row) => (
          <li
            key={row.id}
            className={cn(
              'group flex min-h-[2.75rem] items-center gap-2.5 rounded-2xl px-2.5 py-1.5 transition-colors hover:bg-neutral-100/90 dark:hover:bg-white/[0.06]',
              editingId !== row.id && 'cursor-pointer',
            )}
            onClick={(e) => {
              if (busy === row.id || editingId === row.id) return;
              if ((e.target as HTMLElement).closest('button')) return;
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
                'flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border transition-colors',
                'disabled:opacity-50',
                row.done
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-neutral-300 bg-transparent dark:border-neutral-500',
              )}
            >
              {row.done ? <Check className="size-2.5 stroke-[3]" strokeLinecap="round" /> : null}
            </button>
            <div className="min-w-0 flex-1 py-0.5">
              {editingId === row.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={editText}
                    onChange={(ev) => setEditText(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault();
                        void commitEdit(row.id);
                      }
                      if (ev.key === 'Escape') {
                        ev.preventDefault();
                        skipEditBlurSaveRef.current = true;
                        cancelEditing();
                      }
                    }}
                    onBlur={() => {
                      queueMicrotask(() => {
                        if (skipEditBlurSaveRef.current) {
                          skipEditBlurSaveRef.current = false;
                          return;
                        }
                        if (editingId !== row.id) return;
                        void commitEdit(row.id);
                      });
                    }}
                    className={cn(
                      'h-10 min-w-0 flex-1 rounded-xl border-neutral-200 bg-[#f7f7f7] dark:border-neutral-600 dark:bg-white/5',
                    )}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="shrink-0 rounded-xl"
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
                <p
                  className={cn(
                    'text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-100',
                    row.done && 'text-[#8e8e8e] line-through decoration-neutral-400/80 dark:text-neutral-500',
                    !row.done && 'font-normal',
                  )}
                >
                  {row.title}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
              <Button
                type="button"
                variant="ghost"
                className="size-8 rounded-full text-[#8e8e8e] hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                aria-label="Delete"
                disabled={busy === row.id || editingId === row.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void onDelete(row.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))
      )}
    </ul>
  );

  const formOrUpgrade = atLimit ? (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-200/80 bg-orange-50/90 px-3 py-2 dark:border-orange-900/45 dark:bg-orange-950/35">
      <p className="min-w-0 flex-1 text-xs leading-tight text-muted-foreground">
        Want more items and categories? Upgrade to Pro.
      </p>
      <Button className={cn('h-7 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-white', accentOrange)} asChild>
        <a href="/upgrade">Upgrade</a>
      </Button>
    </div>
  ) : (
    <form
      onSubmit={onCreate}
      className="flex items-center gap-2"
      onClick={() => setComposerOpen(true)}
    >
      <div className={cn('relative min-w-0 flex-1', composerOpen && 'h-10')}>
        <Label htmlFor="new-todo" className="sr-only">
          New item
        </Label>
        <Input
          id="new-todo"
          name="title"
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          onFocus={() => setComposerOpen(true)}
          onBlur={() => {
            if (!title.trim()) setComposerOpen(false);
          }}
          placeholder="Add a task…"
          autoComplete="off"
          className={cn(
            'box-border appearance-none py-0 leading-none',
            composerOpen ? 'h-full min-h-0' : 'h-10',
            'rounded-xl border border-transparent px-4 text-[15px] text-neutral-900',
            'focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:text-white dark:focus-visible:border-transparent dark:focus-visible:ring-white/15',
            composerOpen
              ? 'bg-[#f7f7f7] shadow-inner shadow-black/[0.04] dark:bg-white/[0.06]'
              : 'bg-transparent shadow-none dark:bg-transparent',
            'placeholder:text-[#8e8e8e]',
          )}
        />
      </div>
      {composerOpen ? (
        <Button
          type="submit"
          disabled={busy === 'create' || !title.trim()}
          className={cn(
            'box-border h-[38px] max-h-[38px] min-h-[38px] shrink-0 rounded-xl border border-transparent px-4 py-0 text-[15px] font-semibold leading-none text-white shadow-md shadow-orange-900/25',
            accentOrange,
          )}
        >
          Add task
        </Button>
      ) : null}
    </form>
  );

  return (
    <div className="flex flex-row items-stretch gap-2 sm:gap-2.5">
      {listsDrawer}
      <div
        className={cn(
          'min-w-0 flex-1 rounded-[1.75rem] p-2 sm:p-2.5',
          'bg-[#f0f0f0] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.05]',
          'dark:bg-[#121416] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] dark:ring-white/[0.06]',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-3 rounded-[1.25rem] border px-4 pb-4 pt-4',
            'border-black/[0.06] bg-white shadow-sm',
            'dark:border-white/[0.07] dark:bg-[#1e1e1e] dark:shadow-none',
          )}
        >
          <div className="lg:hidden -mx-4 -mt-4 mb-1 px-4 pt-4">
            {mobileCategoryTablist}
          </div>
          {listSection}

          {formOrUpgrade}
        </div>
      </div>
    </div>
  );
}
