import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  outfile: 'public/dist/it-survivor-bot.js',
  format: 'iife',
  globalName: 'ITSurvivorBot',
  define: {
    'process.env.API_BASE': JSON.stringify(process.env.API_BASE ?? '/api'),
  },
  loader: { '.css': 'text' },   // inlines widget.css as a string
});