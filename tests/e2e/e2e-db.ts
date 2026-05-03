import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Shared path + URL for Playwright globalSetup and webServer (must stay in sync). */
export const playwrightE2eSqlitePath = path.join(os.tmpdir(), 'breathe-playwright-e2e.sqlite');

export function playwrightE2eTursoUrl(): string {
  return pathToFileURL(playwrightE2eSqlitePath).href;
}
