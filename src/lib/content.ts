/**
 * Single source of truth for every string the portfolio displays.
 * Never hardcode résumé text in components — import from here.
 */

export type Project = {
  slug: 'cropai' | 'smart-canteen' | 'testai';
  name: string;
  url: string;
  stack: string[];
  /** One-line caption rendered under the console in 3D. */
  caption: string;
  summary: string;
};

export type Experience = {
  role: string;
  org: string;
  period: string;
  bullets: string[];
};

export type Certification = {
  name: string;
  issuer: string;
  date: string;
};

export type SkillGroup = 'Languages' | 'Front-End' | 'AI / Gen AI' | 'Platform' | 'Tools';

export type ContactLink = { label: string; url: string };

export type Content = {
  hero: {
    name: string;
    tagline: string;
    headline: string;
    location: string;
  };
  liveUrl: string;
  contactLinks: readonly ContactLink[];
  about: string;
  projects: readonly Project[];
  skills: Readonly<Record<SkillGroup, readonly string[]>>;
  experience: readonly Experience[];
  education: {
    degree: string;
    school: string;
    expected: string;
  };
  certifications: readonly Certification[];
  contact: {
    email: string;
    phone: string;
    linkedin: string;
    github: string | null;
    resumeUrl: string;
  };
};

export const content: Content = {
  hero: {
    name: 'Nithesh Ramachandran',
    tagline: 'Front-End · Applied AI · Full-Stack',
    headline: 'Building applied AI products on the modern web.',
    location: 'Coimbatore, Tamil Nadu, India',
  },

  liveUrl: 'https://nithesh-portfolio-amber.vercel.app',

  contactLinks: [
    { label: 'Portfolio',    url: 'https://nithesh-portfolio-amber.vercel.app' },
    { label: 'CropAI',       url: 'https://cropaicanopy.netlify.app' },
    { label: 'Smart Canteen',url: 'https://smart-canteen-tau.vercel.app' },
    { label: 'TestAI',       url: 'https://testai-orcin.vercel.app/dashboard' },
    { label: 'LinkedIn',     url: 'https://linkedin.com/in/nithesh-r-ba349032b' },
    { label: 'Email',        url: 'mailto:nithesh.r.ciet@gmail.com' },
  ],

  about:
    'Second-year B.Tech student in Artificial Intelligence and Data Science at Coimbatore Institute of Engineering and Technology, building production web apps that combine modern front-end engineering with practical ML and Generative AI. Three publicly deployed projects span computer-vision-assisted agriculture, full-stack ordering, and LLM-powered tooling. Comfortable shipping end-to-end on the React / Next.js + Vercel / Netlify stack. Open to Summer 2026 software / AI engineering internships.',

  projects: [
    {
      slug: 'cropai',
      name: 'CropAI',
      url: 'https://cropaicanopy.netlify.app',
      stack: ['React', 'ML model', 'Netlify'],
      caption: 'AI crop-health classifier · React + ML',
      summary:
        'Browser-based crop / leaf-health classifier. Upload an image, get an instant prediction — no account, no backend latency. Vision model runs client-side on Netlify with zero server cost. Single-screen, mobile-first UI: upload to diagnosis in two taps.',
    },
    {
      slug: 'smart-canteen',
      name: 'Smart Canteen',
      url: 'https://smart-canteen-tau.vercel.app',
      stack: ['Next.js', 'Vercel'],
      caption: 'Full-stack ordering for a campus canteen · Next.js',
      summary:
        'Full ordering flow — live menu, cart, checkout — for a campus canteen scenario. Persistent client-side cart so users return to in-progress orders without re-selecting items. Mobile-first responsive layout that holds across phone, tablet, and desktop breakpoints. Deployed continuously from GitHub to Vercel.',
    },
    {
      slug: 'testai',
      name: 'TestAI',
      url: 'https://testai-orcin.vercel.app/dashboard',
      stack: ['Next.js', 'LLM API', 'Vercel'],
      caption: 'LLM quiz tool with auth · Next.js + OpenAI',
      summary:
        'Dashboard-based testing tool that uses an LLM to generate topic-driven questions and grade free-text answers in real time. Designed and iterated the prompts for question generation and evaluation until outputs were stable across multiple subject areas. Auth-gated routes and per-user history view.',
    },
  ],

  skills: {
    Languages: ['JavaScript', 'Python', 'TypeScript', 'HTML5', 'CSS3'],
    'Front-End': ['React', 'Next.js', 'Tailwind CSS', 'Responsive UI', 'Accessibility'],
    'AI / Gen AI': ['LLM APIs', 'Prompt Engineering', 'Embeddings', 'RAG', 'scikit-learn'],
    Platform: ['Git', 'GitHub', 'Vercel', 'Netlify', 'REST APIs'],
    Tools: ['VS Code', 'Chrome DevTools', 'Postman', 'Blender (assets)'],
  },

  experience: [
    {
      role: 'Front-End Web Development Intern',
      org: 'CodeAlpha (Remote)',
      period: 'Nov 2025 – Dec 2025',
      bullets: [
        "Delivered the program's task track in HTML, CSS, and JavaScript, with each project reviewed against the submission spec.",
        'Refactored static markup into a component-based structure to cut duplication and standardize styling.',
        'Used Git + GitHub for every deliverable — feature branches, pull requests, and tagged submissions.',
      ],
    },
  ],

  education: {
    degree: 'B.Tech, Artificial Intelligence and Data Science',
    school: 'Coimbatore Institute of Engineering and Technology, Coimbatore, India',
    expected: 'May 2029',
  },

  certifications: [
    { name: 'Applied Generative AI', issuer: 'Infosys Springboard', date: 'Apr 2026' },
    { name: 'Front-End Web Developer', issuer: 'Infosys Springboard', date: 'Feb 2026' },
  ],

  contact: {
    email: 'nithesh.r.ciet@gmail.com',
    phone: '+91 97863-59161',
    linkedin: 'https://linkedin.com/in/nithesh-r-ba349032b',
    // TODO: GITHUB_URL — drop the full URL here when public; UI shows "Coming soon" while null.
    github: null,
    resumeUrl: '/nithesh-ramachandran-resume.pdf',
  },
} as const;

