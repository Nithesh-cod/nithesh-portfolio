/**
 * Single source of truth for every string the portfolio displays.
 * Never hardcode résumé text in components — import from here.
 * Counts shown on the site (projects, live apps, certificates, per-tech
 * usage) are derived from the lists below, never typed by hand.
 */

export type FeatureIcon =
  | 'scan' | 'chart' | 'globe' | 'phone' | 'qr' | 'cloud' | 'bot' | 'wrench' | 'atom'
  | 'check' | 'shield' | 'mic' | 'database' | 'file' | 'cube' | 'layers' | 'terminal'
  | 'zap' | 'mail' | 'cpu' | 'user';

type ProjectBase = {
  id: string;
  name: string;
  /** Row subtitle in the in-room PROJECTS panel. */
  short: string;
  summary: string;
  stack: readonly string[];
  url?: string;
  repo?: string;
  status?: 'In progress';
  /** Three tiles under the screenshots in the project detail modal. */
  features: readonly { icon: FeatureIcon; label: string }[];
  /** Captured from the live site; empty when the project has no deployment. */
  screenshots: readonly string[];
};

export type Project = ProjectBase & {
  slug: 'cropai' | 'smart-canteen' | 'testai';
  url: string;
  /** One-line caption rendered under the console in 3D. */
  caption: string;
  /** Short uppercase label on the 3D pedestal nameplate. */
  plate: string;
};

export type OtherProject = ProjectBase & {
  tagline: string;
  repo: string;
};

export type ShowcaseProject = ProjectBase & { tagline: string };

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

/** 'GENERATIVE AI' → 'Generative AI'. */
export function certGroupLabel(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAi\b/g, 'AI');
}

export type SkillCategoryId = 'languages' | 'frontend' | 'ai' | 'platform' | 'tools';
export type SkillCategory = {
  id: SkillCategoryId;
  title: string;
  items: readonly string[];
};

export type ContactLink = { label: string; url: string };

/* ─────────────────────────────  Certificates  ───────────────────────────── */

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

/* ──────────────────────────────────  Skills  ─────────────────────────────── */

export const skillCategories: readonly SkillCategory[] = [
  { id: 'languages', title: 'LANGUAGES',       items: ['TypeScript', 'JavaScript', 'Python', 'Kotlin', 'SQL', 'HTML / CSS'] },
  { id: 'frontend',  title: 'FRONT-END',       items: ['React', 'Next.js', 'Vite', 'Tailwind CSS', 'Three.js', 'Framer Motion'] },
  { id: 'ai',        title: 'AI / ML',         items: ['PyTorch', 'scikit-learn', 'LLM APIs', 'Whisper', 'CLIP', 'Prompt Eng.'] },
  { id: 'platform',  title: 'BACK-END & DATA', items: ['FastAPI', 'Node.js', 'Express', 'Supabase', 'Firebase', 'REST APIs'] },
  { id: 'tools',     title: 'MOBILE & TOOLING', items: ['Jetpack Compose', 'Capacitor', 'Playwright', 'Vitest', 'Git / GitHub', 'Vercel'] },
] as const;

