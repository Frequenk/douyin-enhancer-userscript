import { readFile } from 'node:fs/promises';
import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');
const headerPath = new URL('./src/userscript.header.js', import.meta.url);
const banner = (await readFile(headerPath, 'utf8')).trimEnd();

const options = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  outfile: 'douyin-enhancer.user.js',
  banner: {
    js: `${banner}\n`,
  },
  sourcemap: false,
  minify: false,
};

if (isWatch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('esbuild is watching...');
} else {
  await build(options);
}