/** World coordinates for the procedural lab.
 *  Origin = centre of the floor. +Z is "out of the screen toward the visitor".
 *  Hologram sits on the back wall (negative Z); contact terminal is deepest. */
export const HOLOGRAM_POS = [0, 1.5, -2] as const;
export const RACK_POS = [4.5, 1.3, -3.2] as const;
export const CRT_POS = [-4.2, 0.9, -2.6] as const;
export const CONTACT_POS = [0, 1.1, -7.5] as const;

export type Station = {
  slug: Project['slug'];
  label: string;
  position: readonly [number, number, number];
};

const STATION_POS = {
  cropai: [-2.8, 0.55, -0.2] as const,
  'smart-canteen': [0, 0.55, -0.8] as const,
  testai: [2.8, 0.55, -0.2] as const,
} as const;

/** Stations in an arc in front of the hologram. Read by Lab.tsx. */
export const stations: readonly Station[] = [
  { slug: 'cropai', label: 'CropAI', position: STATION_POS.cropai },
  { slug: 'smart-canteen', label: 'Smart Canteen', position: STATION_POS['smart-canteen'] },
  { slug: 'testai', label: 'TestAI', position: STATION_POS.testai },
] as const;

/* ────────────────────────  Skills arc + terminal podiums  ──────────────────────── */

// Certifications live ON THE RIGHT-SIDE RACK (RACK_POS) — see Lab.CertificateRack.

// Terminal podiums laid out in an arc around [0, 0.4, 1.8]; visitor stands back.
export const SKILL_ARC_POS = [0, 0.4, 1.8] as const;

export type SkillCategoryId = 'languages' | 'frontend' | 'ai' | 'platform' | 'tools';
export type SkillCategory = {
  id: SkillCategoryId;
  title: string;
  items: readonly string[];
};

export const skillCategories: readonly SkillCategory[] = [
  { id: 'languages', title: 'LANGUAGES',  items: ['JavaScript', 'TypeScript', 'Python', 'HTML5', 'CSS3'] },
  { id: 'frontend',  title: 'FRONT-END',  items: ['React', 'Next.js', 'Tailwind CSS', 'Responsive UI', 'A11y'] },
  { id: 'ai',        title: 'AI / GEN AI', items: ['LLM APIs', 'Prompt Eng.', 'Embeddings', 'RAG', 'scikit-learn'] },
  { id: 'platform',  title: 'PLATFORM',   items: ['Git', 'GitHub', 'Vercel', 'Netlify', 'REST APIs'] },
  { id: 'tools',     title: 'TOOLS',      items: ['VS Code', 'DevTools', 'Postman', 'Blender'] },
] as const;

