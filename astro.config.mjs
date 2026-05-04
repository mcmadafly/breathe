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
      alias: {
        '@': path.resolve(__dirname, './src'),
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