/** One-line context per skill item — shown in CategoryDetailModal. */
export const skillDescriptions: Readonly<Record<string, string>> = {
  // Languages
  TypeScript: 'Default for new front-end code: Qurious, Smart Canteen and this portfolio.',
  JavaScript: 'TestAI and TechFest front-ends, and every CodeAlpha internship task.',
  Python: 'Models, APIs and tooling: DeepGuard, the TestAI back-end, VoxelSpeak, stock forecasting.',
  Kotlin: 'Ramji Electronics, an offline-first Android app built with MVVM and StateFlow.',
  SQL: 'Supabase Postgres schema, row-level-security policies and functions for TestAI.',
  'HTML / CSS': 'Semantic markup and hand-written CSS; Tailwind on most projects.',
  // Front-End
  React: 'Main UI library: TestAI, Qurious, DeepGuard, TechFest, CropAI.',
  'Next.js': 'Smart Canteen and this portfolio.',
  Vite: 'Build tool for TestAI, Qurious, DeepGuard and TechFest.',
  'Tailwind CSS': 'Utility-first styling on TestAI, TechFest and this site.',
  'Three.js': 'Real-time 3D: this portfolio (React Three Fiber) and the talking tutor avatar in Qurious.',
  'Framer Motion': 'Modal and panel transitions on this portfolio.',
  // AI / ML
  PyTorch: "Trained and evaluated DeepGuard's detectors (EfficientNet-B0, CLIP ViT-L/14 linear probe).",
  'scikit-learn': 'Gradient-boosting failure predictor in TestAI; regression baselines for stock forecasting.',
  'LLM APIs': 'GPT-4o test generation in TestAI; Groq, Gemini, OpenRouter and Ollama in Qurious.',
  Whisper: 'Speech recognition for VoxelSpeak and JARVIS.',
  CLIP: "Image embeddings for DeepGuard's v2 detector and VoxelSpeak's asset cache.",
  'Prompt Eng.': 'Prompts for test generation in TestAI; Infosys Springboard Prompt Engineering certificate.',
  // Back-End & Data
  FastAPI: 'Python APIs for TestAI, DeepGuard and VoxelSpeak.',
  'Node.js': 'Runtime for the TechFest Symposium API.',
  Express: 'TechFest API with JWT auth, Helmet, CORS and rate limiting.',
  Supabase: 'Postgres, auth and row-level security behind TestAI.',
  Firebase: 'Firestore data store for TechFest registrations and entry passes.',
  'REST APIs': 'Designed and consumed across every full-stack project.',
  // Mobile & Tooling
  'Jetpack Compose': 'Material 3 UI for Ramji Electronics.',
  Capacitor: 'Packages the Qurious and DeepGuard web apps as Android APKs.',
  Playwright: 'Runs generated tests on Chromium, Firefox and WebKit in TestAI.',
  Vitest: '448 tests in Qurious, including a cross-check against Qiskit Aer.',
  'Git / GitHub': 'Every project is versioned on GitHub at github.com/Nithesh-cod.',
  Vercel: 'Hosts TestAI, Qurious, Smart Canteen and this portfolio.',
};

/* ─────────────────────────────────  Projects  ────────────────────────────── */

const GITHUB = 'https://github.com/Nithesh-cod';
const LIVE_URL = 'https://nithesh-portfolio-amber.vercel.app';

/** The three projects with pedestals in the 3D room. */
const projects: readonly Project[] = [
  {
    id: 'cropai',
    slug: 'cropai',
    name: 'CropAI',
    short: 'Crop vs weed segmentation',
    url: 'https://cropaicanopy.netlify.app',
    stack: ['React', 'Computer Vision', 'Netlify'],
    features: [
      { icon: 'scan', label: 'Pixel-level segmentation' },
      { icon: 'chart', label: 'Weed-pressure index' },
      { icon: 'globe', label: 'Runs in the browser' },
    ],
    screenshots: ['/projects/cropai-desktop.jpg', '/projects/cropai-mobile.jpg'],
    caption: 'Crop vs weed canopy segmentation · React + computer vision',
    plate: 'CROP · WEED SEGMENTATION',
    summary:
      'Upload a field photo and every pixel is classified as crop, weed or soil. The app reports canopy cover, a weed-pressure index and an early-vigor score, and maps weed hotspots with a per-region breakdown. Single-page React app on Netlify; analysis runs in the browser.',
  },
  {
    id: 'smart-canteen',
    slug: 'smart-canteen',
    name: 'Smart Canteen · FastBite',
    short: 'Pre-order · pickup tokens',
    url: 'https://smart-canteen-tau.vercel.app',
    repo: `${GITHUB}/smart-canteen`,
    stack: ['Next.js', 'TypeScript', 'Vercel'],
    features: [
      { icon: 'phone', label: 'Mobile-first' },
      { icon: 'qr', label: 'Digital pickup tokens' },
      { icon: 'cloud', label: 'Deployed on Vercel' },
    ],
    screenshots: ['/projects/smart-canteen-desktop.jpg', '/projects/smart-canteen-mobile.jpg'],
    caption: 'Pre-order campus food for your break slot · Next.js',
    plate: 'PRE-ORDER · PICKUP TOKENS',
    summary:
      'Students pre-order for a scheduled break window, get a digital pickup token, and are alerted when the food is ready, so nobody queues at the counter. Live menu with prices and prep-time estimates, a cart, and a My Orders view. Mobile-first and deployed on Vercel.',
  },
  {
    id: 'testai',
    slug: 'testai',
    name: 'TestAI',
    short: 'AI test automation',
    url: 'https://testai-orcin.vercel.app',
    repo: `${GITHUB}/testai`,
    stack: ['React', 'FastAPI', 'Python', 'Supabase', 'GPT-4o', 'Playwright', 'scikit-learn'],
    features: [
      { icon: 'bot', label: 'GPT-4o test generation' },
      { icon: 'wrench', label: 'Self-healing selectors' },
      { icon: 'chart', label: 'Failure prediction' },
    ],
    screenshots: ['/projects/testai-desktop.jpg', '/projects/testai-mobile.jpg'],
    caption: 'AI test-automation platform · React + FastAPI + GPT-4o',
    plate: 'AI TEST AUTOMATION',
    summary:
      'Paste requirements and GPT-4o writes runnable Playwright, Cypress or Jest tests. Broken selectors are repaired automatically with human approval, flaky tests are ranked by a statistical flakiness score, and a scikit-learn gradient-boosting model predicts which tests will fail before they run. Supabase Postgres with auth and row-level security.',
  },
];

