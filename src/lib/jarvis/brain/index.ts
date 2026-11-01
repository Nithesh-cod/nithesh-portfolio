import {
  allProjects,
  aboutShort,
  certificateGroups,
  certGroupLabel,
  content,
  expertiseAreas,
  myApps,
  myGames,
  panelProjectIds,
  projectById,
  skillCategories,
  skillDescriptions,
  stats,
  tickerLines,
} from '@/lib/content';
import type { Fact } from '@/lib/jarvis/learning';
import type { VisitorMemory } from '@/lib/jarvis/visitorMemory';
import { APP_TITLES } from './appTitles';
import { classify } from './classifier';
import { findEntities, type Entities } from './entities';
import { GLOSSARY, type Term } from './glossary';
import { bestSentences, Index, PASSAGES, STATIC_INDEX, terms, type Hit, type Passage } from './knowledge';
import { TA, TA_PROJECTS } from './tamil';
import { detectLanguage, hasTamil, normalize, words, type Lang } from './text';

/* JARVIS's built-in AI. It works with no API key and no cloud service:
 *   1. approved answers from Nithesh come first
 *   2. the entity matcher finds what the question is about
 *   3. the trained classifier decides what is being asked
 *   4. BM25 search answers detailed questions from the knowledge passages
 *   5. replies are built only from verified facts, in English or Tamil
 * If nothing fits it says so and queues the question for Nithesh. It does not
 * reason freely like a large language model, and it cannot invent an answer. */

export type RepoFact = { name: string; language: string | null; description: string | null; pushed: string; url: string; onPortfolio: boolean };
export type BrainTool = { name: string; input: Record<string, unknown> };
export type Turn = { role: 'user' | 'assistant'; text: string };
export type BrainInput = {
  question: string;
  history: Turn[];
  memory: VisitorMemory | null;
  facts: Fact[];
  repos: RepoFact[];
  /** The review queue is switched on, so a question really can reach Nithesh. */
  learning: boolean;
};
export type BrainReply = { text: string; tools: BrainTool[]; gap?: string; intent: string };

const CONFIDENT = 0.6;
const PLAUSIBLE = 0.4;
const STRONG_COVERAGE = 0.75;
const FACT_COVERAGE = 0.6;

const AI_PROJECTS = ['deepguard', 'testai', 'cropai', 'qurious', 'voxelspeak', 'stock-price-prediction', 'jarvis', 'thozhan'];
const ANDROID_PROJECTS = ['ramji-electronics', 'qurious', 'deepguard'];
const AI_TERMS = new Set(['Machine learning', 'Deep learning', 'Artificial intelligence', 'Neural network', 'Computer vision', 'LLM']);

const listOf = (items: readonly string[], lang: Lang) => {
  if (items.length < 2) return items.join('');
  return lang === 'ta' ? items.join(', ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};
const nameOf = (id: string) => projectById(id)?.name ?? id;
const short = (id: string) => nameOf(id).split(' ·')[0] ?? id;
const certs = certificateGroups.flatMap((g) => g.certs);
const firstSentences = (text: string, n: number) => text.split(/(?<=[.!?])\s+/).slice(0, n).join(' ');

const toPassage = (f: Fact, i: number): Passage => ({ id: `fact:${i}`, source: 'approved', title: f.question, text: f.answer });
const repoPassage = (r: RepoFact, i: number): Passage => ({
  id: `repo:${i}`,
  source: 'github',
  title: r.name.replace(/[-_]/g, ' '),
  text: `${r.name} on GitHub: ${r.description ?? 'no description yet'}. ${r.language ? `Written mainly in ${r.language}. ` : ''}Last updated ${r.pushed}. Code: ${r.url}.`,
});

/** Words that carry no topic: used to spot the real subject of a detailed question. */
const GENERIC = new Set(terms('project work build built make made use used detail details explain describe more info information what which does did has have tell about stack tech technology link site code repo demo live open show see'));

function lastProject(history: Turn[]): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn) {
      const id = findEntities(turn.text).projects[0];
      if (id) return id;
    }
  }
  return undefined;
}

function chatLanguage(history: Turn[], memory: VisitorMemory | null): Lang | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn?.role !== 'user') continue;
    const { intent, confidence } = classify(findEntities(turn.text).delex);
    if (confidence >= CONFIDENT && intent === 'lang_ta') return 'ta';
    if (confidence >= CONFIDENT && intent === 'lang_en') return 'en';
  }
  return memory?.language ?? null;
}

