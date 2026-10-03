import { existsSync, readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * Builds the standalone embed script, dist/widget.js: one IIFE file with its
 * CSS inlined, rendered with Preact through preact/compat to stay small.
 * Run after the main build; it adds to dist/ without clearing it.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const outputs = existsSync('amplify_outputs.json')
    ? (JSON.parse(readFileSync('amplify_outputs.json', 'utf8')) as { custom?: { publicChatUrl?: string } })
    : undefined;
  const defaultChatUrl = env.VITE_PUBLIC_CHAT_URL || outputs?.custom?.publicChatUrl || '';

  return {
    plugins: [tailwindcss()],
    publicDir: false,
    resolve: {
      alias: [
        { find: /^react\/jsx-runtime$/, replacement: 'preact/compat/jsx-runtime' },
        { find: /^react\/jsx-dev-runtime$/, replacement: 'preact/compat/jsx-dev-runtime' },
        { find: /^react-dom\/client$/, replacement: 'preact/compat/client' },
        { find: /^react-dom$/, replacement: 'preact/compat' },
        { find: /^react$/, replacement: 'preact/compat' },
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      __DEFAULT_CHAT_URL__: JSON.stringify(defaultChatUrl),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      copyPublicDir: false,
      lib: {
        entry: 'src/widget/main.tsx',
        name: 'AosSupportWidget',
        formats: ['iife'],
        fileName: () => 'widget.js',
      },
    },
  };
});
