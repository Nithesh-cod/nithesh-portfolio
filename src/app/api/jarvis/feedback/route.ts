import { learningEnabled, recordFlag } from '@/lib/jarvis/learning';
import { clientIp, rateLimited } from '@/lib/jarvis/rateLimit';

/* GET: is reviewed learning switched on, and which engine should answer? The
 * chat uses this for the flag button, the "questions may be saved" notice and
 * its status label.
 * POST: a visitor flags a reply as wrong or unhelpful, for Nithesh to review. */

export const runtime = 'nodejs';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function GET() {
  return json(200, { learning: learningEnabled(), engine: process.env.ANTHROPIC_API_KEY ? 'claude' : 'built-in' });
}

export async function POST(req: Request) {
  if (rateLimited('flag', clientIp(req), 10, 10 * 60_000)) return json(429, { ok: false });
  const text = await req.text();
  if (text.length > 4000) return json(413, { ok: false });
  try {
    const { question, answer } = JSON.parse(text) as { question?: unknown; answer?: unknown };
    return json(200, { ok: await recordFlag(question, answer) });
  } catch {
    return json(400, { ok: false });
  }
}
