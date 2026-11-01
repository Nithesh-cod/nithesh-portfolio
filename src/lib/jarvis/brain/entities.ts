import { allProjects, certificateGroups, skillCategories } from '@/lib/content';
import { GLOSSARY } from './glossary';
import { editDistance, words } from './text';
import type { ToolApp } from '../tools';

/* Finds what a question is about, and swaps those words for placeholders
 * ("what stack does qurious use" → "what stack does zproject use"), so the
 * classifier learns the sentence pattern once instead of once per project. */

export type Entities = {
  projects: string[];
  skills: string[];
  certs: string[];
  apps: ToolApp[];
  terms: string[];
  /** The question with entities replaced by zproject, zskill, zcert, zapp, zterm. */
  delex: string;
};

type Kind = 'project' | 'skill' | 'cert' | 'app' | 'term';
type Alias = { phrase: string[]; kind: Kind; id: string };

const PROJECT_ALIASES: Record<string, string[]> = {
  cropai: ['crop ai', 'cropai', 'crop segmentation', 'weed detection', 'crop weed', 'canopy'],
  'smart-canteen': ['smart canteen', 'fastbite', 'fast bite', 'canteen', 'canteen app', 'food ordering'],
  testai: ['testai', 'test ai', 'test automation', 'self healing'],
  qurious: ['qurious', 'quantum lab', 'quantum app', 'quantum project', 'sih project', 'hackathon project'],
  deepguard: ['deepguard', 'deep guard', 'face detector', 'deepfake detector', 'ai face detection'],
  'ramji-electronics': ['ramji electronics', 'ramji', 'billing app', 'inventory app', 'electronics shop'],
  'techfest-symposium': ['techfest symposium', 'techfest', 'tech fest', 'symposium', 'event platform'],
  voxelspeak: ['voxelspeak', 'voxel speak', 'speech to 3d', 'voice to 3d'],
  'stock-price-prediction': ['stock price prediction', 'stock prediction', 'stock price', 'stock predictor', 'stock market project', 'stock project'],
  jarvis: ['jarvis project', 'desktop jarvis', 'desktop assistant', 'desktop companion', 'jarvis desktop', 'multi agent assistant'],
  portfolio: ['portfolio site', 'portfolio website', 'portfolio project'],
  thozhan: ['thozhan', 'tanglish assistant', 'tanglish voice assistant', 'voice avatar'],
};

const SKILL_ALIASES: Record<string, string[]> = {
  TypeScript: ['ts'],
  JavaScript: ['js'],
  'HTML / CSS': ['html', 'css', 'html css', 'html5', 'css3'],
  'Next.js': ['nextjs', 'next'],
  'Tailwind CSS': ['tailwind'],
  'Three.js': ['threejs', '3d web'],
  'Framer Motion': ['framer'],
  'scikit-learn': ['sklearn', 'scikit'],
  'LLM APIs': ['llm', 'llms', 'gpt', 'openai', 'gpt 4o', 'gpt4o', 'chatgpt api'],
  'Prompt Eng.': ['prompt engineering', 'prompting'],
  'Node.js': ['node', 'nodejs'],
  'REST APIs': ['rest', 'rest api', 'api development'],
  'Jetpack Compose': ['compose', 'jetpack'],
  'Git / GitHub': ['git', 'version control'],
  Express: ['expressjs'],
  Python: ['python3'],
};

const CERT_ALIASES: Record<string, string[]> = {
  'front-end-web-dev': ['front end web developer', 'front end certification', 'web developer certification', 'frontend certificate'],
  html5: ['html', 'html5'],
  css3: ['css', 'css3'],
  javascript: ['javascript', 'js'],
  'applied-gen-ai': ['applied generative ai', 'applied gen ai', 'generative ai', 'gen ai', 'genai'],
  'ai-first-software-engineering': ['ai first software engineering', 'ai first'],
  'openai-gpt-models': ['openai gpt models', 'gpt models', 'openai models'],
  'gpt-3-for-developers': ['gpt 3 for developers', 'gpt 3', 'gpt3'],
  'prompt-engineering': ['prompt engineering'],
  'basics-of-python': ['basics of python', 'python basics', 'basic python'],
  'python-fundamentals-part1': ['python fundamentals part 1', 'fundamentals part 1', 'python part 1'],
  'python-fundamentals-part2': ['python fundamentals part 2', 'fundamentals part 2', 'python part 2'],
};

const APP_ALIASES: Partial<Record<ToolApp, string[]>> = {
  thispc: ['this pc', 'file explorer', 'files app', 'my pc', 'explorer'],
  museum: ['museum', 'musium', 'exhibition hall', '3d hall', 'மியூசியம்'],
  arcade: ['arcade', 'neon snake', 'snake game', 'snake', 'game app'],
  terminal: ['terminal', 'command line', 'console'],
  mail: ['mail app', 'email app', 'open mail', 'open email', 'send a message'],
  settings: ['settings'],
  music: ['music', 'music app'],
  about: ['about system', 'about app', 'system info'],
};

