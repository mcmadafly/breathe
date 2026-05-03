import { z } from 'zod';

export const TODO_CATEGORY_SLUGS = ['work', 'personal', 'home'] as const;
export type TodoCategorySlug = (typeof TODO_CATEGORY_SLUGS)[number];

/** Tabs: `all` plus each slug (All is filter-only, not stored on rows). */
export const TODO_CATEGORY_TABS: { id: 'all' | TodoCategorySlug; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'home', label: 'Home' },
];

export const DEFAULT_TODO_CATEGORY: TodoCategorySlug = 'work';

export const todoCategoryZod = z.enum(TODO_CATEGORY_SLUGS);