/** Everything else on GitHub worth showing — rendered in the ALL WORK gallery. */
export const otherProjects: readonly OtherProject[] = [
  {
    id: 'qurious',
    name: 'Qurious',
    short: 'SIH 2026 · Quantum lab',
    features: [
      { icon: 'atom', label: '12-qubit simulator' },
      { icon: 'check', label: '448 tests vs Qiskit' },
      { icon: 'phone', label: 'Offline Android APK' },
    ],
    screenshots: ['/projects/qurious-desktop.jpg', '/projects/qurious-mobile.jpg'],
    tagline: 'Quantum computing lab + self-checking AI tutor · Smart India Hackathon 2026',
    summary:
      'Built for SIH 2026 (SIH26140) with Team X FORCE. An on-device statevector simulator (up to 12 qubits) with two-way circuit ↔ code export to OpenQASM 3, Qiskit, Cirq and PennyLane, a noise lab, and a tutor that runs its own answers on the simulator and discards any that disagree. Cross-checked against Qiskit Aer to 6.66 × 10⁻¹⁶; 448 automated tests. Web app plus offline Android APK.',
    stack: ['React', 'TypeScript', 'Three.js', 'Capacitor', 'Vitest', 'Python'],
    url: 'https://qurious-eight.vercel.app',
    repo: `${GITHUB}/qurious`,
  },
  {
    id: 'deepguard',
    name: 'DeepGuard',
    short: 'AI-face detection · PyTorch',
    features: [
      { icon: 'scan', label: 'Evidence heat maps' },
      { icon: 'chart', label: 'ROC AUC 0.919 (OOD)' },
      { icon: 'shield', label: 'Signed PDF reports' },
    ],
    screenshots: [],
    tagline: 'Explainable detection of AI-generated faces',
    summary:
      'Flags faces in photos and video that show signs of being AI-generated, with an evidence heat map and a plain-language explanation. EfficientNet-B0 + Grad-CAM baseline (ROC AUC 0.991 in-distribution) and a CLIP ViT-L/14 linear probe (ROC AUC 0.919 on a frozen 4,241-image out-of-distribution test). One FastAPI engine serves a website, Android app, Telegram bot and signed PDF reports.',
    stack: ['Python', 'PyTorch', 'FastAPI', 'React', 'Capacitor'],
    repo: `${GITHUB}/Deep-Guard`,
  },
  {
    id: 'ramji-electronics',
    name: 'Ramji Electronics',
    short: 'Android billing · Kotlin',
    features: [
      { icon: 'mic', label: 'EN · HI · TA voice input' },
      { icon: 'database', label: 'Fully offline' },
      { icon: 'file', label: 'PDF bill sharing' },
    ],
    screenshots: [],
    tagline: 'Offline-first Android inventory & billing',
    summary:
      'Kotlin + Jetpack Compose + Room (MVVM) app for an electronics shop: products, stock and customer billing with no internet. Voice commands in English, Hindi and Tamil are parsed into intents with fuzzy product matching. Hashed PIN lock, transactional billing, PDF and image bill sharing, CSV export.',
    stack: ['Kotlin', 'Jetpack Compose', 'Room', 'Android'],
    repo: `${GITHUB}/ramji-electronics`,
  },
  {
    id: 'techfest-symposium',
    name: 'TechFest Symposium',
    short: 'Event platform · Express',
    features: [
      { icon: 'qr', label: 'QR entry passes' },
      { icon: 'file', label: 'PDF certificates' },
      { icon: 'shield', label: 'JWT + rate limiting' },
    ],
    screenshots: [],
    tagline: 'College event platform',
    summary:
      'Registration, QR entry passes scanned in the browser, auto-generated PDF certificates, EmailJS confirmations, Razorpay payments and organiser dashboards. Express API with JWT auth, Helmet, CORS and rate limiting over Firestore.',
    stack: ['React', 'Vite', 'Node.js', 'Express', 'Firebase'],
    repo: `${GITHUB}/techfest-symposium`,
  },
  {
    id: 'voxelspeak',
    name: 'VoxelSpeak',
    short: 'Speech → 3D in AR',
    features: [
      { icon: 'mic', label: 'Speech to 3D model' },
      { icon: 'cube', label: 'SD-Turbo → TripoSR' },
      { icon: 'scan', label: 'Marker-based AR' },
    ],
    screenshots: [],
    tagline: 'Speak a description, get a 3D model in desktop AR',
    summary:
      'Whisper transcribes speech, an LLM parses intent, and a CLIP-matched cache or an SD-Turbo → TripoSR pipeline produces a mesh that is anchored to a printed ArUco marker in the webcam feed. MediaPipe hand gestures grab, rotate and scale it.',
    stack: ['Python', 'FastAPI', 'Whisper', 'Stable Diffusion', 'OpenCV'],
    repo: `${GITHUB}/voxelspeak`,
  },
  {
    id: 'stock-price-prediction',
    name: 'Stock Price Prediction',
    short: 'LR · Random Forest · LSTM',
    features: [
      { icon: 'chart', label: 'Three models compared' },
      { icon: 'layers', label: 'MA · RSI · MACD features' },
      { icon: 'globe', label: 'Yahoo Finance data' },
    ],
    screenshots: [],
    tagline: 'Linear Regression, Random Forest and LSTM forecasting',
    summary:
      'Streamlit app that predicts next-day closing prices from Yahoo Finance data with engineered indicators (MA5, MA20, RSI, MACD), compares three models on RMSE, MAE and R² over a chronological split, and charts actual vs predicted.',
    stack: ['Python', 'scikit-learn', 'TensorFlow', 'Streamlit'],
    repo: `${GITHUB}/stock-price-prediction`,
  },
  {
    id: 'jarvis',
    name: 'JARVIS',
    short: 'Multi-agent assistant',
    features: [
      { icon: 'bot', label: 'Specialised agents' },
      { icon: 'mic', label: 'Voice interface' },
      { icon: 'terminal', label: 'PC automation' },
    ],
    screenshots: [],
    tagline: 'Multi-agent desktop AI companion',
    summary:
      'Python desktop assistant with a voice interface and specialised agents for coding, research, email, scheduling and PC automation.',
    stack: ['Python', 'Whisper', 'LLM APIs'],
    repo: `${GITHUB}/jarvis`,
  },
  {
    id: 'portfolio',
    name: 'This portfolio',
    short: '3D portfolio · R3F',
    features: [
      { icon: 'cube', label: 'Real-time 3D room' },
      { icon: 'zap', label: '3 MB compressed avatar' },
      { icon: 'mail', label: 'EmailJS contact form' },
    ],
    screenshots: [],
    tagline: 'Explorable 3D lab · Next.js + React Three Fiber',
    summary:
      'The site you are in: a real-time 3D room with PBR lighting, post-processing, in-world HTML panels, keyboard-accessible proxies, an EmailJS contact form and a scroll-driven camera rig.',
    stack: ['Next.js', 'React', 'TypeScript', 'Three.js', 'GSAP'],
    url: LIVE_URL,
    repo: `${GITHUB}/nithesh-portfolio`,
  },
  {
    id: 'thozhan',
    name: 'Thozhan',
    short: 'Offline Tanglish assistant',
    features: [
      { icon: 'mic', label: 'Tanglish speech' },
      { icon: 'cpu', label: 'Fully local models' },
      { icon: 'user', label: 'Lip-synced avatar' },
    ],
    screenshots: [],
    tagline: 'Offline Tanglish voice assistant with a lip-synced avatar',
    summary:
      'Architecture for a fully local Whisper.cpp → Llama 3.1 8B → XTTS-v2 voice loop driving a 3D avatar. Implemented so far: a shared Tamil/English phonemiser, a code-mixing index controller and a script-blind phoneme error rate. Model backends are still stubbed.',
    stack: ['Python', 'llama.cpp', 'Whisper', 'Three.js'],
    repo: `${GITHUB}/thozhan`,
    status: 'In progress',
  },
];

