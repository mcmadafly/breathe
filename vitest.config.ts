import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
    },
  },
  test: {
    projects: [
      {
        name: 'unit',
        resolve: {
          alias: {
            '@': path.resolve(root, './src'),
          },
        },
        test: {
          root,
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        name: 'component',
        resolve: {
          alias: {
            '@': path.resolve(root, './src'),
            'astro:actions': path.resolve(root, './tests/component/mocks/astro-actions.ts'),
          },
        },
        test: {
          root,
          include: ['tests/component/**/*.test.tsx'],
          environment: 'happy-dom',
          setupFiles: [path.resolve(root, './tests/component/setup.ts')],
        },
      },
    ],
  },
});
