import { createHash, timingSafeEqual } from 'node:crypto';
import { discard, learningEnabled, reviewSnapshot, teach } from '@/lib/jarvis/learning';
import { clientIp, hit, isLimited } from '@/lib/jarvis/rateLimit';

/* Nithesh's review queue for JARVIS AI. Everything here requires
 * JARVIS_ADMIN_TOKEN (12+ characters), sent as the x-jarvis-admin header. If
 * the variable is unset, the route is closed to everyone. */

export const runtime = 'nodejs';

const FAIL_MAX = 6;
const FAIL_WINDOW_MS = 15 * 60_000;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Returns an error Response, or null when the caller is Nithesh. */
function guard(req: Request): Response | null {
  const token = process.env.JARVIS_ADMIN_TOKEN;
  if (!token || token.length < 12) return json(403, { code: 'disabled', message: 'Set JARVIS_ADMIN_TOKEN (12+ characters) to use this page.' });
  const ip = clientIp(req);
  if (isLimited('teach-fail', ip, FAIL_MAX, FAIL_WINDOW_MS)) return json(429, { code: 'locked', message: 'Too many wrong passwords. Try again in 15 minutes.' });
  if (timingSafeEqual(digest(req.headers.get('x-jarvis-admin') ?? ''), digest(token))) return null;
  hit('teach-fail', ip, FAIL_WINDOW_MS);
  return json(401, { code: 'denied', message: 'Wrong password.' });
}

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  return json(200, { learning: learningEnabled(), ...(await reviewSnapshot()) });
}

export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  let body: { action?: unknown; kind?: unknown; id?: unknown; question?: unknown; answer?: unknown; resolves?: unknown };
  try {
    body = JSON.parse(await req.text()) as typeof body;
  } catch {
    return json(400, { message: 'Bad request.' });
  }
  if (body.action === 'teach') {
    const result = await teach(body);
    return result.ok ? json(200, { ok: true }) : json(400, { message: result.message });
  }
  if (body.action === 'discard' && (body.kind === 'gap' || body.kind === 'flag' || body.kind === 'fact') && typeof body.id === 'string') {
    await discard(body.kind, body.id);
    return json(200, { ok: true });
  }
  return json(400, { message: 'Unknown action.' });
}
