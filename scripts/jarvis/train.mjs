// Trains JARVIS's intent classifier and writes src/lib/jarvis/brain/model.json.
//   npm run jarvis:train            train, then score on the DEV questions
//   npm run jarvis:train -- --exam  also score the sealed EXAM questions
// Softmax regression trained with AdaGrad on hashed features, with no ML libraries.
import { writeFileSync } from 'node:fs';
import { findEntities } from '@/lib/jarvis/brain/entities';
import { features } from '@/lib/jarvis/brain/text';
import { DEV, EXAM, USED_EXAM_1 } from './question-sets.mjs';
import { dataset, INTENTS, rng } from './training-data.mjs';

const OUT = 'src/lib/jarvis/brain/model.json';
const DIMS = 1 << Number(process.env.JARVIS_BITS ?? 12);
const EPOCHS = 22;
const LEARNING_RATE = 0.9;
const L2 = 1.2e-6;
const SCALE = 14; // weight × SCALE is stored as one signed byte

const classes = Object.keys(INTENTS);
const K = classes.length;
// Examples go through the entity matcher exactly as live questions do.
const rows = dataset().map((r) => ({ x: [...features(findEntities(r.text).delex, DIMS)], y: classes.indexOf(r.intent) }));
console.log(`${classes.length} intents, ${rows.length} training examples, ${DIMS} features`);

const w = new Float64Array(DIMS * K);
const g = new Float64Array(DIMS * K);
const b = new Float64Array(K);
const gb = new Float64Array(K);
const shuffle = rng(11);

function probabilities(x) {
  const logits = Float64Array.from(b);
  for (const [i, v] of x) for (let c = 0; c < K; c++) logits[c] += w[i * K + c] * v;
  const top = Math.max(...logits);
  const p = logits.map((l) => Math.exp(l - top));
  const sum = p.reduce((a, c) => a + c, 0);
  return p.map((v) => v / sum);
}

for (let epoch = 1; epoch <= EPOCHS; epoch++) {
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(shuffle() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  let loss = 0;
  for (const { x, y } of rows) {
    const p = probabilities(x);
    loss -= Math.log(Math.max(p[y], 1e-12));
    for (let c = 0; c < K; c++) {
      const err = p[c] - (c === y ? 1 : 0);
      if (Math.abs(err) < 1e-4) continue;
      gb[c] += err * err;
      b[c] -= (LEARNING_RATE * err) / Math.sqrt(gb[c] + 1e-8);
      for (const [i, v] of x) {
        const at = i * K + c;
        const grad = err * v + L2 * w[at];
        g[at] += grad * grad;
        w[at] -= (LEARNING_RATE * grad) / Math.sqrt(g[at] + 1e-8);
      }
    }
  }
  if (epoch === 1 || epoch % 5 === 0 || epoch === EPOCHS) console.log(`epoch ${String(epoch).padStart(2)}  loss ${(loss / rows.length).toFixed(4)}`);
}

// Quantise to one signed byte per weight.
const bytes = new Int8Array(DIMS * K);
let clipped = 0;
for (let i = 0; i < w.length; i++) {
  const q = Math.round(w[i] * SCALE);
  if (Math.abs(q) > 127) clipped++;
  bytes[i] = Math.max(-127, Math.min(127, q));
}
const model = { dims: DIMS, scale: SCALE, classes, bias: [...b].map((v) => +v.toFixed(4)), weights: Buffer.from(bytes.buffer).toString('base64') };
writeFileSync(OUT, JSON.stringify(model));
console.log(`wrote ${OUT}: ${(JSON.stringify(model).length / 1024).toFixed(0)} KB, ${clipped} weights clipped`);

// Score the file that ships, compression included, not the raw weights above.
const { classify } = await import('@/lib/jarvis/brain/classifier');

/** Scores through the same steps a real question takes: entities, then classifier. */
function score(name, set, verbose) {
  let correct = 0;
  const misses = [];
  const confidence = { right: [], wrong: [] };
  for (const [text, expected] of set) {
    const { intent, confidence: c } = classify(findEntities(text).delex);
    const ok = intent === expected;
    if (ok) correct++;
    else misses.push(`   "${text}" → ${intent} (${c.toFixed(2)}), expected ${expected}`);
    (ok ? confidence.right : confidence.wrong).push(c);
  }
  const mean = (a) => (a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : '-');
  console.log(`\n${name}: ${correct}/${set.length} correct = ${((correct / set.length) * 100).toFixed(1)}%   (mean confidence: right ${mean(confidence.right)}, wrong ${mean(confidence.wrong)})`);
  if (verbose) console.log(misses.join('\n'));
}

score('DEV', [...DEV, ...USED_EXAM_1], true);
if (process.argv.includes('--exam')) score('EXAM (sealed)', EXAM, true);
