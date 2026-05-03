/// <reference types="astro/client" />

type AuthSession = import('@auth/core/types').Session | null;

declare namespace App {
  interface Locals {
    session: AuthSession;
    isPro: boolean;
  }
}

interface ImportMetaEnv {
  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN?: string;
  readonly AUTH_SECRET: string;
  readonly AUTH_TRUST_HOST?: string;
  readonly GITHUB_CLIENT_ID?: string;
  readonly GITHUB_CLIENT_SECRET?: string;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
  /** When "true", skips OAuth and uses a fixed local user for /app and todos. */
  readonly SKIP_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
