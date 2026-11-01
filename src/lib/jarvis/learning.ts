import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/* JARVIS AI's reviewed learning. Questions it couldn't answer and replies a
 * visitor flagged wait here for Nithesh; only answers he writes ever reach
 * the model, because letting anonymous visitors teach it directly would let
 * anyone plant false claims about him on his own portfolio.
 *
 * Storage: Upstash Redis over REST in production (Vercel KV uses the same
 * API), a gitignored JSON file in development. With neither, learning is off
 * and the rest of the chat works normally. */

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FACTS = 50;
const FACT_CACHE_MS = 60_000;

const GAPS = 'jarvis:gaps';
const FLAGS = 'jarvis:flags';
const FACTS = 'jarvis:facts';

export type Gap = { id: string; question: string; count: number; lastAsked: string };
export type Flag = { id: string; question: string; answer: string; at: string };
export type Fact = { id: string; question: string; answer: string; at: string };

type KV = {
  hset(key: string, field: string, value: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string): Promise<void>;
};

function upstash(url: string, token: string): KV {
  const call = async (command: string[]): Promise<unknown> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
    return ((await res.json()) as { result?: unknown }).result;
  };
  return {
    hset: async (key, field, value) => void (await call(['HSET', key, field, value])),
    hdel: async (key, field) => void (await call(['HDEL', key, field])),
    hgetall: async (key) => {
      const flat = ((await call(['HGETALL', key])) as string[] | null) ?? [];
      const out: Record<string, string> = {};
      for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i] as string] = flat[i + 1] as string;
      return out;
    },
  };
}

function fileStore(file: string): KV {
  type Doc = Record<string, Record<string, string>>;
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<Doc> => {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8')) as Doc;
    } catch {
      return {};
    }
  };
  const update = (edit: (doc: Doc) => void) => {
    const next = queue.then(async () => {
      const doc = await read();
      edit(doc);
      await fs.writeFile(file, JSON.stringify(doc, null, 2));
    });
    queue = next.catch(() => undefined);
    return next;
  };
  return {
    hset: (key, field, value) => update((doc) => void ((doc[key] ??= {})[field] = value)),
    hdel: (key, field) => update((doc) => void delete doc[key]?.[field]),
    hgetall: async (key) => {
      await queue;
      return (await read())[key] ?? {};
    },
  };
}

let store: KV | null | undefined;

function kv(): KV | null {
  if (store !== undefined) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) store = upstash(url, token);
  else if (process.env.NODE_ENV !== 'production') store = fileStore(path.join(process.cwd(), '.jarvis-learning.json'));
  else store = null;
  return store;
}

export const learningEnabled = () => kv() !== null;

/** Strip contact details a visitor may have typed: this text is stored. */
const redact = (text: string) =>
  text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number]');

const tidy = (text: unknown, max: number) => (typeof text === 'string' ? redact(text).replace(/\s+/g, ' ').trim().slice(0, max) : '');

const hashId = (text: string) => createHash('sha256').update(text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()).digest('hex').slice(0, 16);

function parse<T>(raw: Record<string, string>): T[] {
  return Object.values(raw).flatMap((v) => {
    try {
      return [JSON.parse(v) as T];
    } catch {
      return [];
    }
  });
}

const fresh = (iso: string) => Date.now() - Date.parse(iso) < RETENTION_MS;

async function purge(db: KV, key: string, stamp: (item: Gap & Flag) => string) {
  const items = parse<Gap & Flag>(await db.hgetall(key));
  await Promise.all(items.filter((i) => !fresh(stamp(i))).map((i) => db.hdel(key, i.id)));
}

