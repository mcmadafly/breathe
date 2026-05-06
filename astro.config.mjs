// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import clerk from '@clerk/astro';
import { enUS } from '@clerk/localizations';
import { shadcn } from '@clerk/ui/themes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eDev = process.env.E2E_DEV === 'true';
/** Set by `npm run build` / `build:pages` — stub native Turso packages so the worker has no `node:fs` / NAPI. */
const cfSsrBuild = process.env.SCRIBBBLES_CF_SSR_BUILD === '1';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  /** Expose dev server on LAN (`0.0.0.0`). Vite infers HMR from this server — do not override `vite.server.hmr` port/clientPort here (breaks WS on some setups). */
  server: {
    host: true,
    port: 4321,
    strictPort: true,
  },
  devToolbar: {
    enabled: !e2eDev,
  },
  integrations: [
    react(),
    clerk({
      appearance: {
        theme: shadcn,
        variables: {
          colorPrimary: '#f97316',
          colorPrimaryForeground: '#ffffff',
          borderRadius: '0.625rem',
        },
        layout: {
          logoPlacement: 'none',
        },
      },
      localization: {
        ...enUS,
        signIn: {
          ...enUS.signIn,
          start: {
            ...enUS.signIn.start,
            title: '',
            titleCombined: '',
          },
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Pin to one install path so SSR islands and `react-dom/server` share the same `react` instance.
        react: path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        ...(cfSsrBuild
          ? {
              '@tursodatabase/sync': path.resolve(
                __dirname,
                './src/lib/db/shims/turso-sync-cf-stub.ts',
              ),
              'drizzle-orm/tursodatabase/database': path.resolve(
                __dirname,
                './src/lib/db/shims/drizzle-turso-cf-stub.ts',
              ),
            }
          : {}),
      },
    },
    define: {
      'import.meta.env.SCRIBBBLES_E2E': JSON.stringify(e2eDev),
      'import.meta.env.SCRIBBBLES_CF_SSR': JSON.stringify(cfSsrBuild),
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-dom/client',
        /** Bundled with app React so islands don’t load a second copy (invalid hook call with sonner). */
        'sonner',
        'astro/actions/runtime/entrypoints/server.js',
        '@clerk/astro/server',
        '@clerk/astro/internal',
        'zod',
      ],
      /**
       * Stripe breaks worker dev prebundle; `@cloudflare/unenv-preset` can produce a missing
       * `deps_ssr/@cloudflare_unenv-preset_node_process.js` after HMR/restart (Vite 6 + CF plugin).
       */
      exclude: ['stripe', '@cloudflare/unenv-preset'],
    },
    ssr: {
      /** Inline sonner with the same `react` resolution as the rest of SSR / islands. */
      noExternal: ['sonner'],
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react-dom/client',
          'sonner',
          'astro/actions/runtime/entrypoints/server.js',
          '@clerk/astro/server',
          '@clerk/astro/internal',
          'zod',
        ],
        exclude: ['stripe', '@cloudflare/unenv-preset'],
      },
    },
  },

  adapter: cloudflare({
    /** Merge with root `wrangler.jsonc` (name, nodejs_compat, SESSION KV). */
    configPath: './wrangler.jsonc',
    /** Avoid Cloudflare Images binding requirement on hobby tiers. */
    imageService: 'passthrough',
  }),
});
