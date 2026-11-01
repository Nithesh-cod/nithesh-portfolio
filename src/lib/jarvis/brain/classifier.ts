import model from './model.json';
import { features } from './text';

/* The trained part of JARVIS's built-in AI: a softmax classifier that reads a
 * question and decides what is being asked. `npm run jarvis:train` produces
 * model.json from scripts/jarvis/training-data.mjs. */

type Model = { dims: number; scale: number; classes: string[]; bias: number[]; weights: string };

const m = model as unknown as Model;
const K = m.classes.length;

const weights = (() => {
  const binary = typeof atob === 'function' ? atob(m.weights) : Buffer.from(m.weights, 'base64').toString('latin1');
  const bytes = new Int8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = (binary.charCodeAt(i) << 24) >> 24;
  return bytes;
})();

export type Prediction = { intent: string; confidence: number; runnerUp: string };

export function classify(delex: string): Prediction {
  const logits = m.bias.slice();
  for (const [index, value] of features(delex, m.dims)) {
    for (let c = 0; c < K; c++) logits[c] = (logits[c] ?? 0) + (value * (weights[index * K + c] ?? 0)) / m.scale;
  }
  const top = Math.max(...logits);
  const exp = logits.map((l) => Math.exp(l - top));
  const sum = exp.reduce((a, b) => a + b, 0);
  const order = logits.map((_, i) => i).sort((a, b) => (logits[b] ?? 0) - (logits[a] ?? 0));
  const best = order[0] ?? 0;
  return { intent: m.classes[best] ?? 'unknown', confidence: (exp[best] ?? 0) / sum, runnerUp: m.classes[order[1] ?? 0] ?? 'unknown' };
}