/* ────────────────────────  Horseshoe arc of 7 terminal podiums  ──────────────────────── */
// V2.5 consolidation: the CRT, 5 skill terminals, and the contact terminal
// all live on a single 160° horseshoe arc centred at HOLOGRAM_POS.
// Order left → right (from camera view): CRT, Languages, Front-End, AI, Platform, Tools, Contact.

export const ARC_CENTER = HOLOGRAM_POS;
// V2.7: radius reduced 5.0 → 3.2 — podiums now sit closer to the hologram so
// the orbit camera (radius ~4.5) comfortably frames the full arc.
export const ARC_RADIUS = 3.2;
const ARC_SPAN_DEG = 160;
const ARC_BASE_DEG = 180; // straight behind hologram (in -Z direction)

export type ArcPodiumKind = 'crt' | 'category' | 'contact';
export type ArcPodium = {
  id: SkillCategoryId | 'crt' | 'contact';
  kind: ArcPodiumKind;
  title: string;
  items: readonly string[];
  position: readonly [number, number, number];
  yaw: number; // y-rotation so the screen faces arc centre
};

// Index by id so strict-undefined doesn't trip on numeric access.
const SKILL_BY_ID: Readonly<Record<SkillCategoryId, readonly string[]>> = Object.fromEntries(
  skillCategories.map((c) => [c.id, c.items] as const),
) as Readonly<Record<SkillCategoryId, readonly string[]>>;

const ARC_DEFS: readonly {
  id: ArcPodium['id'];
  kind: ArcPodiumKind;
  title: string;
  items: readonly string[];
}[] = [
  { id: 'crt',       kind: 'crt',      title: 'TERMINAL',    items: ['help', 'projects', 'skills', 'contact', 'matrix', 'sudo hire-me'] },
  { id: 'languages', kind: 'category', title: 'LANGUAGES',   items: SKILL_BY_ID.languages },
  { id: 'frontend',  kind: 'category', title: 'FRONT-END',   items: SKILL_BY_ID.frontend },
  { id: 'ai',        kind: 'category', title: 'AI / GEN AI', items: SKILL_BY_ID.ai },
  { id: 'platform',  kind: 'category', title: 'PLATFORM',    items: SKILL_BY_ID.platform },
  { id: 'tools',     kind: 'category', title: 'TOOLS',       items: SKILL_BY_ID.tools },
  { id: 'contact',   kind: 'contact',  title: 'CONTACT',     items: ['LinkedIn  ' + 'nithesh-r-ba349032b', 'Email     ' + 'nithesh.r.ciet@gmail.com', 'Open Résumé →'] },
];

export const arcPodiums: readonly ArcPodium[] = ARC_DEFS.map((d, i) => {
  // t in [-0.5, +0.5]; subtract t*span so i=0 (CRT) ends up on the camera-left side
  // (angle 260° → world -X).
  const t = i / (ARC_DEFS.length - 1) - 0.5;
  const angleDeg = ARC_BASE_DEG - t * ARC_SPAN_DEG;
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = ARC_CENTER[0] + ARC_RADIUS * Math.sin(angleRad);
  const z = ARC_CENTER[2] + ARC_RADIUS * Math.cos(angleRad);
  // Yaw rotates the podium's local +Z to point at ARC_CENTER (toward camera-front of arc).
  const yaw = angleRad + Math.PI;
  return { ...d, position: [x, 0, z] as const, yaw };
});

