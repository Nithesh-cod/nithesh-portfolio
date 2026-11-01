import { allProjects, certificateGroups } from '@/lib/content';
import { VISITOR_ROLES } from '@/lib/jarvis/visitorMemory';

/* The on-screen actions JARVIS AI can take. The server sends these schemas to
 * Claude; the browser validates each call against the same lists before it
 * acts, so a malformed or invented id can never do anything. */

export const TOOL_APPS = [
  'thispc',
  'museum',
  'resume',
  'arcade',
  'terminal',
  'mail',
  'certificates',
  'settings',
  'music',
  'about',
] as const;
export type ToolApp = (typeof TOOL_APPS)[number];

export const PROJECT_IDS = allProjects.map((p) => p.id);
export const CERT_IDS = certificateGroups.flatMap((g) => g.certs.map((c) => c.id));

/** Tools that act quietly alongside a reply, so finishing them needs no second
 *  model call: their results travel with the visitor's next message. */
export const SILENT_TOOLS: ReadonlySet<string> = new Set(['remember_visitor', 'log_knowledge_gap']);

export type JarvisToolCall =
  | { name: 'open_app'; input: { app: ToolApp } }
  | { name: 'open_project'; input: { project_id: string } }
  | { name: 'open_certificate'; input: { certificate_id: string } }
  | { name: 'download_resume'; input: Record<string, never> }
  | { name: 'remember_visitor'; input: { name: string; role: string; reply_language: string; interests: string[] } }
  | { name: 'log_knowledge_gap'; input: { question: string } };

export const TOOL_DEFS = [
  {
    name: 'open_app',
    description:
      'Open a JARVIS OS app on the visitor’s screen. Use when they ask to open, launch, see or go to one: thispc (file explorer of projects, certificates, documents), museum (3D exhibition hall; leaves the OS), resume, arcade (games + Neon Snake), terminal, mail (send Nithesh a message), certificates, settings, music, about.',
    input_schema: {
      type: 'object' as const,
      properties: { app: { type: 'string', enum: [...TOOL_APPS] } },
      required: ['app'],
      additionalProperties: false,
    },
  },
  {
    name: 'open_project',
    description: 'Show the detail view (screenshots, stack, links) for one of Nithesh’s projects.',
    input_schema: {
      type: 'object' as const,
      properties: { project_id: { type: 'string', enum: PROJECT_IDS } },
      required: ['project_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'open_certificate',
    description: 'Show one of Nithesh’s certificates full size.',
    input_schema: {
      type: 'object' as const,
      properties: { certificate_id: { type: 'string', enum: CERT_IDS } },
      required: ['certificate_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'download_resume',
    description: 'Start a download of Nithesh’s one-page résumé PDF.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'remember_visitor',
    description:
      'Save something the visitor told you about themselves so you can use it on their next visit. Call this when they share their name, what they do, a language preference or a lasting interest in Nithesh’s work. Do not call it for anything sensitive, or when nothing new was shared. It is stored only in their own browser.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Their name, or an empty string if not newly shared.' },
        role: { type: 'string', enum: [...VISITOR_ROLES, 'unknown'] },
        reply_language: { type: 'string', enum: ['en', 'ta', 'unknown'], description: 'Language they asked you to reply in.' },
        interests: { type: 'array', items: { type: 'string' }, description: 'Short topics, for example "Android work". Empty if none are new.' },
      },
      required: ['name', 'role', 'reply_language', 'interests'],
      additionalProperties: false,
    },
  },
  {
    name: 'log_knowledge_gap',
    description:
      'Record a genuine question about Nithesh that nothing you know can answer, so he can teach you the answer. Call this alongside your reply when you have to say you don’t know. Do not call it for off-topic requests or for questions you can answer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'The question in one neutral sentence, without any personal details about the visitor.' },
      },
      required: ['question'],
      additionalProperties: false,
    },
  },
];

/** Narrow an untrusted tool_use block to a call we know how to run, or null. */
export function parseToolCall(name: string, input: unknown): JarvisToolCall | null {
  const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  switch (name) {
    case 'open_app':
      return typeof obj.app === 'string' && (TOOL_APPS as readonly string[]).includes(obj.app)
        ? { name, input: { app: obj.app as ToolApp } }
        : null;
    case 'open_project':
      return typeof obj.project_id === 'string' && PROJECT_IDS.includes(obj.project_id)
        ? { name, input: { project_id: obj.project_id } }
        : null;
    case 'open_certificate':
      return typeof obj.certificate_id === 'string' && CERT_IDS.includes(obj.certificate_id)
        ? { name, input: { certificate_id: obj.certificate_id } }
        : null;
    case 'download_resume':
      return { name, input: {} };
    case 'remember_visitor':
      return {
        name,
        input: {
          name: typeof obj.name === 'string' ? obj.name : '',
          role: typeof obj.role === 'string' ? obj.role : 'unknown',
          reply_language: typeof obj.reply_language === 'string' ? obj.reply_language : 'unknown',
          interests: Array.isArray(obj.interests) ? obj.interests.filter((i): i is string => typeof i === 'string') : [],
        },
      };
    case 'log_knowledge_gap':
      return typeof obj.question === 'string' && obj.question.trim() ? { name, input: { question: obj.question } } : null;
    default:
      return null;
  }
}