/* ─────────────────────────────────  Content  ─────────────────────────────── */

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
  skills: Readonly<Record<string, readonly string[]>>;
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
    headline: 'Building applied AI products for the web, Android and desktop.',
    location: 'Coimbatore, Tamil Nadu, India',
  },

  liveUrl: LIVE_URL,

  contactLinks: [
    { label: 'Portfolio', url: LIVE_URL },
    { label: 'GitHub',    url: GITHUB },
    { label: 'LinkedIn',  url: 'https://linkedin.com/in/nithesh-r-ba349032b' },
    { label: 'Email',     url: 'mailto:nithesh.r.ciet@gmail.com' },
  ],

  about:
    'Second-year B.Tech student in Artificial Intelligence and Data Science at Coimbatore Institute of Engineering and Technology. I build applied-AI products end to end: React and Next.js front-ends, FastAPI and Node back-ends, PyTorch and scikit-learn models, shipped to the web, Android and the desktop. Recent work includes Qurious, a quantum-computing tutor built for Smart India Hackathon 2026, and DeepGuard, an explainable detector for AI-generated faces. Open to Summer 2027 software and AI engineering internships.',

  projects,

  skills: Object.fromEntries(skillCategories.map((c) => [c.title, c.items])),

  experience: [
    {
      role: 'Front-End Web Development Intern',
      org: 'CodeAlpha (Remote)',
      period: 'Nov 2025 – Dec 2025',
      bullets: [
        'Built four front-end projects in HTML, CSS and JavaScript (image gallery, calculator, portfolio site, music player), each reviewed against the program spec.',
        'Refactored static markup into a component-based structure to cut duplication and standardise styling.',
        'Shipped every deliverable through Git and GitHub, one public repository per task.',
      ],
    },
  ],

  education: {
    degree: 'B.Tech, Artificial Intelligence and Data Science',
    school: 'Coimbatore Institute of Engineering and Technology, Coimbatore, India',
    expected: 'May 2029',
  },

  certifications: certificateGroups.flatMap((g) =>
    g.certs.map((c) => ({ name: c.title, issuer: c.issuer, date: c.date })),
  ),

  contact: {
    email: 'nithesh.r.ciet@gmail.com',
    phone: '+91 97863-59161',
    linkedin: 'https://linkedin.com/in/nithesh-r-ba349032b',
    github: GITHUB,
    resumeUrl: '/nithesh-ramachandran-resume.pdf',
  },
};

