import {
  allProjects,
  certificateGroups,
  content,
  expertiseAreas,
  journey,
  skillCategories,
  skillDescriptions,
  tickerLines,
} from '@/lib/content';
import docs from './docs.json';
import { GLOSSARY } from './glossary';
import { normalize } from './text';

/* Everything JARVIS's built-in AI knows, split into small passages and indexed
 * with BM25 (the ranking formula behind classic search engines). Each passage
 * comes straight from content.ts, the resume or a project README, so an answer
 * is always text that already exists, never something generated. */

export type Source = 'portfolio' | 'resume' | 'readme' | 'skill' | 'profile' | 'glossary' | 'github' | 'approved';
export type Passage = { id: string; source: Source; title: string; text: string; project?: string };

type Docs = { projects: Record<string, { resume: string[]; readme: { heading: string; text: string }[] }> };

function staticPassages(): Passage[] {
  const out: Passage[] = [];
  const add = (source: Source, title: string, text: string, project?: string) => out.push({ id: `${source}:${out.length}`, source, title, text, project });

  add('profile', 'About Nithesh', content.about);
  add('profile', 'Headline', `${content.hero.name}: ${content.hero.tagline}. ${content.hero.headline} Based in ${content.hero.location}.`);
  add('profile', 'Education', `${content.education.degree}, ${content.education.school}. Expected graduation: ${content.education.expected}.`);
  add('profile', 'Journey', `${journey.join('. ')}.`);
  add('profile', 'Recent updates', `${tickerLines.join('. ')}.`);
  add('profile', 'Contact', `Email ${content.contact.email}. Phone ${content.contact.phone}. LinkedIn ${content.contact.linkedin}. GitHub ${content.contact.github}. Portfolio ${content.liveUrl}.`);

  for (const e of content.experience) add('profile', `${e.role}, ${e.org}`, `${e.role} at ${e.org}, ${e.period}. ${e.bullets.join(' ')}`);
  for (const a of expertiseAreas) add('profile', a.title, `${a.title}: ${a.blurb} ${a.items.join(', ')}.`);
  for (const c of skillCategories) add('skill', c.title, `${c.title}: ${c.items.join(', ')}.`);
  for (const [skill, line] of Object.entries(skillDescriptions)) add('skill', skill, `${skill}: ${line}`);

  for (const g of certificateGroups) {
    for (const c of g.certs) add('portfolio', c.title, `${c.title} certificate from ${c.issuer}, issued ${c.date}. Group: ${g.heading}.`);
  }

  for (const p of allProjects) {
    add('portfolio', p.name, `${p.name}: ${p.tagline}. ${p.summary} Stack: ${p.stack.join(', ')}.`, p.id);
    const doc = (docs as Docs).projects[p.id];
    doc?.resume.forEach((bullet) => add('resume', p.name, bullet, p.id));
    doc?.readme.forEach((s) => add('readme', `${p.name}: ${s.heading}`, s.text, p.id));
  }

  for (const t of GLOSSARY) add('glossary', t.name, `${t.name} is ${t.meaning}${t.seen ? ` ${t.seen}` : ''}`);
  return out;
}

export const PASSAGES = staticPassages();

const STOP = new Set(
  `a an and are as at be been but by can could did do does for from had has have he her him his how i if in into is it its me my of on or our she should so than that the their them then there these they this to
   us was we were what when where which who whom why will with would you your about tell know give show please want need like nithesh jarvis many much`.split(/\s+/),
);

const SYNONYMS: Record<string, string> = { app: 'application', apps: 'application', website: 'site', websites: 'site', mobile: 'android', phone: 'android', tests: 'test', testing: 'test', detector: 'detection', accuracy: 'auc' };

/** Light stemming: enough to match "models" with "model", "trained" with "train". */
function stem(word: string): string {
  const w = SYNONYMS[word] ?? word;
  if (/[^a-z0-9]/.test(w) || w.length < 5) return w;
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export const terms = (text: string) =>
  normalize(text)
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem);

/** Checked sources win ties over free-form READMEs. */
const TRUST: Partial<Record<Source, number>> = { approved: 1.6, resume: 1.35, portfolio: 1.3, profile: 1.2, skill: 1.1 };

const K1 = 1.4;
const B = 0.72;

export type Hit = { passage: Passage; score: number; coverage: number };

export class Index {
  private readonly docs: { passage: Passage; tf: Map<string, number>; length: number }[];
  private readonly df = new Map<string, number>();
  private readonly avg: number;

  constructor(passages: readonly Passage[]) {
    this.docs = passages.map((passage) => {
      const list = terms(`${passage.title} ${passage.title} ${passage.text}`);
      const tf = new Map<string, number>();
      for (const t of list) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      return { passage, tf, length: list.length };
    });
    this.avg = this.docs.reduce((n, d) => n + d.length, 0) / Math.max(1, this.docs.length);
  }

  /** `coverage` is the share of the question's terms the passage contains. */
  search(query: string, limit = 5, project?: string): Hit[] {
    const q = [...new Set(terms(query))];
    if (q.length === 0) return [];
    const n = this.docs.length;
    const hits: Hit[] = [];
    for (const d of this.docs) {
      if (project && d.passage.project !== project) continue;
      let score = 0;
      let matched = 0;
      for (const t of q) {
        const tf = d.tf.get(t);
        if (!tf) continue;
        matched++;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score += (idf * (tf * (K1 + 1))) / (tf + K1 * (1 - B + (B * d.length) / this.avg));
      }
      if (score > 0) hits.push({ passage: d.passage, score: score * (TRUST[d.passage.source] ?? 1), coverage: matched / q.length });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const STATIC_INDEX = new Index(PASSAGES);

/** The sentences of a passage that best match the question, in their original order. */
export function bestSentences(passage: Passage, query: string, max = 2): string {
  const parts = passage.text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/).filter(Boolean);
  if (parts.length <= max) return passage.text;
  const q = new Set(terms(query));
  const ranked = parts
    .map((text, i) => ({ text, i, score: terms(text).filter((t) => q.has(t)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .sort((a, b) => a.i - b.i);
  return ranked.map((r) => r.text).join(' ');
}