/** One-line context per skill item — shown in CategoryDetailModal. */
export const skillDescriptions: Readonly<Record<string, string>> = {
  // Languages
  JavaScript: 'Primary front-end language across every shipped project.',
  TypeScript: 'Strict mode on Next.js work; default for any new module.',
  Python: 'ML coursework + model training (scikit-learn, light PyTorch).',
  HTML5: 'Semantic markup foundation, accessibility first.',
  CSS3: 'Tailwind-utility-first, occasional bespoke keyframes.',
  // Front-End
  React: 'Primary front-end framework across all 3 shipped projects.',
  'Next.js': 'App Router on Smart Canteen + TestAI; this site too.',
  'Tailwind CSS': 'Design-token-first styling; matches the palette layer.',
  'Responsive UI': 'Mobile-first; tested across phone / tablet / desktop.',
  A11y: 'Keyboard parity, focus traps, semantic landmarks, sr-only fallbacks.',
  // AI / Gen AI
  'LLM APIs': 'OpenAI / Anthropic; iterated prompts in TestAI to stable graders.',
  'Prompt Eng.': 'Prompt-engineering certification + production use in TestAI.',
  Embeddings: 'Vector encodings for similarity + lightweight retrieval.',
  RAG: 'Retrieval-augmented generation patterns from Infosys cert + reading.',
  'scikit-learn': 'Classical ML pipeline for CropAI leaf-health classifier.',
  // Platform
  Git: 'Feature branches, conventional commits, clean history.',
  GitHub: 'CI on Vercel, deploys via push, private projects hosted.',
  Vercel: 'Smart Canteen + TestAI + this portfolio. Auto-deploys from main.',
  Netlify: 'CropAI deployment — single-page client-side ML inference.',
  'REST APIs': 'Standard CRUD + auth-gated endpoints (TestAI dashboard).',
  // Tools
  'VS Code': 'Primary IDE; extensions tuned for TS / Tailwind / Three.',
  DevTools: 'Network / performance profiling; React DevTools.',
  Postman: 'API exploration + request collections for back-end debug.',
  Blender: '3D asset prep (procedural fallback here; learning glTF export).',
};
export type Certificate = {
  id: string;
  title: string;
  issuer: string;
  date: string;
  image: string;
};
export type CertificateGroup = {
  heading: string;
  /** Layout shape used by CertificateWall.tsx. */
  layout: 'grid-2x2' | 'three-plus-two' | 'row-1x3';
  certs: readonly Certificate[];
};

/** Three thematic groups, dates read from each PDF's "on <date>" line. */
export const certificateGroups: readonly CertificateGroup[] = [
  {
    heading: 'FRONT-END',
    layout: 'grid-2x2',
    certs: [
      { id: 'front-end-web-dev', title: 'Front End Web Developer Certification', issuer: 'Infosys Springboard', date: 'Feb 6, 2026', image: '/certificates/png/front-end-web-dev.png' },
      { id: 'html5', title: 'HTML5 — The Language', issuer: 'Infosys Springboard', date: 'Feb 6, 2026', image: '/certificates/png/html5.png' },
      { id: 'css3', title: 'CSS3', issuer: 'Infosys Springboard', date: 'Feb 6, 2026', image: '/certificates/png/css3.png' },
      { id: 'javascript', title: 'JavaScript', issuer: 'Infosys Springboard', date: 'Feb 6, 2026', image: '/certificates/png/javascript.png' },
    ],
  },
  {
    heading: 'GENERATIVE AI',
    layout: 'three-plus-two',
    certs: [
      { id: 'applied-gen-ai', title: 'Applied Generative AI Certification', issuer: 'Infosys Springboard', date: 'Apr 8, 2026', image: '/certificates/png/applied-gen-ai.png' },
      { id: 'ai-first-software-engineering', title: 'AI-first Software Engineering', issuer: 'Infosys Springboard', date: 'Apr 1, 2026', image: '/certificates/png/ai-first-software-engineering.png' },
      { id: 'openai-gpt-models', title: 'Introduction to OpenAI GPT Models', issuer: 'Infosys Springboard', date: 'Apr 1, 2026', image: '/certificates/png/openai-gpt-models.png' },
      { id: 'gpt-3-for-developers', title: 'GPT-3 for Developers', issuer: 'Infosys Springboard', date: 'Apr 1, 2026', image: '/certificates/png/gpt-3-for-developers.png' },
      { id: 'prompt-engineering', title: 'Prompt Engineering', issuer: 'Infosys Springboard', date: 'Apr 1, 2026', image: '/certificates/png/prompt-engineering.png' },
    ],
  },
  {
    heading: 'PROGRAMMING',
    layout: 'row-1x3',
    certs: [
      { id: 'basics-of-python', title: 'Basics of Python', issuer: 'Infosys Springboard', date: 'Mar 12, 2025', image: '/certificates/png/basics-of-python.png' },
      { id: 'python-fundamentals-part1', title: 'Programming Fundamentals using Python — Part 1', issuer: 'Infosys Springboard', date: 'Mar 31, 2025', image: '/certificates/png/python-fundamentals-part1.png' },
      { id: 'python-fundamentals-part2', title: 'Programming Fundamentals using Python — Part 2', issuer: 'Infosys Springboard', date: 'Mar 31, 2025', image: '/certificates/png/python-fundamentals-part2.png' },
    ],
  },
] as const;