/* ─────────────────────────────  Derived numbers  ─────────────────────────── */

/** Every project, featured first — the in-room PROJECTS panel and ProjectModal read this. */
export const allProjects: readonly ShowcaseProject[] = [
  ...projects.map((p) => ({ ...p, tagline: p.caption })),
  ...otherProjects,
];

export function projectById(id: string): ShowcaseProject | null {
  return allProjects.find((p) => p.id === id) ?? null;
}

export const stats = {
  projects: allProjects.length,
  liveApps: allProjects.filter((p) => p.url).length,
  certificates: content.certifications.length,
} as const;

/** ABOUT ME panel. */
export const aboutShort =
  'AI & Data Science undergrad shipping applied-AI products: web apps, Android apps and ML models, from idea to deploy. Open to Summer 2027 internships.';

/** Cert rack + AllCertsModal subtitle. */
export const certSubtitle = `${stats.certificates} CERTIFICATES · INFOSYS SPRINGBOARD`;

/** MY JOURNEY panel — every line checkable against GitHub, certificates or the résumé. */
export const journey: readonly string[] = [
  'B.Tech · AI & Data Science',
  'CIET · Coimbatore · 2025–29',
  'CodeAlpha front-end intern · 2025',
  'Smart India Hackathon 2026',
  `${stats.certificates} Infosys Springboard certificates`,
  'Open to Summer 2027 internships',
];

/** PROJECTS panel rows (in-room) — strongest work first. */
export const panelProjectIds: readonly string[] = [
  'qurious',
  'deepguard',
  'testai',
  'ramji-electronics',
  'techfest-symposium',
];

