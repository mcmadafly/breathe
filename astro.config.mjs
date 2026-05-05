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
/** `astro dev` (npm script or `npx astro dev`) — avoid Vite SSR prebundle splitting `react` from `react-dom/server`. */
const npmRunDev =
  process.env.npm_lifecycle_event === 'dev' ||
  (() => {
    const i = process.argv.findIndex(
      (a) => a === 'astro' || /[/\\]astro\.js$/.test(a),
    );
    return i !== -1 && process.argv[i + 1] === 'dev';
  })();

// https://astro.build/config
export default defineConfig({
  output: 'server',
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
      },
    },
    define: {
      'import.meta.env.SCRIBBBLES_E2E': JSON.stringify(e2eDev),
    },
    optimizeDeps: {
      include: [
        'astro/actions/runtime/entrypoints/server.js',
        '@clerk/astro/server',
        '@clerk/astro/internal',
        'zod',
      ],
    },
    ssr: {
      optimizeDeps: {
        include: [
          'astro/actions/runtime/entrypoints/server.js',
          '@clerk/astro/server',
          '@clerk/astro/internal',
          'zod',
        ],
      },
      ...(npmRunDev
        ? {
            external: ['react', 'react-dom'],
          }
        : {}),
    },
  },

  adapter: cloudflare({
    /** Merge with root `wrangler.jsonc` (name, nodejs_compat, SESSION KV). */
    configPath: './wrangler.jsonc',
    /** Avoid Cloudflare Images binding requirement on hobby tiers. */
    imageService: 'passthrough',
  }),
});
