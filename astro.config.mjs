import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

const packageJson = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      '__APP_VERSION__': JSON.stringify(packageJson.version),
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(packageJson.version)
    }
  }
});

