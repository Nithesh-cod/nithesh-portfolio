// Lets Node run the project's TypeScript directly for `npm run jarvis:*`:
// maps "@/x" to src/x.ts, adds the .ts extension to relative imports, and
// loads JSON under src/ as a plain module.
import { existsSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

function asTs(base) {
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, next) {
    let target = null;
    if (specifier.startsWith('@/')) target = path.join(SRC, specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (target?.endsWith('.json')) return { url: pathToFileURL(target).href, shortCircuit: true };
    const url = target ? asTs(target) : null;
    return url ? { url, format: 'module-typescript', shortCircuit: true } : next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.json') && url.includes('/src/')) {
      return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true };
    }
    if (url.endsWith('.ts') && !url.includes('/node_modules/')) return next(url, { ...context, format: 'module-typescript' });
    return next(url, context);
  },
});