export type CertTileIcon = 'sparkles' | 'message' | 'bot' | 'cpu' | 'code' | 'braces' | 'python' | 'trophy' | 'briefcase';

/** CERTIFICATIONS & ACHIEVEMENTS tile grid. `certId` opens that certificate;
 *  `action` opens a related view instead. */
export const certTiles: readonly {
  label: string;
  icon: CertTileIcon;
  certId?: string;
  action?: 'gallery' | 'resume';
}[] = [
  { label: 'GEN AI',      icon: 'sparkles',  certId: 'applied-gen-ai' },
  { label: 'PROMPT ENG.', icon: 'message',   certId: 'prompt-engineering' },
  { label: 'OPENAI GPT',  icon: 'bot',       certId: 'openai-gpt-models' },
  { label: 'AI-FIRST SE', icon: 'cpu',       certId: 'ai-first-software-engineering' },
  { label: 'WEB DEV',     icon: 'code',      certId: 'front-end-web-dev' },
  { label: 'JAVASCRIPT',  icon: 'braces',    certId: 'javascript' },
  { label: 'PYTHON',      icon: 'python',    certId: 'basics-of-python' },
  { label: 'SIH 2026',    icon: 'trophy',    action: 'gallery' },
  { label: 'INTERNSHIP',  icon: 'briefcase', action: 'resume' },
];

/** Games and apps from the gaming-room samples — confirmed by Nithesh as his own.
 *  `hue` drives the designed title cards (no official cover art is used). */
export const myGames: readonly { title: string; genre: string; hue: number }[] = [
  { title: 'Valorant', genre: 'Tactical shooter', hue: 352 },
  { title: 'GTA V', genre: 'Open world', hue: 140 },
  { title: 'Forza Horizon 5', genre: 'Racing', hue: 28 },
  { title: 'Cyberpunk 2077', genre: 'Action RPG', hue: 54 },
  { title: 'Minecraft', genre: 'Sandbox', hue: 105 },
];

/** Apps on Nithesh's own setup (shown without links until profile URLs are added). */
export const myApps: readonly string[] = ['Steam', 'Discord', 'Spotify', 'VS Code'];

/** Bottom "LATEST:" ticker. */
export const tickerLines: readonly string[] = [
  'Open to Summer 2027 software & AI engineering internships',
  'Built Qurious for Smart India Hackathon 2026 with Team X FORCE',
  'Now building DeepGuard: explainable detection of AI-generated faces',
  'Built Ramji Electronics, an offline-first Android billing app',
];

/** Five focus areas — CORE EXPERTISE panel (title + short) and FullStackModal (all fields). */
export const expertiseAreas: readonly {
  id: 'frontend' | 'backend' | 'data' | 'mobile' | 'ai';
  title: string;
  short: string;
  blurb: string;
  items: readonly string[];
}[] = [
  {
    id: 'ai',
    title: 'AI & ML',
    short: 'PyTorch · LLMs · Computer Vision',
    blurb: 'Models I trained and evaluated, plus LLM features that check their own output.',
    items: ['PyTorch', 'scikit-learn', 'GPT-4o / LLM APIs', 'Whisper', 'CLIP', 'Prompt Engineering'],
  },
  {
    id: 'frontend',
    title: 'FRONTEND',
    short: 'React · Next.js · Three.js',
    blurb: 'Typed React front-ends, from dashboards to real-time 3D.',
    items: ['React', 'Next.js', 'TypeScript', 'Vite', 'Tailwind CSS', 'Three.js / R3F', 'Framer Motion', 'GSAP'],
  },
  {
    id: 'backend',
    title: 'BACKEND',
    short: 'FastAPI · Node.js · Express',
    blurb: 'FastAPI for ML-backed services, Express for app back-ends.',
    items: ['FastAPI', 'Python', 'Node.js', 'Express', 'REST APIs', 'JWT Auth'],
  },
  {
    id: 'data',
    title: 'DATA',
    short: 'Supabase · PostgreSQL · Firebase',
    blurb: 'Relational data with row-level security, document stores, and on-device SQLite.',
    items: ['Supabase', 'PostgreSQL', 'Firebase Firestore', 'Room (SQLite)'],
  },
  {
    id: 'mobile',
    title: 'MOBILE & DEPLOY',
    short: 'Kotlin · Compose · Vercel',
    blurb: 'Native Android with Compose, web-to-Android with Capacitor, web apps on Vercel and Netlify.',
    items: ['Kotlin', 'Jetpack Compose', 'Capacitor', 'Vercel', 'Netlify', 'Git / GitHub'],
  },
];