const ROLE_WORDS: [RegExp, string][] = [
  [/\b(recruiter|hiring manager|talent|hr)\b/i, 'recruiter'],
  [/\b(engineer|developer|programmer)\b/i, 'engineer'],
  [/\b(student|fresher)\b|மாணவ/i, 'student'],
  [/\b(founder|ceo|cto)\b/i, 'founder'],
];
const NOT_NAMES = new Set(`a an the recruiter student engineer developer founder hiring from looking here just working interested fine good ok okay hr with at in on not also very really new back from curious trying`.split(' '));

function readIntroduction(question: string): { name: string; role: string } {
  const match = question.match(/(?:my name is|my names|i am|i'm|im|this is|naan|en peru|என் பேரு|என் பெயர்|நான்)\s+([\p{L}\p{M}][\p{L}\p{M}.'-]{1,30})/iu);
  const candidate = match?.[1]?.replace(/[.,]$/, '') ?? '';
  const name = candidate && !NOT_NAMES.has(candidate.toLowerCase()) ? candidate.charAt(0).toUpperCase() + candidate.slice(1) : '';
  const role = ROLE_WORDS.find(([re]) => re.test(question))?.[1] ?? 'unknown';
  return { name, role };
}

/** The subject of a skill question when it isn't in the gazetteer: "does he know rust" → "rust". */
function unknownTopic(question: string): string {
  const filler = new Set(`does do did he is can his has have him know knows use uses used using work worked with in on at good how the a an about any experience nithesh theriyuma therinjirukka avarukku தெரியுமா அவருக்கு skills skill code program please jarvis`.split(/\s+/));
  const rest = words(question).filter((w) => !filler.has(w));
  return rest.slice(-2).join(' ');
}

function term(entities: Entities, question: string): Term | undefined {
  const ws = words(question);
  const name = entities.terms[0];
  if (name) return GLOSSARY.find((t) => t.name === name);
  const skill = entities.skills[0];
  if (skill) {
    const lower = skill.toLowerCase();
    const found = GLOSSARY.find((t) => t.name.toLowerCase() === lower || t.aliases.includes(lower) || t.aliases.some((a) => ws.join(' ').includes(a)));
    if (found) return found;
  }
  if (ws.includes('ai')) return GLOSSARY.find((t) => t.name === 'Artificial intelligence');
  if (ws.includes('ml')) return GLOSSARY.find((t) => t.name === 'Machine learning');
  return undefined;
}

function projectsUsing(skill: string): string[] {
  const needle = skill.toLowerCase().replace(/[.\s/]+/g, ' ').trim();
  return allProjects.filter((p) => `${p.stack.join(' ')} ${p.summary}`.toLowerCase().replace(/[.\s/]+/g, ' ').includes(needle)).map((p) => p.id);
}

