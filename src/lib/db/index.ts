import { createClient, type Client } from '@libsql/client';
import type { InArgs, ResultSet } from '@libsql/core/api';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { getEnv } from 'astro/env/runtime';

import { relations, schemaTables } from './schema';

/** Shape used by `wrapTursoSyncAsLibsqlClient` — avoids importing `@tursodatabase/sync` at module scope (breaks CF bundle). */
type TursoSyncDatabase = {
  prepare: (sql: string) => { run: (...args: unknown[]) => Promise<unknown> };
  connect: () => Promise<void>;
  pull: () => Promise<boolean>;
  push: () => Promise<void>;
};

/**
 * Turso credentials on Cloudflare must come from Worker bindings (`cloudflare:workers` / `getEnv`).
 *
 * Do **not** read `import.meta.env.TURSO_*` in the Worker bundle: Vite inlines `.env` into the
 * server chunk (including JWTs). A missing `getEnv` hit would then use the wrong DB or leak tokens.
 *
 * - **astro dev**: `process.env` from Vite + `.env`, then `getEnv`, then Miniflare.
 * - **astro build (CI)**: `process.env` / `getEnv` during Node build; Worker runtime uses
 *   `cloudflare:workers` first, then `getEnv`.
 */
/** Avoid `import.meta.env.*` here: Vite merges all `.env` keys (including Turso JWT) into that object. */
const prefersLocalEnvFiles =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

const isCfSsrBundle = __SCRIBBBLES_CF_SSR_BUNDLE__ === true;

function readEnvKey(key: 'TURSO_USE_SYNC' | 'TURSO_SYNC_PATH'): string | undefined {
  if (typeof process !== 'undefined' && process.env[key]) return process.env[key];
  const g = getEnv(key) as string | undefined;
  if (g !== undefined && g !== '') return g;
  return undefined;
}

async function resolveTursoDatabaseUrl(): Promise<string | undefined> {
  if (prefersLocalEnvFiles) {
    const p = process.env.TURSO_DATABASE_URL?.trim();
    if (p) return p;
    const g = getEnv('TURSO_DATABASE_URL') as string | undefined;
    if (g?.trim()) return g.trim();
    return undefined;
  }
  if (isCfSsrBundle) {
    try {
      const { env: cfEnv } = await import('cloudflare:workers');
      const v = cfEnv.TURSO_DATABASE_URL;
      if (typeof v === 'string' && v.trim()) return v.trim();
    } catch {
      /* `astro build` in Node, or non-Worker SSR */
    }
  }
  const g = getEnv('TURSO_DATABASE_URL') as string | undefined;
  if (g?.trim()) return g.trim();
  const p = process.env.TURSO_DATABASE_URL?.trim();
  if (p) return p;
  return undefined;
}

async function resolveTursoAuthToken(): Promise<string | undefined> {
  if (prefersLocalEnvFiles) {
    const p = process.env.TURSO_AUTH_TOKEN?.trim();
    if (p) return p;
    const g = getEnv('TURSO_AUTH_TOKEN') as string | undefined;
    if (g?.trim()) return g.trim();
    return undefined;
  }
  if (isCfSsrBundle) {
    try {
      const { env: cfEnv } = await import('cloudflare:workers');
      const v = cfEnv.TURSO_AUTH_TOKEN;
      if (typeof v === 'string' && v.trim()) return v.trim();
    } catch {
      /* build in Node */
    }
  }
  const g = getEnv('TURSO_AUTH_TOKEN') as string | undefined;
  if (g?.trim()) return g.trim();
  const p = process.env.TURSO_AUTH_TOKEN?.trim();
  if (p) return p;
  return undefined;
}