/** Which skills-modal tab each CORE COMPETENCIES row opens. */
export const expertiseToSkillTab: Readonly<Record<(typeof expertiseAreas)[number]['id'], SkillCategoryId>> = {
  ai: 'ai',
  frontend: 'frontend',
  backend: 'platform',
  data: 'platform',
  mobile: 'tools',
};

export type ServiceIconKind = 'brain' | 'code' | 'phone' | 'bars' | 'cube' | 'palette';

/** Six floor plaques — each backed by at least one project above. */
export const services: readonly { title: string; sub: string; icon: ServiceIconKind }[] = [
  { title: 'AI SOLUTIONS',    sub: 'LLM · VISION · SPEECH',   icon: 'brain' },
  { title: 'WEB DEVELOPMENT', sub: 'FULL STACK APPS',         icon: 'code' },
  { title: 'MOBILE APPS',     sub: 'ANDROID · OFFLINE-FIRST', icon: 'phone' },
  { title: 'ML & DATA',       sub: 'MODELS · FORECASTS',      icon: 'bars' },
  { title: '3D & AR',         sub: 'THREE.JS · WEBCAM AR',    icon: 'cube' },
  { title: 'UI / UX DESIGN',  sub: 'CRAFTED EXPERIENCES',     icon: 'palette' },
];

/* ──────────────────────────  HUD + 3D layout data  ───────────────────────── */

export const taglineRoles: readonly string[] = [
  'FULL STACK DEVELOPER',
  'AI ENGINEER',
  'CREATIVE TECH ARCHITECT',
];

export type Station = {
  slug: Project['slug'];
  label: string;
  position: readonly [number, number, number];
};

const STATION_POS = {
  cropai:          [-3.0, 0.8, 2.5] as const,
  'smart-canteen': [0,    0.8, 2.8] as const,
  testai:          [3.0,  0.8, 2.5] as const,
} as const;

/** Keyboard-proxy anchors for the project consoles. Read by AccessibilityProxies. */
export const stations: readonly Station[] = [
  { slug: 'cropai', label: 'CropAI', position: STATION_POS.cropai },
  { slug: 'smart-canteen', label: 'Smart Canteen', position: STATION_POS['smart-canteen'] },
  { slug: 'testai', label: 'TestAI', position: STATION_POS.testai },
] as const;

export type ArcPodiumKind = 'crt' | 'category' | 'contact';
export type ArcPodium = {
  id: SkillCategoryId | 'crt' | 'contact';
  kind: ArcPodiumKind;
  title: string;
  items: readonly string[];
  position: readonly [number, number, number];
  yaw: number; // y-rotation so the screen faces arc centre
};

const ARC_DEFS: readonly {
  id: ArcPodium['id'];
  kind: ArcPodiumKind;
  title: string;
  items: readonly string[];
}[] = [
  { id: 'crt', kind: 'crt', title: 'TERMINAL', items: ['help', 'projects', 'skills', 'contact', 'matrix', 'sudo hire-me'] },
  ...skillCategories.map((c) => ({ id: c.id, kind: 'category' as const, title: c.title, items: c.items })),
  { id: 'contact', kind: 'contact', title: 'CONTACT', items: ['LinkedIn  nithesh-r-ba349032b', 'Email     nithesh.r.ciet@gmail.com', 'Open Résumé →'] },
];

// Explicit grid positions flanking the hologram; every podium faces the camera.
const V8_PODIUM_POSITIONS: Readonly<Record<ArcPodium['id'], readonly [number, number, number]>> = {
  languages: [-5.5, 2.5, -0.5],
  frontend:  [-5.5, 1.5, -0.5],
  ai:        [-5.5, 0.5, -0.5],
  platform:  [ 5.5, 2.5, -0.5],
  tools:     [ 5.5, 1.5, -0.5],
  crt:       [-5.5, 0.5, 1.5],
  contact:   [ 5.5, 0.5, 1.5],
};

export const arcPodiums: readonly ArcPodium[] = ARC_DEFS.map((d) => ({
  ...d,
  position: V8_PODIUM_POSITIONS[d.id],
  yaw: 0,
}));
