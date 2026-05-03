import '@testing-library/jest-dom/vitest';

import { afterEach, vi } from 'vitest';

import { resetActionMocks } from './mocks/astro-actions';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

/** Minimal EventSource stub so `TodoBoard` SSE + polling effects do not throw. */
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  readyState = MockEventSource.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    queueMicrotask(() => {
      this.onopen?.();
    });
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}

vi.stubGlobal('EventSource', MockEventSource);

afterEach(() => {
  resetActionMocks();
});