function envTruthy(v: string | undefined): boolean {
  if (v === undefined || v === '') return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function emptyExecuteResult(): ResultSet {
  return {
    columns: [],
    columnTypes: [],
    rows: [],
    rowsAffected: 0,
    lastInsertRowid: undefined,
    toJSON() {
      return {
        columns: [],
        columnTypes: [],
        rows: [],
        rowsAffected: 0,
        lastInsertRowid: undefined,
      };
    },
  };
}

/** Turso `@tursodatabase/sync` exposes `prepare(...).run` only — app code uses positional `?` args. */
function positionalBindings(args: InArgs | undefined): unknown[] {
  if (args === undefined) return [];
  if (Array.isArray(args)) return args;
  throw new Error('Named SQL args are not supported for Turso Sync libsql shim; use positional placeholders.');
}

/** Minimal `@libsql/client`-shaped facade for `todo-table-capabilities.ts` (+ similar). */
function wrapTursoSyncAsLibsqlClient(syncDb: TursoSyncDatabase): Client {
  const executeBoth: Client['execute'] = async (
    stmt: Parameters<Client['execute']>[0],
    bindArgs?,
  ): Promise<ResultSet> => {
    let sqlStr: string;
    let rawArgs: InArgs | undefined;
    if (typeof stmt === 'string') {
      sqlStr = stmt;
      rawArgs = bindArgs as InArgs | undefined;
    } else {
      sqlStr = stmt.sql;
      rawArgs = stmt.args;
    }
    const binds = positionalBindings(rawArgs);
    const prepared = syncDb.prepare(sqlStr);
    await (binds.length ? prepared.run(...binds) : prepared.run());
    return emptyExecuteResult();
  };

  return { execute: executeBoth } as unknown as Client;
}

async function bootstrap() {
  const remoteUrl = await resolveTursoDatabaseUrl();
  if (!remoteUrl) {
    throw new Error('Missing TURSO_DATABASE_URL');
  }

  const authTokenRaw = (await resolveTursoAuthToken()) || undefined;
  const authTokenForRemote = authTokenRaw || undefined;

  const useTursoSyncFlag = envTruthy(readEnvKey('TURSO_USE_SYNC'));
  const tursoSyncPathRaw = readEnvKey('TURSO_SYNC_PATH')?.trim() ?? '';
  const tursoSyncPath = tursoSyncPathRaw.replace(/^file:/i, '').trim();
  const allowNativeTursoSync = !isCfSsrBundle;
  const wantsTursoSyncConfig =
    useTursoSyncFlag && remoteUrl.startsWith('libsql:') && tursoSyncPath.length > 0;
  const isTursoSyncMode = allowNativeTursoSync && wantsTursoSyncConfig;

  if (!allowNativeTursoSync && wantsTursoSyncConfig) {
    console.warn(
      '[db] TURSO_USE_SYNC is set but this bundle targets Cloudflare SSR; using remote libsql only.',
    );
  }

  if (remoteUrl.startsWith('libsql://') && !authTokenForRemote) {
    console.warn(
      '[db] TURSO_DATABASE_URL is a hosted libsql:// URL but TURSO_AUTH_TOKEN is empty. ' +
        'Turso returns HTTP 400 for unauthenticated requests; set the token from the Turso dashboard.',
    );
  }

  if (isTursoSyncMode) {
    const [{ connect }, { drizzle: drizzleTurso }] = await Promise.all([
      import('@tursodatabase/sync'),
      import('drizzle-orm/tursodatabase/database'),
    ]);
    type TursoSdkDb = import('@tursodatabase/database').Database;

    const syncDb = (await connect({
      path: tursoSyncPath,
      url: remoteUrl,
      authToken: authTokenForRemote,
    })) as TursoSyncDatabase;
    await syncDb.connect();

    const db = drizzleTurso({
      client: syncDb as TursoSdkDb,
      schema: schemaTables,
      relations,
    });
    const libsqlClient = wrapTursoSyncAsLibsqlClient(syncDb);
    return { db, libsqlClient, tursoSyncClient: syncDb, isUsingTursoSync: true };
  }

  const authToken =
    remoteUrl.startsWith('file:') || remoteUrl.startsWith(':memory:')
      ? undefined
      : authTokenForRemote;

  const libsqlClient = createClient({
    url: remoteUrl,
    authToken,
  });

  const db = drizzleLibsql({
    client: libsqlClient,
    schema: schemaTables,
    relations,
  });
  return { db, libsqlClient, tursoSyncClient: null, isUsingTursoSync: false };
}

const { db, libsqlClient, tursoSyncClient, isUsingTursoSync } = await bootstrap();

export { isUsingTursoSync };

export { db };

export { libsqlClient };

/** Pull remote changes then push local queue when `@tursodatabase/sync` is active; no-op otherwise. */
export async function syncTursoReplica(): Promise<void> {
  if (tursoSyncClient) {
    await tursoSyncClient.pull();
    await tursoSyncClient.push();
  }
}
