import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  outfile: 'dist/it-survivor-bot.js',
  format: 'iife',
  globalName: 'ITSurvivorBot',
  define: {
    'process.env.API_BASE': JSON.stringify(process.env.API_BASE ?? 'https://api.illuminationtransformation.org/__openclaw__/api'),
  },
  loader: { '.css': 'text' },   // inlines widget.css as a string
});