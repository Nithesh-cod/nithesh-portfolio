/**
 * One-shot: render page 1 of each cert PDF at 150 DPI, auto-crop whitespace,
 * resize so longest edge = 1200 px, write to public/certificates/png/<id>.png.
 *
 * Run with:  node scripts/convert-certs.mjs
 */
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'certificates');
const OUT = path.join(ROOT, 'public', 'certificates', 'png');

// id (output filename stem) → source PDF basename (without .pdf)
const MAP = {
  'front-end-web-dev': 'Front End Web Developer Certification',
  'html5': 'HTML 5',
  'css3': 'CSS3',
  'javascript': 'JAVA SCRIPT',
  'applied-gen-ai': 'applied_gen_ai_certification',
  'ai-first-software-engineering': 'ai-first software engineering',
  'openai-gpt-models': 'INTRODUCTION TO OPEN AI GPT MODELS',
  'gpt-3-for-developers': 'openaai generative pre-trained transformer 3(gpt-3)for developers',
  'prompt-engineering': 'prompt engineering',
  'basics-of-python': 'BASICS_OF_PYTHON',
  'python-fundamentals-part1': 'Programming Fundamentals using Python - Part1',
  'python-fundamentals-part2': 'Programming Fundamentals using Python - Part 2',
};

await mkdir(OUT, { recursive: true });

for (const [id, base] of Object.entries(MAP)) {
  const srcPath = path.join(SRC, `${base}.pdf`);
  const dstPath = path.join(OUT, `${id}.png`);
  if (!existsSync(srcPath)) {
    console.error(`MISSING SOURCE: ${srcPath}`);
    continue;
  }

  // pdf-to-img returns an async iterator over rendered page buffers.
  const document = await pdf(await readFile(srcPath), { scale: 2.08 }); // ~150 DPI
  let firstPng = null;
  for await (const page of document) {
    firstPng = page;
    break;
  }
  if (!firstPng) {
    console.error(`NO PAGE: ${id}`);
    continue;
  }

  // Auto-crop near-white margins, then resize so the longest edge = 1200.
  await sharp(firstPng)
    .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 12 })
    .resize({
      width: 1200,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9, palette: false })
    .toFile(dstPath);

  console.log(`✓ ${id}.png`);
}

console.log('done.');
