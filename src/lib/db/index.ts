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

/** Cloudflare Workers expose vars on the handler `env`; Astro maps that via `getEnv`, not `process.env`. */
function readTursoUrl(): string | undefined {
  const g = getEnv('TURSO_DATABASE_URL') as string | undefined;
  if (g !== undefined && g !== '') return g;
  if (typeof process !== 'undefined' && process.env.TURSO_DATABASE_URL)
    return process.env.TURSO_DATABASE_URL;
  return import.meta.env.TURSO_DATABASE_URL;
}

function readTursoAuthToken(): string | undefined {
  const g = getEnv('TURSO_AUTH_TOKEN') as string | undefined;
  if (g !== undefined && g !== '') return g;
  if (typeof process !== 'undefined' && process.env.TURSO_AUTH_TOKEN)
    return process.env.TURSO_AUTH_TOKEN;
  return import.meta.env.TURSO_AUTH_TOKEN;
}

function readEnvKey(key: 'TURSO_USE_SYNC' | 'TURSO_SYNC_PATH'): string | undefined {
  const g = getEnv(key) as string | undefined;
  if (g !== undefined && g !== '') return g;
  if (typeof process !== 'undefined' && process.env[key]) return process.env[key];
  return import.meta.env[key];
}

const remoteUrl = readTursoUrl();
const authTokenRaw = readTursoAuthToken();

function envTruthy(v: string | undefined): boolean {
  if (v === undefined || v === '') return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

const useTursoSyncFlag = envTruthy(readEnvKey('TURSO_USE_SYNC'));

const tursoSyncPathRaw =
  readEnvKey('TURSO_SYNC_PATH')?.trim() ?? '';

/** Local filesystem path (`file:` prefix optional) for synced Turso SQLite files on disk. */
const tursoSyncPath = tursoSyncPathRaw.replace(/^file:/i, '').trim();

/**
 * `astro build` with `SCRIBBBLES_CF_SSR_BUILD=1` aliases native Turso packages to stubs (see `astro.config.mjs`).
 * Vite `define` may inject boolean `true` or the string `'true'`; treat both as Cloudflare SSR.
 */
const isCfSsrBundle =
  import.meta.env.SCRIBBBLES_CF_SSR === true || import.meta.env.SCRIBBBLES_CF_SSR === 'true';

const allowNativeTursoSync = !isCfSsrBundle;

const wantsTursoSyncConfig =
  useTursoSyncFlag && remoteUrl.startsWith('libsql:') && tursoSyncPath.length > 0;

const isTursoSyncMode = allowNativeTursoSync && wantsTursoSyncConfig;

if (!allowNativeTursoSync && wantsTursoSyncConfig) {
  console.warn(
    '[db] TURSO_USE_SYNC is set but this bundle targets Cloudflare SSR; using remote libsql only.',
  );
}

/** Remote Turso requires a token; pure local `file:` SQLite must not send a hosted JWT. */
const authTokenForRemote = authTokenRaw || undefined;

if (!remoteUrl) {
  throw new Error('Missing TURSO_DATABASE_URL');
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
    return { db, libsqlClient, tursoSyncClient: syncDb };
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
  return { db, libsqlClient, tursoSyncClient: null };
}

const { db, libsqlClient, tursoSyncClient } = await bootstrap();

export const isUsingTursoSync = isTursoSyncMode;

export { db };

export { libsqlClient };

/** Pull remote changes then push local queue when `@tursodatabase/sync` is active; no-op otherwise. */
export async function syncTursoReplica(): Promise<void> {
  if (tursoSyncClient) {
    await tursoSyncClient.pull();
    await tursoSyncClient.push();
  }
}