// His name says who, not what: left in, it pulls every question towards "who is he".
const HIS_NAME = new Set(['nithesh', 'nitheshs', 'ramachandran', 'நித்தேஷ்', 'நிதேஷ்', 'நித்தேஷோட', 'நித்தேஷுக்கு']);

const CERT_WORDS = new Set(['cert', 'certs', 'certificate', 'certificates', 'certification', 'certifications', 'certified', 'course', 'badge', 'சான்றிதழ்', 'சர்டிபிகேட்']);

function buildAliases(): Alias[] {
  const out: Alias[] = [];
  const add = (phrases: string[], kind: Kind, id: string) => {
    for (const p of phrases) {
      const phrase = words(p);
      if (phrase.length > 0) out.push({ phrase, kind, id });
    }
  };
  // "This portfolio" is the site itself, which has its own intent.
  for (const p of allProjects) add([...(p.id === 'portfolio' ? [] : [p.name.split(' ·')[0] ?? p.name]), ...(PROJECT_ALIASES[p.id] ?? [])], 'project', p.id);
  for (const item of skillCategories.flatMap((c) => c.items)) add([item, ...(SKILL_ALIASES[item] ?? [])], 'skill', item);
  for (const [item, aliases] of Object.entries(SKILL_ALIASES)) add([item, ...aliases], 'skill', item);
  for (const c of certificateGroups.flatMap((g) => g.certs)) add([c.title, ...(CERT_ALIASES[c.id] ?? [])], 'cert', c.id);
  for (const [app, aliases] of Object.entries(APP_ALIASES)) add(aliases ?? [], 'app', app);
  for (const t of GLOSSARY) add([t.name, ...t.aliases], 'term', t.name);
  // The word "jarvis" alone is the assistant itself; "this portfolio" is matched as a phrase.
  return out.filter((a) => !(a.phrase.length === 1 && a.phrase[0] === 'jarvis')).sort((a, b) => b.phrase.length - a.phrase.length);
}

const ALIASES = buildAliases();
const SINGLE_WORD = ALIASES.filter((a) => a.phrase.length === 1 && (a.phrase[0]?.length ?? 0) >= 6);

const PLACEHOLDER: Record<Kind, string> = { project: 'zproject', skill: 'zskill', cert: 'zcert', app: 'zapp', term: 'zterm' };

/** Several kinds can claim the same words ("python" is a skill and a certificate). */
function choose(matches: Alias[], certContext: boolean): Alias | undefined {
  const by = (kind: Kind) => matches.find((m) => m.kind === kind);
  if (certContext) return by('cert') ?? matches[0];
  return by('project') ?? by('app') ?? by('skill') ?? by('term') ?? by('cert');
}

export function findEntities(text: string): Entities {
  const ws = words(text);
  const certContext = ws.some((w) => CERT_WORDS.has(w));
  const found: Entities = { projects: [], skills: [], certs: [], apps: [], terms: [], delex: '' };
  const out: string[] = [];

  const record = (a: Alias) => {
    if (a.kind === 'project' && !found.projects.includes(a.id)) found.projects.push(a.id);
    if (a.kind === 'skill' && !found.skills.includes(a.id)) found.skills.push(a.id);
    if (a.kind === 'cert' && !found.certs.includes(a.id)) found.certs.push(a.id);
    if (a.kind === 'app' && !found.apps.includes(a.id as ToolApp)) found.apps.push(a.id as ToolApp);
    if (a.kind === 'term' && !found.terms.includes(a.id)) found.terms.push(a.id);
    out.push(PLACEHOLDER[a.kind]);
  };

  for (let i = 0; i < ws.length; ) {
    const word = ws[i] ?? '';
    if (HIS_NAME.has(word)) {
      if (out[out.length - 1] !== 'him') out.push('him');
      i += 1;
      continue;
    }
    const exact = ALIASES.filter((a) => a.phrase.every((p, k) => ws[i + k] === p));
    const longest = exact[0]?.phrase.length ?? 0;
    const hit = choose(exact.filter((a) => a.phrase.length === longest), certContext);
    if (hit) {
      record(hit);
      i += hit.phrase.length;
      continue;
    }
    // Typos: "qurios", "deepgaurd". Only long words, to avoid false matches.
    if (word.length >= 6) {
      const fuzzy = SINGLE_WORD.filter((a) => editDistance(word, a.phrase[0] ?? '', word.length >= 9 ? 2 : 1) <= (word.length >= 9 ? 2 : 1));
      const near = choose(fuzzy, certContext);
      if (near) {
        record(near);
        i += 1;
        continue;
      }
    }
    out.push(word);
    i += 1;
  }

  found.delex = out.join(' ');
  return found;
}