export function think(input: BrainInput): BrainReply {
  const { question, history, memory, facts, repos, learning } = input;
  const preferred = chatLanguage(history, memory);
  const said = detectLanguage(question);
  const lang: Lang = hasTamil(question) || said === 'ta' ? 'ta' : (preferred ?? 'en');
  const T = (en: string, ta: string) => (lang === 'ta' ? ta : en);
  const tools: BrainTool[] = [];
  const entities = findEntities(question);
  const { intent: rawIntent, confidence } = classify(entities.delex);
  const context = entities.projects[0] ?? lastProject(history);
  const visitor = memory?.name;
  const previous = history.map((t) => t.text).join('\n');

  const done = (text: string, intent: string, gap?: string): BrainReply => ({ text, tools, gap, intent });
  const remember = (patch: { name?: string; role?: string; reply_language?: string; interests?: string[] }) =>
    tools.push({ name: 'remember_visitor', input: { name: patch.name ?? '', role: patch.role ?? 'unknown', reply_language: patch.reply_language ?? 'unknown', interests: patch.interests ?? [] } });
  const noteInterest = (topic: string) => {
    if (!memory?.interests.includes(topic) && !previous.includes(topic)) remember({ interests: [topic] });
  };
  const unknown = (intent: string) =>
    done(
      learning
        ? T(
            `I don’t have that information about Nithesh yet. I’ve passed the question to him, or you can email ${content.contact.email} for a direct answer.`,
            `அந்த தகவல் என்கிட்ட இன்னும் இல்ல. கேள்வியை நித்தேஷுக்கு அனுப்பிட்டேன், இல்லன்னா ${content.contact.email}-க்கு நேரடியா mail பண்ணலாம்.`,
          )
        : T(
            `I don’t have that information about Nithesh. You can email ${content.contact.email} for a direct answer.`,
            `அந்த தகவல் என்கிட்ட இல்ல. ${content.contact.email}-க்கு நேரடியா mail பண்ணி கேட்கலாம்.`,
          ),
      intent,
      question,
    );

  /* 1. Nithesh's own answers outrank everything. */
  if (facts.length > 0) {
    const hit = new Index(facts.map(toPassage)).search(question, 1)[0];
    if (hit && hit.coverage >= FACT_COVERAGE) return done(hit.passage.text, 'approved');
  }

  /* 2. Passage search, including repositories JARVIS read from GitHub. */
  const index = repos.length ? new Index([...PASSAGES, ...repos.map(repoPassage)]) : STATIC_INDEX;
  const fromDocs = (hit: Hit, query: string): string => {
    const text = bestSentences(hit.passage, query);
    const prefix = hit.passage.source === 'readme' ? T(`From the ${hit.passage.title.split(':')[0]} README: `, `README-ல இருந்து: `) : hit.passage.source === 'github' ? T('From his GitHub: ', 'அவரோட GitHub-ல இருந்து: ') : lang === 'ta' ? 'இது English-ல இருக்கு: ' : '';
    return `${prefix}${text}`;
  };

  // A specific question about a project, such as "how many tests does Qurious have".
  const detail = (project: string): string | null => {
    const topic = terms(question).filter((t) => !GENERIC.has(t) && !terms(nameOf(project)).includes(t));
    if (topic.length === 0) return null;
    const hit = index.search(topic.join(' '), 3, project)[0];
    return hit && hit.coverage >= 0.5 ? fromDocs(hit, topic.join(' ')) : null;
  };

  const searchAnswer = (): BrainReply | null => {
    const hit = index.search(question, 3)[0];
    return hit && hit.coverage >= STRONG_COVERAGE && terms(question).length >= 2 ? done(fromDocs(hit, question), 'search') : null;
  };

  // A repository he hasn't added to the portfolio yet, known only from GitHub.
  const asked = words(question);
  const newRepo = repos.find((r) => !r.onPortfolio && asked.includes(normalize(r.name)));
  if (newRepo) {
    const about = newRepo.description ? ` ${newRepo.description}.` : '';
    return done(
      T(
        `${newRepo.name} is one of his GitHub repositories, not yet on the portfolio.${about}${newRepo.language ? ` Written mainly in ${newRepo.language}.` : ''} Last updated ${newRepo.pushed}. Code: ${newRepo.url}.`,
        `${newRepo.name} அவரோட GitHub repository, portfolio-ல இன்னும் சேர்க்கல.${about} Code: ${newRepo.url}.`,
      ),
      'github',
    );
  }

  // Questions that lean on the conversation: "how many tests does it have".
  const pointsBack = /\b(it|its|this|that|they|them|those|the project|the app)\b|அது|இது|அதுல|இதுல/i.test(question);
  const unsure = confidence < CONFIDENT || rawIntent === 'offtopic' || rawIntent === 'personal_unknown' || rawIntent === 'identity';
  if (context && !entities.projects[0] && (pointsBack || unsure)) {
    const followUp = detail(context);
    if (followUp) return done(followUp, 'follow_up');
  }

  let intent = rawIntent;
  if (unsure) {
    const found = searchAnswer();
    if (found) return found;
    if (confidence < PLAUSIBLE) return unknown('unknown');
  }

  // "Machine learning projects" is the AI list, not a single-skill lookup.
  if (intent === 'by_skill' && entities.terms.some((t) => AI_TERMS.has(t))) intent = 'ai_projects';

  /* 3. Answer. */
  const projectCard = (id: string): string => {
    const p = projectById(id);
    if (!p) return '';
    return lang === 'ta' ? (TA_PROJECTS[id] ?? p.summary) : `${p.name}: ${p.summary}`;
  };
  const projectNames = (ids: readonly string[]) => listOf(ids.map(short), lang);
  const offerOpen = (id: string) => T(` Want me to open ${short(id)}?`, ` ${short(id)}-ஐ திறக்கட்டுமா?`);
  const needProject = () =>
    done(T(`Which project do you mean? He has ${stats.projects}, including ${projectNames(panelProjectIds.slice(0, 3))}.`, `எந்த project-னு சொல்லுங்க. மொத்தம் ${stats.projects} இருக்கு, ${projectNames(panelProjectIds.slice(0, 3))} உட்பட.`), intent);

  switch (intent) {
    case 'greet':
      return done(
        visitor
          ? T(`Hello ${visitor}, good to see you again. What would you like to know about Nithesh?`, `வணக்கம் ${visitor}! மறுபடி பார்த்ததுல சந்தோஷம். நித்தேஷ் பத்தி என்ன தெரிஞ்சுக்கணும்?`)
          : T('Hello, I’m JARVIS. Ask me about Nithesh’s projects, skills, certificates or how to reach him.', 'வணக்கம், நான் JARVIS. நித்தேஷோட projects, skills, certificates பத்தி கேளுங்க.'),
        intent,
      );
    case 'thanks':
      return done(T('You’re welcome. Anything else you’d like to know?', 'பரவாயில்ல! வேற ஏதாவது தெரிஞ்சுக்கணுமா?'), intent);
    case 'bye':
      return done(T('Goodbye, and thanks for visiting Nithesh’s portfolio.', 'நன்றி, மறுபடி வாங்க!'), intent);
    case 'howareyou':
      return done(T('All systems are running well, thanks. What can I show you?', 'நல்லா இருக்கேன், நன்றி! உங்களுக்கு என்ன காட்டட்டும்?'), intent);
    case 'identity':
      return done(T('I’m JARVIS, the AI assistant built into Nithesh’s portfolio. I know his projects, skills and certificates, and I can open things on screen for you.', 'நான் JARVIS, நித்தேஷோட portfolio-ல இருக்கிற AI assistant. அவரோட projects, skills, certificates எல்லாம் தெரியும், screen-ல திறந்தும் காட்டுவேன்.'), intent);
    case 'human_check':
      return done(T('I’m an AI assistant, not a person, and I’m not Nithesh. For a direct reply from him, use the Mail app.', 'நான் ஒரு AI assistant, மனுஷன் இல்ல, நித்தேஷும் இல்ல. அவர்கிட்ட நேரடியா பேச Mail app-ஐ use பண்ணுங்க.'), intent);
    case 'capabilities':
      return done(
        T(
          'I can tell you about Nithesh’s projects, skills, experience and certificates, explain the technology behind them, open apps and projects on screen, and give you his resume. Try "What is Qurious?", "Does he know Python?" or "Open the museum".',
          'நித்தேஷோட projects, skills, experience, certificates பத்தி சொல்லுவேன், technology-ஐ விளக்குவேன், apps-ஐ திறப்பேன், resume-ம் கொடுப்பேன். "Qurious என்ன?" இல்லன்னா "Python தெரியுமா?"னு கேட்டுப் பாருங்க.',
        ),
        intent,
      );
    case 'how_learn':
      return done(
        T(
          'I was trained on questions about Nithesh in English, Tanglish and Tamil. I read his public GitHub automatically, remember returning visitors only in their own browser, and learn new facts about him only from answers he has approved. A visitor can’t teach me facts about him.',
          'நித்தேஷ் பத்தின கேள்விகளை English, Tanglish, தமிழ்ல வச்சு என்னை train பண்ணிருக்காங்க. அவரோட public GitHub-ஐ தானா படிப்பேன், visitors-ஐ அவங்க browser-ல மட்டும் ஞாபகம் வச்சுப்பேன், புது தகவல்களை அவர் approve பண்ணதுல இருந்து மட்டும் கத்துப்பேன்.',
        ),
        intent,
      );
    case 'engine':
      return done(
        T(
          'Right now you’re talking to my built-in AI: a small model trained on Nithesh’s portfolio that runs inside this site. It answers from verified facts and isn’t ChatGPT or Claude. When a Claude connection is active, Claude Opus 5.5 answers instead.',
          'இப்போ நீங்க பேசுறது என்னோட built-in AI-ஓட: நித்தேஷோட portfolio-வச்சு train பண்ணின சின்ன model, இந்த site-க்குள்ளயே ஓடுது. ChatGPT-யும் இல்ல, Claude-ம் இல்ல. Claude connection இருக்கும்போது Claude Opus 5.5 பதில் சொல்லும்.',
        ),
        intent,
      );

    case 'bio':
      return done(lang === 'ta' ? TA.bio : `${content.hero.name}. ${aboutShort}`, intent);
    case 'education':
      return done(lang === 'ta' ? TA.education : `${content.education.degree} at ${content.education.school}. He expects to graduate in ${content.education.expected}.`, intent);
    case 'location':
      return done(lang === 'ta' ? TA.location : `He’s based in ${content.hero.location}.`, intent);
    case 'experience': {
      const e = content.experience[0];
      if (lang === 'ta' || !e) return done(TA.experience, intent);
      return done(`${e.role} at ${e.org}, ${e.period}. ${e.bullets.join(' ')}`, intent);
    }
    case 'availability':
      return done(
        `${lang === 'ta' ? TA.availability : `Yes. ${tickerLines[0]}.`}${T(` The quickest way to reach him is ${content.contact.email}, or I can open the Mail app.`, ` ${content.contact.email}-ல தொடர்பு கொள்ளலாம், இல்லன்னா Mail app-ஐ திறக்கட்டுமா?`)}`,
        intent,
      );
    case 'why_hire':
      return done(
        T(
          `Here’s the evidence. He has built ${stats.projects} projects, ${stats.liveApps} of them live. Qurious was cross-checked against Qiskit Aer with 448 automated tests, and DeepGuard reached ROC AUC 0.919 on a frozen out-of-distribution test. He takes work from model to deployed product.`,
          `ஆதாரத்தோட சொல்றேன்: ${stats.projects} projects கட்டிருக்காரு, ${stats.liveApps} live-ல இருக்கு. Qurious-ஐ Qiskit Aer-ஓட cross-check பண்ணி 448 tests எழுதிருக்காரு. DeepGuard frozen out-of-distribution test-ல ROC AUC 0.919 எடுத்துருக்கு.`,
        ),
        intent,
      );
    case 'contact':
      return done(T(`Email ${content.contact.email}, phone ${content.contact.phone}, LinkedIn ${content.contact.linkedin}, GitHub ${content.contact.github}. You can also send a message from the Mail app.`, `Email ${content.contact.email}, phone ${content.contact.phone}, LinkedIn ${content.contact.linkedin}, GitHub ${content.contact.github}. Mail app-லயும் message அனுப்பலாம்.`), intent);
    case 'email':
      return done(T(`His email is ${content.contact.email}.`, `அவரோட email: ${content.contact.email}.`), intent);
    case 'phone':
      return done(T(`His number is ${content.contact.phone}.`, `அவரோட number: ${content.contact.phone}.`), intent);
    case 'linkedin':
      return done(T(`His LinkedIn is ${content.contact.linkedin}.`, `அவரோட LinkedIn: ${content.contact.linkedin}.`), intent);
    case 'github':
      return done(T(`His GitHub is ${content.contact.github}.`, `அவரோட GitHub: ${content.contact.github}.`), intent);
    case 'live_site':
      return done(T(`This portfolio lives at ${content.liveUrl}.`, `இந்த portfolio: ${content.liveUrl}.`), intent);

    case 'projects_all':
      return done(
        T(
          `He has built ${stats.projects} projects, ${stats.liveApps} of them live. The strongest are ${projectNames(panelProjectIds.slice(0, 3))}. Ask about any of them, or open This PC to browse them all.`,
          `மொத்தம் ${stats.projects} projects கட்டிருக்காரு, ${stats.liveApps} live-ல இருக்கு. முக்கியமானவை ${projectNames(panelProjectIds.slice(0, 3))}. ஏதாவது ஒண்ணு பத்தி கேளுங்க, இல்லன்னா This PC-ல எல்லாத்தையும் பாருங்க.`,
        ),
        intent,
      );
    case 'project_info':
    case 'project_stack':
    case 'project_link':
    case 'project_open': {
      const id = context;
      if (!id) return needProject();
      const p = projectById(id);
      if (!p) return needProject();
      noteInterest(short(id));
      if (intent === 'project_open') {
        tools.push({ name: 'open_project', input: { project_id: id } });
        return done(T(`Opening ${short(id)}.`, `${short(id)}-ஐ திறக்கிறேன்.`), intent);
      }
      if (intent === 'project_stack') return done(T(`${short(id)} uses ${listOf([...p.stack], 'en')}.`, `${short(id)}-ல use பண்ணது: ${p.stack.join(', ')}.`), intent);
      if (intent === 'project_link') {
        const links = [p.url && T(`Live: ${p.url}`, `Live: ${p.url}`), p.repo && T(`Code: ${p.repo}`, `Code: ${p.repo}`)].filter(Boolean).join('. ');
        return done(links ? `${links}.` : T(`${short(id)} has no public link yet.`, `${short(id)}-க்கு இன்னும் public link இல்ல.`), intent);
      }
      const specific = entities.projects[0] ? detail(id) : null;
      return done(specific ?? `${projectCard(id)}${offerOpen(id)}`, intent);
    }
    case 'more': {
      const id = context;
      if (!id) return done(T('Tell me which project or topic you’d like more on.', 'எந்த project பத்தி இன்னும் தெரிஞ்சுக்கணும்னு சொல்லுங்க.'), intent);
      const fresh = index.search(`${nameOf(id)} ${question}`, 12, id).find((h) => !previous.includes(firstSentences(h.passage.text, 1)) && h.passage.source !== 'portfolio');
      if (!fresh) return done(T(`That’s everything I have on ${short(id)}. Want the link, or another project?`, `${short(id)} பத்தி என்கிட்ட இருக்கிறது அவ்வளவுதான். Link வேணுமா?`), intent);
      return done(fromDocs(fresh, question), intent);
    }
    case 'best_project':
      return done(T(`His strongest work, in his own order: ${projectNames(panelProjectIds)}. I’d start with ${short(panelProjectIds[0] ?? 'qurious')}.${offerOpen(panelProjectIds[0] ?? 'qurious')}`, `அவரோட முக்கியமான work: ${projectNames(panelProjectIds)}. ${short(panelProjectIds[0] ?? 'qurious')}-ல இருந்து ஆரம்பிக்கலாம்.${offerOpen(panelProjectIds[0] ?? 'qurious')}`), intent);
    case 'ai_projects':
      noteInterest('AI work');
      return done(
        `${T(`His AI work: ${projectNames(AI_PROJECTS)}.`, `அவரோட AI projects: ${projectNames(AI_PROJECTS)}.`)} ${lang === 'ta' ? (TA_PROJECTS.deepguard ?? '') : projectCard('deepguard')}`,
        intent,
      );
    case 'android_projects':
      noteInterest('Android work');
      return done(
        T(
          `${short('ramji-electronics')} is his native Android app, built with Kotlin and Jetpack Compose. Qurious also ships as an offline Android APK, and DeepGuard has an Android app.`,
          `${short('ramji-electronics')} அவரோட native Android app, Kotlin, Jetpack Compose-ல கட்டியது. Qurious-க்கும் offline Android APK இருக்கு, DeepGuard-க்கும் Android app இருக்கு.`,
        ),
        intent,
      );
    case 'web_projects': {
      const live = allProjects.filter((p) => p.url).map((p) => p.id);
      return done(T(`${live.length} of his projects are live on the web: ${projectNames(live)}.`, `${live.length} projects web-ல live-ஆ இருக்கு: ${projectNames(live)}.`), intent);
    }
    case 'by_skill':
    case 'skill_check': {
      const glossed = term(entities, question);
      const skill = entities.skills[0] ?? glossed?.name;
      if (!skill) {
        const topic = unknownTopic(question);
        return { ...done(T(`I can’t confirm that${topic ? ` for ${topic}` : ''}: it isn’t in his listed skills or projects. You can ask him at ${content.contact.email}.`, `அது அவரோட skills, projects list-ல இல்ல, அதனால உறுதியா சொல்ல முடியல. ${content.contact.email}-ல கேட்கலாம்.`), intent), gap: question };
      }
      const used = projectsUsing(skill.split(' /')[0] ?? skill);
      const line = skillDescriptions[skill];
      if (!line && used.length === 0 && !glossed?.seen) {
        return { ...done(T(`I can’t confirm ${skill}: it isn’t in his listed skills or projects. You can ask him at ${content.contact.email}.`, `${skill} அவரோட list-ல இல்ல, அதனால உறுதியா சொல்ல முடியல. ${content.contact.email}-ல கேட்கலாம்.`), intent), gap: question };
      }
      noteInterest(skill);
      const repeats = used[0] !== undefined && (line ?? '').includes(short(used[0]));
      const usedLine = used.length && !repeats ? T(` Used in ${projectNames(used.slice(0, 5))}.`, ` ${projectNames(used.slice(0, 5))}-ல use பண்ணிருக்காரு.`) : '';
      return done(`${intent === 'skill_check' ? T('Yes. ', 'ஆமா. ') : ''}${line ?? glossed?.seen ?? ''}${usedLine}`.trim(), intent);
    }
    case 'recent_repos': {
      const latest = repos.slice(0, 3);
      if (latest.length === 0) return done(`${tickerLines[1]}. ${tickerLines[2]}.`, intent);
      const lines = latest.map((r) => T(`${r.name} (updated ${r.pushed})`, `${r.name} (${r.pushed}-ல update)`));
      return done(T(`Most recently on GitHub: ${listOf(lines, 'en')}.`, `GitHub-ல சமீபத்தில: ${lines.join(', ')}.`), intent);
    }
    case 'skills_all':
      return done(
        lang === 'ta'
          ? `அவரோட skills: ${skillCategories.map((c) => `${c.title}: ${c.items.join(', ')}`).join('. ')}.`
          : skillCategories.map((c) => `${c.title}: ${c.items.join(', ')}.`).join(' '),
        intent,
      );
    case 'skill_area': {
      const q = words(question).join(' ');
      const area = /back ?end|server|api/.test(q) ? 'backend' : /data|sql|database/.test(q) ? 'data' : /mobile|android|deploy|devops|cloud/.test(q) ? 'mobile' : /\bai\b|\bml\b|machine/.test(q) ? 'ai' : 'frontend';
      const a = expertiseAreas.find((e) => e.id === area) ?? expertiseAreas[0];
      if (!a) return unknown(intent);
      return done(`${a.title}: ${a.blurb} ${a.items.join(', ')}.`, intent);
    }
    case 'certs_all':
      return done(
        T(
          `He holds ${stats.certificates} Infosys Springboard certificates: ${certificateGroups.map((g) => `${g.certs.length} in ${certGroupLabel(g.heading)}`).join(', ')}. Open the Certificates app to see them.`,
          `${stats.certificates} Infosys Springboard certificates வச்சிருக்காரு: ${certificateGroups.map((g) => `${certGroupLabel(g.heading)} ${g.certs.length}`).join(', ')}. Certificates app-ல பார்க்கலாம்.`,
        ),
        intent,
      );
    case 'cert_info':
    case 'cert_open': {
      const c = certs.find((x) => x.id === entities.certs[0]);
      if (!c) return unknown(intent);
      if (intent === 'cert_open') {
        tools.push({ name: 'open_certificate', input: { certificate_id: c.id } });
        return done(T(`Opening his ${c.title} certificate.`, `${c.title} certificate-ஐ திறக்கிறேன்.`), intent);
      }
      return done(T(`Yes: ${c.title}, from ${c.issuer}, issued ${c.date}.`, `ஆமா: ${c.title}, ${c.issuer}, ${c.date}.`), intent);
    }
    case 'resume_get':
      tools.push({ name: 'download_resume', input: {} });
      return done(T('Starting the download of his one-page resume now.', 'Resume download ஆரம்பிக்குது.'), intent);
    case 'resume_open':
      tools.push({ name: 'open_app', input: { app: 'resume' } });
      return done(T('Opening his resume.', 'Resume-ஐ திறக்கிறேன்.'), intent);
    case 'resume_summary':
      return done(
        T(
          `${content.education.degree}, expected ${content.education.expected}. ${stats.projects} projects, led by ${projectNames(panelProjectIds.slice(0, 2))}. Internship at ${content.experience[0]?.org ?? 'CodeAlpha'}. ${stats.certificates} certificates. His strongest project is ${short(panelProjectIds[0] ?? 'qurious')}: ${firstSentences(projectById(panelProjectIds[0] ?? 'qurious')?.summary ?? '', 2)}`,
          `${TA.education} ${stats.projects} projects, ${TA.experience} ${stats.certificates} certificates.`,
        ),
        intent,
      );
    case 'open_app': {
      const app = entities.apps[0];
      if (!app) return done(T('Which app should I open? This PC, Museum, Arcade, Terminal, Mail, Settings or Music?', 'எந்த app திறக்கட்டும்? This PC, Museum, Arcade, Terminal, Mail, Settings, Music?'), intent);
      tools.push({ name: 'open_app', input: { app } });
      return done(T(`Opening ${APP_TITLES[app]}.`, `${APP_TITLES[app]}-ஐ திறக்கிறேன்.`), intent);
    }
    case 'games':
      return done(T(`He plays ${listOf(myGames.map((g) => g.title), 'en')}. You can play Neon Snake right here in the Arcade.`, `${myGames.map((g) => g.title).join(', ')} விளையாடுவாரு. Arcade-ல Neon Snake விளையாடலாம்.`), intent);
    case 'setup':
      return done(T(`On his PC he uses ${listOf([...myApps], 'en')}.`, `அவரோட PC-ல ${myApps.join(', ')} இருக்கு.`), intent);
    case 'site_tech':
      return done(projectCard('portfolio') + T(' JARVIS OS and this gaming room run on the same stack.', ' JARVIS OS-ம் இந்த gaming room-ம் அதே stack-ல ஓடுது.'), intent);
    case 'hackathon':
      return done(
        T(
          'He built Qurious for Smart India Hackathon 2026, problem statement SIH26140, with Team X FORCE. I don’t have a final result on record, so ask him directly for that.',
          'Smart India Hackathon 2026-க்காக (SIH26140) Team X FORCE-ஓட Qurious கட்டினாரு. Final result என்கிட்ட இல்ல, அவர்கிட்ட நேரடியா கேளுங்க.',
        ),
        intent,
      );
    case 'define': {
      const t = term(entities, question);
      if (!t) {
        const found = searchAnswer();
        return found ?? unknown(intent);
      }
      const line = entities.skills[0] ? skillDescriptions[entities.skills[0]] : undefined;
      return done(`${T('', 'இது English-ல சொல்றேன்: ')}${t.name} is ${t.meaning}${line ? ` ${line}` : t.seen ? ` ${t.seen}` : ''}`, intent);
    }
    case 'personal_unknown':
      return unknown(intent);
    case 'offtopic':
      return done(T('That’s outside what I cover. I’m here for Nithesh’s work: his projects, skills and experience. What would you like to know?', 'அது என் வேலைக்கு வெளியே இருக்கு. நித்தேஷோட projects, skills, experience பத்தி கேளுங்க.'), intent);
    case 'lang_ta':
      remember({ reply_language: 'ta' });
      return done('சரி, இனிமே தமிழ்லயே பேசுறேன். நித்தேஷ் பத்தி என்ன தெரிஞ்சுக்கணும்?', intent);
    case 'lang_en':
      remember({ reply_language: 'en' });
      return done('Sure, I’ll reply in English from now on.', intent);
    case 'intro_self': {
      const { name, role } = readIntroduction(question);
      if (name || role !== 'unknown') remember({ name, role });
      const hello = name ? T(`Nice to meet you, ${name}.`, `வணக்கம் ${name}!`) : T('Good to know.', 'சரி.');
      const next = role === 'recruiter' ? T(' He’s open to Summer 2027 internships. Want his resume?', ' Summer 2027 internships-க்கு தயாரா இருக்காரு. Resume வேணுமா?') : T(' What would you like to know about Nithesh?', ' நித்தேஷ் பத்தி என்ன தெரிஞ்சுக்கணும்?');
      return done(`${hello}${next}`, intent);
    }
    case 'time': {
      const now = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }).format(new Date());
      return done(T(`In Coimbatore it’s ${now}.`, `கோயம்புத்தூர்ல இப்போ ${now}.`), intent);
    }
    case 'affirm': {
      const last = [...history].reverse().find((t) => t.role === 'assistant')?.text ?? '';
      const opened = /Want me to open ([^?]+)\?|([\w .-]+)-ஐ திறக்கட்டுமா\?/.exec(last);
      if (opened) {
        const id = findEntities(opened[1] ?? opened[2] ?? '').projects[0];
        if (id) {
          tools.push({ name: 'open_project', input: { project_id: id } });
          return done(T(`Opening ${short(id)}.`, `${short(id)}-ஐ திறக்கிறேன்.`), intent);
        }
      }
      if (/Mail app/.test(last)) {
        tools.push({ name: 'open_app', input: { app: 'mail' } });
        return done(T('Opening Mail.', 'Mail-ஐ திறக்கிறேன்.'), intent);
      }
      if (/resume/i.test(last)) {
        tools.push({ name: 'download_resume', input: {} });
        return done(T('Starting the resume download.', 'Resume download ஆரம்பிக்குது.'), intent);
      }
      return done(T('Great. What would you like to know?', 'சரி. என்ன தெரிஞ்சுக்கணும்?'), intent);
    }
    case 'deny':
      return done(T('No problem. Ask me anything else about Nithesh.', 'பரவாயில்ல. வேற ஏதாவது கேளுங்க.'), intent);
    case 'forget_me':
      return done(T('Your memory lives only in this browser. Tap Memory at the top of this window, then Forget me, and it’s wiped.', 'உங்க memory இந்த browser-ல மட்டும்தான் இருக்கு. மேல Memory-ஐ தட்டி Forget me அழுத்துங்க.'), intent);
    default:
      return unknown(intent);
  }
}
