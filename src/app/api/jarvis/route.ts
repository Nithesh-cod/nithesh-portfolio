import Anthropic from '@anthropic-ai/sdk';
import type { BetaContentBlockParam, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { randomUUID } from 'node:crypto';
import { think, type Turn } from '@/lib/jarvis/brain';
import { githubKnowledge } from '@/lib/jarvis/github';
import { SYSTEM_PROMPT } from '@/lib/jarvis/knowledge';
import { getFacts, learningEnabled, recordGap, renderFacts } from '@/lib/jarvis/learning';
import { clientIp, rateLimited } from '@/lib/jarvis/rateLimit';
import { parseToolCall, TOOL_DEFS } from '@/lib/jarvis/tools';
import { renderMemory, sanitizeMemory } from '@/lib/jarvis/visitorMemory';

/* JARVIS AI — streams replies to the JARVIS OS chat window.
 *
 * Two engines, same wire format:
 *   Claude Opus 5.5   used when ANTHROPIC_API_KEY is set
 *   built-in AI       src/lib/jarvis/brain: used with no key, and whenever Claude
 *                     fails before replying (no credit, outage), so a visitor
 *                     always gets a real answer instead of an error
 *
 * Env (server only, never NEXT_PUBLIC_):
 *   ANTHROPIC_API_KEY   optional; turns on Claude
 *   JARVIS_MODEL        optional, default claude-opus-5-5
 *   JARVIS_EFFORT       optional, low | medium | high (default low: snappy chat)
 *   GITHUB_TOKEN        optional, raises GitHub's rate limit for the repo digest
 *
 * Wire format: the browser posts the whole conversation (assistant turns are
 * echoed back verbatim so thinking signatures and fallback markers survive),
 * and reads newline-delimited JSON events back:
 *   {"t":"text","v":"…"}                       streamed reply text
 *   {"t":"done","stop":…,"content":[…],"fallback":bool,"engine":"claude|built-in","final"?:true}
 * "final" means the reply is complete even if it carries tool_use blocks: the
 * built-in AI says everything up front, so it needs no call after its tools run.
 *   {"t":"error","code":"busy|refusal|error","message":"…"}
 *
 * What goes where, because Opus 5.5 binds its thinking blocks to the `system`
 * prompt and message history of a conversation:
 *   system[0]  fixed instructions + portfolio knowledge
 *   system[1]  what JARVIS has learned (GitHub, Nithesh's approved answers).
 *              It can change mid-chat, so `drop_block` tells the API to discard
 *              the now-stale thinking instead of failing the request.
 *   messages   visitor memory sits in the first user turn: it is the visitor's
 *              own data, and the browser freezes it for the whole conversation.
 */

export const runtime = 'nodejs';

const MODEL = process.env.JARVIS_MODEL || 'claude-opus-5-5';
const EFFORT = (['low', 'medium', 'high'] as const).find((e) => e === process.env.JARVIS_EFFORT) ?? 'low';
// A cost cap, set high enough that Tamil replies (more tokens per word) aren't cut off.
const MAX_TOKENS = 2000;
const MAX_USER_TURNS = 20;
const MAX_USER_CHARS = 600;
const MAX_BODY_BYTES = 160_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 24;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const ASSISTANT_BLOCKS = new Set(['text', 'thinking', 'redacted_thinking', 'tool_use', 'fallback']);

/** Checks the client-supplied conversation; returns an error string or the messages. */
function validate(raw: unknown): string | BetaMessageParam[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_USER_TURNS * 4) return 'Bad conversation.';
  let userTurns = 0;
  const out: BetaMessageParam[] = [];
  for (const m of raw as unknown[]) {
    if (!m || typeof m !== 'object') return 'Bad message.';
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role === 'user') {
      if (typeof content === 'string') {
        const text = content.trim();
        if (!text) return 'Empty message.';
        if (text.length > MAX_USER_CHARS) return `Messages are limited to ${MAX_USER_CHARS} characters.`;
        userTurns++;
        out.push({ role: 'user', content: text });
      } else if (Array.isArray(content) && content.length > 0 && content.length <= 6) {
        const blocks: BetaContentBlockParam[] = [];
        for (const b of content as unknown[]) {
          const r = b as { type?: unknown; tool_use_id?: unknown; content?: unknown; is_error?: unknown };
          if (r?.type !== 'tool_result' || typeof r.tool_use_id !== 'string' || typeof r.content !== 'string') return 'Bad tool result.';
          blocks.push({ type: 'tool_result', tool_use_id: r.tool_use_id.slice(0, 120), content: r.content.slice(0, 300), ...(r.is_error === true ? { is_error: true } : {}) });
        }
        out.push({ role: 'user', content: blocks });
      } else return 'Bad message.';
    } else if (role === 'assistant') {
      if (!Array.isArray(content) || content.length > 24) return 'Bad assistant turn.';
      if (!(content as { type?: unknown }[]).every((b) => b && typeof b.type === 'string' && ASSISTANT_BLOCKS.has(b.type)))
        return 'Bad assistant turn.';
      out.push({ role: 'assistant', content: content as BetaContentBlockParam[] });
    } else return 'Bad role.';
  }
  if (userTurns > MAX_USER_TURNS) return 'turn_limit';
  if (out[out.length - 1]?.role !== 'user') return 'Conversation must end with the visitor.';
  return out;
}

