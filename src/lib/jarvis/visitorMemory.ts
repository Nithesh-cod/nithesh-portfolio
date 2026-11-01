/* What JARVIS AI remembers about one visitor. It lives only in that visitor's
 * browser (localStorage) and travels with their questions, so it is treated
 * as untrusted user data everywhere: cleaned on every read, length-capped,
 * and shown to Claude inside the visitor's own message, never in `system`. */

export const VISITOR_ROLES = ['recruiter', 'engineer', 'student', 'founder', 'other'] as const;
export type VisitorRole = (typeof VISITOR_ROLES)[number];

export type VisitorMemory = {
  name: string | null;
  role: VisitorRole | null;
  language: 'en' | 'ta' | null;
  interests: string[];
  /** Browser sessions in which this visitor has chatted. */
  visits: number;
};

const KEY = 'jarvis-visitor-memory';
const SESSION_KEY = 'jarvis-visit-counted';
const MAX_INTERESTS = 6;

const EMPTY: VisitorMemory = { name: null, role: null, language: null, interests: [], visits: 1 };

/** Single line, no markup characters, capped. */
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f<>{}`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function sanitizeMemory(raw: unknown): VisitorMemory | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const memory: VisitorMemory = {
    name: clean(m.name, 40) || null,
    role: (VISITOR_ROLES as readonly unknown[]).includes(m.role) ? (m.role as VisitorRole) : null,
    language: m.language === 'en' || m.language === 'ta' ? m.language : null,
    interests: Array.isArray(m.interests)
      ? [...new Set(m.interests.map((i) => clean(i, 40)).filter(Boolean))].slice(0, MAX_INTERESTS)
      : [],
    visits: typeof m.visits === 'number' && Number.isFinite(m.visits) ? Math.min(9999, Math.max(1, Math.floor(m.visits))) : 1,
  };
  const empty = !memory.name && !memory.role && !memory.language && memory.interests.length === 0;
  return empty ? null : memory;
}

/** Newest values win; interests accumulate, newest first. */
export function mergeMemory(
  base: VisitorMemory | null,
  patch: { name?: string; role?: string; language?: string; interests?: string[] },
): VisitorMemory | null {
  const b = base ?? EMPTY;
  return sanitizeMemory({
    name: patch.name || b.name,
    role: patch.role && patch.role !== 'unknown' ? patch.role : b.role,
    language: patch.language && patch.language !== 'unknown' ? patch.language : b.language,
    interests: [...(patch.interests ?? []), ...b.interests],
    visits: b.visits,
  });
}

/** Text placed before the visitor's first question. Deterministic for a given memory. */
export function renderMemory(m: VisitorMemory): string {
  const lines = [
    m.name && `Name: ${m.name}`,
    m.role && `Role: ${m.role}`,
    m.language && `Prefers replies in: ${m.language === 'ta' ? 'Tamil' : 'English'}`,
    m.interests.length > 0 && `Interested in: ${m.interests.join(', ')}`,
    `Visit number: ${m.visits}`,
  ].filter(Boolean);
  return `<visitor_memory>\n${lines.join('\n')}\n</visitor_memory>`;
}

export function loadMemory(): VisitorMemory | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? sanitizeMemory(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveMemory(m: VisitorMemory): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // Private mode / blocked storage: the memory just lasts this visit.
  }
}

export function forgetMemory(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing was stored.
  }
}

/** Counts this browser session as one more visit, once. */
export function countVisit(m: VisitorMemory): VisitorMemory {
  try {
    if (window.sessionStorage.getItem(SESSION_KEY) === '1') return m;
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    return m;
  }
  const next = { ...m, visits: m.visits + 1 };
  saveMemory(next);
  return next;
}
