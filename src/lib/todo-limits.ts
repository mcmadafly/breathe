/** Max todos per user on the free tier (before upgrade). */
export const FREE_TODO_LIMIT = 3;

export const TODO_LIST_NAME_MAX_LENGTH = 64;

/** First line / list preview; overflow goes to `body`. */
export const TODO_TITLE_MAX_LENGTH = 256;

/** Max continuation text in `body` (total per todo ≈ title + body). */
export const TODO_BODY_MAX_LENGTH = 8000;

/** Max length of user-entered todo text before server splits into title + body. */
export const TODO_CONTENT_MAX_LENGTH = TODO_TITLE_MAX_LENGTH + TODO_BODY_MAX_LENGTH;