/** Plain text of each turn, for the built-in AI to follow the conversation. */
function plainTurns(messages: BetaMessageParam[]): Turn[] {
  return messages.flatMap((m): Turn[] => {
    if (m.role === 'system' || !m.content) return [];
    if (typeof m.content === 'string') return [{ role: m.role, text: m.content }];
    const text = m.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(' ');
    return text ? [{ role: m.role, text }] : [];
  });
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (rateLimited('chat', clientIp(req), RATE_MAX, RATE_WINDOW_MS))
    return json(429, { code: 'rate', message: 'You’re asking faster than JARVIS can think. Try again in a few minutes.' });

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json(413, { code: 'too_big', message: 'Conversation too long. Start a new chat.' });
  let body: { messages?: unknown; memory?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return json(400, { code: 'bad', message: 'Bad request.' });
  }
  const messages = validate(body.messages);
  if (messages === 'turn_limit')
    return json(400, { code: 'turn_limit', message: `This chat reached ${MAX_USER_TURNS} questions. Start a new chat to keep going.` });
  if (typeof messages === 'string') return json(400, { code: 'bad', message: messages });

  const memory = sanitizeMemory(body.memory);
  const turns = plainTurns(messages);
  const first = messages[0];
  if (memory && first && typeof first.content === 'string') first.content = `${renderMemory(memory)}\n\n${first.content}`;

  const [github, facts] = await Promise.all([githubKnowledge(), getFacts().catch(() => [])]);
  const learned = [github.digest, renderFacts(facts)].filter(Boolean).join('\n\n');
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      const answerBuiltIn = async () => {
        const lastUser = [...turns].reverse().find((t) => t.role === 'user');
        const reply = think({
          question: lastUser?.text ?? '',
          history: turns.slice(0, lastUser ? turns.lastIndexOf(lastUser) : 0),
          memory,
          facts,
          repos: github.repos,
          learning: learningEnabled(),
        });
        if (reply.gap) await recordGap(reply.gap).catch(() => undefined);
        // Word groups with a tiny pause, so replies appear the way Claude's do.
        for (const chunk of reply.text.match(/\S+(?:\s+\S+){0,3}\s*/g) ?? []) {
          if (req.signal.aborted) return;
          send({ t: 'text', v: chunk });
          await new Promise((r) => setTimeout(r, 12));
        }
        const tools = reply.tools.map((t) => ({ type: 'tool_use', id: `toolu_${randomUUID().replace(/-/g, '').slice(0, 22)}`, name: t.name, input: t.input }));
        send({
          t: 'done',
          stop: tools.length ? 'tool_use' : 'end_turn',
          content: [{ type: 'text', text: reply.text }, ...tools],
          fallback: false,
          engine: 'built-in',
          final: true,
        });
      };

      if (!apiKey) {
        await answerBuiltIn().catch(() => send({ t: 'error', code: 'error', message: 'JARVIS hit a problem answering that. Please try again.' }));
        return controller.close();
      }

      let repliedInText = false;
      try {
        const client = new Anthropic({ apiKey });
        const run = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            // Opus 5.5 always thinks; keep it short and don't ship the text to the browser.
            thinking: { type: 'adaptive', display: 'omitted', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
            output_config: { effort: EFFORT },
            // If Opus declines on policy grounds, the API retries on its default fallback model.
            betas: ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'],
            fallbacks: 'default',
            system: [
              { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
              ...(learned ? [{ type: 'text' as const, text: learned, cache_control: { type: 'ephemeral' as const } }] : []),
            ],
            tools: TOOL_DEFS.map((t) => ({ ...t, strict: true, eager_input_streaming: true })),
            tool_choice: { type: 'auto' },
            messages,
          },
          { signal: req.signal },
        );

        for await (const event of run) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            repliedInText = true;
            send({ t: 'text', v: event.delta.text });
          }
        }
        const final = await run.finalMessage();
        if (final.stop_reason === 'refusal') {
          send({ t: 'error', code: 'refusal', message: 'JARVIS can’t help with that one. Ask about Nithesh’s projects, skills or experience.' });
        }
        if (final.stop_reason === 'tool_use') {
          // Gaps are logged here, not in the browser, so the page can't invent them.
          for (const block of final.content) {
            if (block.type !== 'tool_use') continue;
            const call = parseToolCall(block.name, block.input);
            if (call?.name === 'log_knowledge_gap') await recordGap(call.input.question).catch(() => undefined);
          }
        }
        send({
          t: 'done',
          stop: final.stop_reason,
          content: final.content,
          fallback: final.content.some((b) => b.type === 'fallback'),
          engine: 'claude',
        });
      } catch (err) {
        if (req.signal.aborted) return controller.close();
        const status = err instanceof Anthropic.APIError ? err.status : undefined;
        // eslint-disable-next-line no-console
        console.error('[jarvis] Claude request failed:', status, err instanceof Error ? err.message : err);
        if (repliedInText) send({ t: 'error', code: 'error', message: 'JARVIS was cut off. Please ask again.' });
        else await answerBuiltIn().catch(() => send({ t: 'error', code: 'error', message: 'JARVIS hit a problem answering that. Please try again.' }));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' },
  });
}
