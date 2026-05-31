/**
 * Single source of truth for every string the portfolio displays.
 * Never hardcode résumé text in components — import from here.
 */

export type Project = {
  slug: 'cropai' | 'smart-canteen' | 'testai';
  name: string;
  url: string;
  stack: string[];
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

export type Content = {
  hero: {
    name: string;
    tagline: string;
    headline: string;
    location: string;
  };
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

  about:
    'Second-year B.Tech student in Artificial Intelligence and Data Science at Coimbatore Institute of Engineering and Technology, building production web apps that combine modern front-end engineering with practical ML and Generative AI. Three publicly deployed projects span computer-vision-assisted agriculture, full-stack ordering, and LLM-powered tooling. Comfortable shipping end-to-end on the React / Next.js + Vercel / Netlify stack. Open to Summer 2026 software / AI engineering internships.',

  projects: [
    {
      slug: 'cropai',
      name: 'CropAI',
      url: 'https://cropaicanopy.netlify.app',
      stack: ['React', 'ML model', 'Netlify'],
      summary:
        'Browser-based crop / leaf-health classifier. Upload an image, get an instant prediction — no account, no backend latency. Vision model runs client-side on Netlify with zero server cost. Single-screen, mobile-first UI: upload to diagnosis in two taps.',
    },
    {
      slug: 'smart-canteen',
      name: 'Smart Canteen',
      url: 'https://smart-canteen-tau.vercel.app',
      stack: ['Next.js', 'Vercel'],
      summary:
        'Full ordering flow — live menu, cart, checkout — for a campus canteen scenario. Persistent client-side cart so users return to in-progress orders without re-selecting items. Mobile-first responsive layout that holds across phone, tablet, and desktop breakpoints. Deployed continuously from GitHub to Vercel.',
    },
    {
      slug: 'testai',
      name: 'TestAI',
      url: 'https://testai-orcin.vercel.app/dashboard',
      stack: ['Next.js', 'LLM API', 'Vercel'],
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

/** Camera waypoints — 8-point Catmull-Rom path (tension 0.3 in ScrollCamera).
 *  Order = scroll order = narrative order. */
export const waypoints = [
  { id: 'entrance', position: [0, 1.7, 7] as const, lookAt: [0, 1.4, 0] as const },
  { id: 'portrait', position: [0, 1.55, 1.2] as const, lookAt: HOLOGRAM_POS },
  { id: 'console-1', position: [-3.2, 1.05, 1.4] as const, lookAt: STATION_POS.cropai },
  { id: 'console-2', position: [0, 1.05, 1.0] as const, lookAt: STATION_POS['smart-canteen'] },
  { id: 'console-3', position: [3.2, 1.05, 1.4] as const, lookAt: STATION_POS.testai },
  { id: 'server-rack', position: [3.4, 1.5, -1.8] as const, lookAt: RACK_POS },
  { id: 'crt', position: [-3.0, 1.1, -1.4] as const, lookAt: CRT_POS },
  { id: 'contact', position: [0, 1.4, -5.4] as const, lookAt: CONTACT_POS },
] as const;

export type Waypoint = (typeof waypoints)[number];