/** Claude judged a visitor's question unanswerable from what it knows. */
export async function recordGap(question: unknown): Promise<void> {
  const db = kv();
  const text = tidy(question, 300);
  if (!db || !text) return;
  const id = hashId(text);
  const existing = parse<Gap>(await db.hgetall(GAPS)).find((g) => g.id === id);
  const gap: Gap = { id, question: existing?.question ?? text, count: (existing?.count ?? 0) + 1, lastAsked: new Date().toISOString() };
  await db.hset(GAPS, id, JSON.stringify(gap));
  if (Math.random() < 0.05) await purge(db, GAPS, (g) => g.lastAsked);
}

/** A visitor marked a reply as wrong or unhelpful. */
export async function recordFlag(question: unknown, answer: unknown): Promise<boolean> {
  const db = kv();
  const q = tidy(question, 600);
  const a = tidy(answer, 1500);
  if (!db || !q || !a) return false;
  const id = hashId(`${q}\n${a}`);
  await db.hset(FLAGS, id, JSON.stringify({ id, question: q, answer: a, at: new Date().toISOString() } satisfies Flag));
  return true;
}

let factCache: { at: number; facts: Fact[] } | null = null;

/** Approved answers, oldest first so the prompt text stays stable as facts are added. */
export async function getFacts(): Promise<Fact[]> {
  const db = kv();
  if (!db) return [];
  if (factCache && Date.now() - factCache.at < FACT_CACHE_MS) return factCache.facts;
  const facts = parse<Fact>(await db.hgetall(FACTS)).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  factCache = { at: Date.now(), facts };
  return facts;
}

export function renderFacts(facts: Fact[]): string {
  if (facts.length === 0) return '';
  const body = facts.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
  return `<approved_answers>
Nithesh wrote these answers himself. They are the newest facts about him, and they override the knowledge base if the two disagree.

${body}
</approved_answers>`;
}

export async function reviewSnapshot(): Promise<{ gaps: Gap[]; flags: Flag[]; facts: Fact[] }> {
  const db = kv();
  if (!db) return { gaps: [], flags: [], facts: [] };
  await Promise.all([purge(db, GAPS, (g) => g.lastAsked), purge(db, FLAGS, (f) => f.at)]);
  const [gaps, flags, facts] = await Promise.all([db.hgetall(GAPS), db.hgetall(FLAGS), db.hgetall(FACTS)]);
  return {
    gaps: parse<Gap>(gaps).sort((a, b) => b.count - a.count || b.lastAsked.localeCompare(a.lastAsked)),
    flags: parse<Flag>(flags).sort((a, b) => b.at.localeCompare(a.at)),
    facts: parse<Fact>(facts).sort((a, b) => b.at.localeCompare(a.at)),
  };
}

export type TeachResult = { ok: true } | { ok: false; message: string };

/** Nithesh's answer goes live, and the item it resolves leaves the queue. */
export async function teach(input: { question?: unknown; answer?: unknown; resolves?: unknown }): Promise<TeachResult> {
  const db = kv();
  if (!db) return { ok: false, message: 'Learning storage is not configured.' };
  const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const question = clip(input.question, 300);
  const answer = clip(input.answer, 800);
  if (!question || !answer) return { ok: false, message: 'Write both the question and the answer.' };
  const count = Object.keys(await db.hgetall(FACTS)).length;
  if (count >= MAX_FACTS) return { ok: false, message: `JARVIS holds up to ${MAX_FACTS} taught answers. Remove one first.` };
  const id = randomUUID();
  await db.hset(FACTS, id, JSON.stringify({ id, question, answer, at: new Date().toISOString() } satisfies Fact));
  if (typeof input.resolves === 'string') await Promise.all([db.hdel(GAPS, input.resolves), db.hdel(FLAGS, input.resolves)]);
  factCache = null;
  return { ok: true };
}

export async function discard(kind: 'gap' | 'flag' | 'fact', id: string): Promise<void> {
  const db = kv();
  if (!db) return;
  await db.hdel(kind === 'gap' ? GAPS : kind === 'flag' ? FLAGS : FACTS, id);
  if (kind === 'fact') factCache = null;
}
