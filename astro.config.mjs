// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import clerk from '@clerk/astro';
import { enUS } from '@clerk/localizations';
import { shadcn } from '@clerk/ui/themes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',
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

  adapter: node({
    mode: 'standalone',
  }),
});