/** Camera waypoints — Catmull-Rom path (tension 0.4 in ScrollCamera).
 *  V2.6 redesign: 11-stop ORBIT path that actually circles the hologram,
 *  putting the 7 arc-podiums into view at waypoints 6 / 7 / 8 (left → back →
 *  right). Each project console gets its own close-up. Final shot pulls back
 *  for a hero overview. */
const ARC_CRT_POS = arcPodiums[0]?.position ?? ([-3.2, 0, -1.5] as const);
const ARC_CONTACT_POS = arcPodiums[arcPodiums.length - 1]?.position ?? ([3.2, 0, -1.5] as const);

export const waypoints = [
  // 00 — ENTRANCE: wide overview, take in the whole scene.
  { id: 'entrance',        label: 'ENTRANCE',                  position: [0, 1.8, 5.5] as const,  lookAt: [0, 1.3, -1] as const },
  // 01 — PROJECTS_FRONT: pulled closer to the row of project consoles.
  { id: 'projects-front',  label: 'PROJECTS',                  position: [0, 1.5, 3.0] as const,  lookAt: [0, 0.6, 0] as const },
  // 02-04 — Close-ups on each project console.
  { id: 'console-cropai',  label: 'CONSOLE_1 [ CROPAI ]',      position: [-2.0, 1.0, 1.5] as const, lookAt: STATION_POS.cropai },
  { id: 'console-canteen', label: 'CONSOLE_2 [ SMART_CANTEEN ]', position: [0, 1.0, 1.5] as const, lookAt: STATION_POS['smart-canteen'] },
  { id: 'console-testai',  label: 'CONSOLE_3 [ TESTAI ]',      position: [2.0, 1.0, 1.5] as const, lookAt: STATION_POS.testai },
  // 05 — PORTRAIT: hero shot of the hologram.
  { id: 'portrait',        label: 'PORTRAIT',                  position: [0, 1.5, 1.5] as const,  lookAt: HOLOGRAM_POS },
  // 06 — ORBIT_LEFT: arc around to the left side — lookAt aims at the LEFT
  // half of the podium arc, not the hologram, so CRT + leftmost skills frame.
  { id: 'orbit-left',      label: 'TERMINAL  ARC_LEFT',        position: [-5.5, 1.8, 0.5] as const, lookAt: [-3.0, 1.0, -3.0] as const },
  // 07 — ORBIT_BACK: pulled back to z=-5.5 looking at centre-back of arc,
  // putting the full horseshoe of podiums in frame for the first time.
  { id: 'orbit-back',      label: 'SKILLS  ARC_BACK',          position: [0, 2.0, -5.5] as const,   lookAt: [0, 1.0, -4.0] as const },
  // 08 — ORBIT_RIGHT: mirror of ORBIT_LEFT — frames Contact + rightmost skills.
  { id: 'orbit-right',     label: 'CONTACT  ARC_RIGHT',        position: [5.5, 1.8, 0.5] as const,  lookAt: [3.0, 1.0, -3.0] as const },
  // 09 — CERTIFICATIONS: pull out to see the rack head-on.
  { id: 'certifications',  label: 'CERTIFICATIONS',            position: [4.0, 1.5, 4.0] as const, lookAt: RACK_POS },
  // 10 — FINALE: dramatic high pullback.
  { id: 'finale',          label: 'FINALE',                    position: [0, 3.0, 7.0] as const,  lookAt: [0, 1, 0] as const },
] as const;

export type Waypoint = (typeof waypoints)[number];
