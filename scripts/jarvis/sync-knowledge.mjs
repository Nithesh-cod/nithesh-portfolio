// Collects JARVIS's project documentation into src/lib/jarvis/brain/docs.json:
// the resume's verified bullet points plus each public repo's README.
//   npm run jarvis:sync
// Re-run after changing the resume or a README, then `npm run jarvis:train`.
import { readFileSync, writeFileSync } from 'node:fs';
import { allProjects } from '@/lib/content';

const OUT = 'src/lib/jarvis/brain/docs.json';

// Their READMEs describe older versions or overclaim, so the portfolio text stands alone.
const SKIP_README = new Set(['jarvis', 'portfolio']);
// Setup instructions don't answer questions about the work.
const SKIP_SECTION = /install|getting started|setup|set up|prerequisite|run(ning)?( it)?( locally)?$|connecting|quick ?start|usage|contribut|licen[cs]e|acknowledg|environment|deploy|folder|project structure|repo(sitory)? structure|scripts|commands|development|test(ing)?$|credits|screenshots?/i;

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/g, ' ');

const plain = (html) => decode(html.replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Resume bullets by project: the resume holds the most carefully checked numbers. */
function resumeFacts() {
  const html = readFileSync('resume/resume.html', 'utf8');
  const facts = {};
  const entries = html.split(/<div class="entry">/).slice(1);
  for (const entry of entries) {
    const title = plain(entry.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '').toLowerCase();
    const bullets = [...entry.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => plain(m[1]));
    const project = allProjects.find((p) => title.startsWith(p.name.split(' ·')[0].toLowerCase()));
    if (project && bullets.length) facts[project.id] = bullets;
  }
  return facts;
}

function cleanMarkdown(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');
}

const isBlock = (raw) => /^\s*([-*+]\s|\d+\.\s|\|)/.test(raw);

function line(raw) {
  const text = raw
    .replace(/^\s*[-*+]\s+(\[[ x]\]\s*)?/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/^>\s*/, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^\|?[\s:|-]+\|?$/.test(text)) return '';
  if (text.startsWith('|')) {
    const cells = text.split('|').map((c) => c.trim()).filter(Boolean);
    return cells.length >= 2 ? `${cells[0]}: ${cells.slice(1).join(', ')}.` : '';
  }
  return text;
}

/** Heading + plain sentences for each useful README section. */
function readmeSections(md) {
  const sections = [];
  let heading = 'Overview';
  let body = [];
  const flush = () => {
    const text = body.join(' ').replace(/\s+/g, ' ').trim();
    if (text.length >= 40 && !SKIP_SECTION.test(heading)) sections.push({ heading, text: text.slice(0, 1400) });
    body = [];
  };
  // Hard-wrapped lines belong to one paragraph; list items and table rows stand alone.
  let paragraph = [];
  const endParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) body.push(/[.!?:]$/.test(text) ? text : `${text}.`);
    paragraph = [];
  };
  for (const raw of decode(cleanMarkdown(md)).split('\n')) {
    const h = raw.match(/^#{1,4}\s+(.*)/);
    if (h) {
      endParagraph();
      flush();
      heading = line(h[1]) || heading;
      continue;
    }
    if (!raw.trim()) {
      endParagraph();
      continue;
    }
    if (isBlock(raw)) endParagraph();
    const text = line(raw);
    if (text) paragraph.push(text);
    if (isBlock(raw)) endParagraph();
  }
  endParagraph();
  flush();
  return sections;
}

async function readme(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  const res = await fetch(`https://raw.githubusercontent.com/${match[1]}/${match[2]}/HEAD/README.md`, { signal: AbortSignal.timeout(15000) });
  return res.ok ? res.text() : null;
}

const resume = resumeFacts();
const projects = {};
for (const p of allProjects) {
  const entry = { resume: resume[p.id] ?? [], readme: [] };
  if (p.repo && !SKIP_README.has(p.id)) {
    const md = await readme(p.repo).catch(() => null);
    if (md) entry.readme = readmeSections(md);
  }
  projects[p.id] = entry;
  console.log(`${p.id.padEnd(24)} resume ${String(entry.resume.length).padStart(2)}   readme sections ${entry.readme.length}`);
}

writeFileSync(OUT, `${JSON.stringify({ projects }, null, 1)}\n`);
console.log(`\nwrote ${OUT}`);
