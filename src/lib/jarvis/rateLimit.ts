/* Sliding-window limits for the JARVIS API routes. Best effort: each
 * serverless instance keeps its own window, so the Anthropic Console spend
 * limit stays the hard backstop. */

const hits = new Map<string, number[]>();

function recent(key: string, windowMs: number): number[] {
  const now = Date.now();
  return (hits.get(key) ?? []).filter((t) => now - t < windowMs);
}

/** True when `key` has already used up its allowance. Does not count this call. */
export function isLimited(scope: string, ip: string, max: number, windowMs: number): boolean {
  return recent(`${scope}:${ip}`, windowMs).length >= max;
}

/** Records one hit. */
export function hit(scope: string, ip: string, windowMs: number): void {
  if (hits.size > 5000) hits.clear();
  const key = `${scope}:${ip}`;
  hits.set(key, [...recent(key, windowMs), Date.now()]);
}

/** Records a hit and reports whether the caller is over the limit. */
export function rateLimited(scope: string, ip: string, max: number, windowMs: number): boolean {
  if (isLimited(scope, ip, max, windowMs)) return true;
  hit(scope, ip, windowMs);
  return false;
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}
