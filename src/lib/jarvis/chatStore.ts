'use client';

import { create } from 'zustand';
import { APPS } from '@/components/jarvis/apps/registry';
import { play } from '@/lib/audio';
import { content, projectById, certificateGroups } from '@/lib/content';
import { useOS } from '@/lib/jarvis/osStore';
import { parseToolCall, SILENT_TOOLS, type JarvisToolCall } from '@/lib/jarvis/tools';
import { countVisit, forgetMemory, loadMemory, mergeMemory, saveMemory, type VisitorMemory } from '@/lib/jarvis/visitorMemory';
import { orbSignal, speak } from '@/lib/jarvis/voice';
import { usePortfolioStore } from '@/lib/store';

/* JARVIS AI conversation. Lives outside the window component so a reply keeps
 * streaming (and the history survives) when the window is minimised, closed
 * or the visitor walks into the museum. */

export type ChatMsg = {
  id: number;
  role: 'user' | 'jarvis';
  text: string;
  /** Short labels of on-screen actions JARVIS took, e.g. "Opened This PC". */
  actions: string[];
  streaming?: boolean;
  error?: boolean;
  /** The visitor marked this reply as wrong or unhelpful. */
  flagged?: boolean;
};

export type Engine = 'claude' | 'built-in';

type ToolResult = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
type WireMsg = { role: 'user'; content: string | ToolResult[] } | { role: 'assistant'; content: unknown[] };
type ServerEvent =
  | { t: 'text'; v: string }
  | { t: 'done'; stop: string | null; content: unknown[]; fallback: boolean; engine?: Engine; final?: boolean }
  | { t: 'error'; code: string; message: string };

type ChatStore = {
  msgs: ChatMsg[];
  busy: boolean;
  /** Which AI is answering: what the server last reported, so the label stays true. */
  engine: Engine;
  /** What JARVIS remembers about this visitor (their browser only). */
  memory: VisitorMemory | null;
  /** Reviewed learning is switched on for this deployment. */
  learning: boolean;
  /** Load saved memory and the server's learning status. Safe to call repeatedly. */
  hydrate: () => void;
  /** Wipe this visitor's memory and start a new chat. */
  forget: () => void;
  /** Send a reply to Nithesh's review queue. */
  flag: (id: number) => void;
  ask: (text: string, opts?: { voice?: boolean }) => Promise<void>;
  /** Cancel the reply in flight; the conversation so far is kept. */
  stop: () => void;
  reset: () => void;
};

const MAX_HOPS = 3;
let wire: WireMsg[] = [];
let nextId = 1;
let controller: AbortController | null = null;
let hydrated = false;
/* Sent unchanged with every request of a conversation: the server folds it into
 * the first message, and rewriting an earlier message would invalidate the
 * thinking blocks Opus 5.5 ties to that history. New facts wait for the next chat. */
let frozenMemory: VisitorMemory | null = null;

export const useChat = create<ChatStore>((set, get) => {
  const patch = (id: number, fn: (m: ChatMsg) => ChatMsg) => set({ msgs: get().msgs.map((m) => (m.id === id ? fn(m) : m)) });

  return {
    msgs: [],
    busy: false,
    engine: 'built-in',
    memory: null,
    learning: false,

    hydrate: () => {
      if (hydrated) return;
      hydrated = true;
      set({ memory: loadMemory() });
      void fetch('/api/jarvis/feedback')
        .then((r) => r.json() as Promise<{ learning?: boolean; engine?: Engine }>)
        .then((j) => set({ learning: j.learning === true, engine: j.engine ?? 'built-in' }))
        .catch(() => undefined);
    },

    forget: () => {
      forgetMemory();
      get().reset();
      set({ memory: null });
    },

    flag: (id) => {
      const { msgs } = get();
      const at = msgs.findIndex((m) => m.id === id);
      const answer = msgs[at];
      const question = msgs.slice(0, at).reverse().find((m) => m.role === 'user');
      if (!answer || !question || answer.flagged) return;
      patch(id, (m) => ({ ...m, flagged: true }));
      void fetch('/api/jarvis/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: question.text, answer: answer.text }),
      }).catch(() => undefined);
    },

    stop: () => controller?.abort(),

    reset: () => {
      controller?.abort();
      wire = [];
      frozenMemory = null;
      orbSignal.state = 'idle';
      set({ msgs: [], busy: false });
    },

    ask: async (raw, opts) => {
      const text = raw.trim().slice(0, 600);
      if (!text || get().busy) return;
      if (wire.length === 0) {
        const remembered = get().memory;
        frozenMemory = remembered ? countVisit(remembered) : null;
        if (frozenMemory) set({ memory: frozenMemory });
      }
      const snapshot = wire.length;
      const replyId = nextId + 1;
      set({
        busy: true,
        msgs: [
          ...get().msgs,
          { id: nextId, role: 'user', text, actions: [] },
          { id: replyId, role: 'jarvis', text: '', actions: [], streaming: true },
        ],
      });
      nextId += 2;
      wire.push({ role: 'user', content: text });
      orbSignal.state = 'thinking';
      controller = new AbortController();
      const deferred: (() => void)[] = [];
      let ok = false;

      try {
        for (let hop = 0; hop < MAX_HOPS; hop++) {
          const res = await fetch('/api/jarvis', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ messages: wire, memory: frozenMemory }),
            signal: controller.signal,
          });
          if (!res.ok || !res.body) {
            const j = (await res.json().catch(() => null)) as { message?: string } | null;
            throw new Error(j?.message ?? 'JARVIS couldn’t be reached. Check your connection and try again.');
          }

          let done: Extract<ServerEvent, { t: 'done' }> | null = null;
          let failure: string | null = null;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          for (;;) {
            const { value, done: end } = await reader.read();
            if (end) break;
            buf += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line) continue;
              const ev = JSON.parse(line) as ServerEvent;
              if (ev.t === 'text') {
                if (orbSignal.state === 'thinking') orbSignal.state = 'idle';
                patch(replyId, (m) => ({ ...m, text: m.text + ev.v }));
              } else if (ev.t === 'error') failure = ev.message;
              else done = ev;
            }
          }
          if (failure && !done) throw new Error(failure);
          if (!done) throw new Error('The reply was cut off. Please try again.');
          if (failure) patch(replyId, (m) => ({ ...m, text: m.text || failure! }));

          wire.push({ role: 'assistant', content: done.content });
          if (done.engine) set({ engine: done.engine });
          if (done.stop !== 'tool_use') {
            ok = true;
            break;
          }

          const results: ToolResult[] = [];
          for (const block of done.content as { type: string; id?: string; name?: string; input?: unknown }[]) {
            if (block.type !== 'tool_use' || !block.id || !block.name) continue;
            const call = parseToolCall(block.name, block.input);
            const outcome = call ? runTool(call, deferred) : null;
            if (outcome?.label) patch(replyId, (m) => ({ ...m, actions: [...m.actions, outcome.label!] }));
            results.push(
              outcome
                ? { type: 'tool_result', tool_use_id: block.id, content: outcome.result }
                : { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ INVALID_INPUT: block.input ?? null }).slice(0, 280), is_error: true },
            );
          }
          wire.push({ role: 'user', content: results });

          // Quiet tools alongside a finished reply need no second model call:
          // their results stay in `wire` and go out with the next question.
          const toolNames = (done.content as { type: string; name?: string }[]).filter((b) => b.type === 'tool_use').map((b) => b.name ?? '');
          const replied = (get().msgs.find((m) => m.id === replyId)?.text ?? '').trim() !== '';
          if (done.final || (replied && toolNames.every((n) => SILENT_TOOLS.has(n)))) {
            ok = true;
            break;
          }
          // Separate the follow-up words from what was already said.
          patch(replyId, (m) => (m.text && !m.text.endsWith(' ') ? { ...m, text: `${m.text} ` } : m));
        }
        if (!ok) throw new Error('JARVIS got stuck carrying out that request. Try asking another way.');
      } catch (err) {
        wire = wire.slice(0, snapshot);
        const aborted = err instanceof DOMException && err.name === 'AbortError';
        if (!aborted)
          patch(replyId, (m) => ({
            ...m,
            error: true,
            text: m.text ? `${m.text}\n\n${(err as Error).message}` : (err as Error).message,
          }));
      } finally {
        patch(replyId, (m) => ({ ...m, streaming: false }));
        orbSignal.state = 'idle';
        set({ busy: false });
        controller = null;
      }

      const reply = get().msgs.find((m) => m.id === replyId);
      if (ok && opts?.voice && useOS.getState().settings.voiceReplies && reply?.text) speak(reply.text);
      deferred.forEach((fn) => fn());
    },
  };
});

/** Carry out one validated tool call. Museum is deferred: it leaves the OS. */
function runTool(call: JarvisToolCall, deferred: (() => void)[]): { label: string | null; result: string } {
  const portfolio = usePortfolioStore.getState();
  switch (call.name) {
    case 'open_app': {
      const { app } = call.input;
      if (app === 'museum') {
        deferred.push(() => {
          play('transition');
          portfolio.setWorld('museum');
        });
        return { label: 'Opening the Museum', result: 'The museum will open as soon as this reply finishes.' };
      }
      useOS.getState().open(app, APPS[app].size);
      return { label: `Opened ${APPS[app].title}`, result: `Opened ${APPS[app].title} on the visitor’s screen.` };
    }
    case 'open_project': {
      const p = projectById(call.input.project_id);
      portfolio.openProject(call.input.project_id);
      return { label: `Showing ${p?.name ?? 'project'}`, result: `Showing the ${p?.name ?? call.input.project_id} detail view.` };
    }
    case 'open_certificate': {
      const c = certificateGroups.flatMap((g) => g.certs).find((x) => x.id === call.input.certificate_id);
      portfolio.openCertificate(call.input.certificate_id);
      return { label: `Showing ${c?.title ?? 'certificate'}`, result: `Showing the ${c?.title ?? call.input.certificate_id} certificate.` };
    }
    case 'download_resume': {
      const a = document.createElement('a');
      a.href = content.contact.resumeUrl;
      a.download = 'Nithesh-Ramachandran-Resume.pdf';
      a.click();
      return { label: 'Résumé download started', result: 'The résumé PDF download has started.' };
    }
    case 'remember_visitor': {
      const { name, role, reply_language: language, interests } = call.input;
      const next = mergeMemory(useChat.getState().memory, { name, role, language, interests });
      if (next) {
        saveMemory(next);
        useChat.setState({ memory: next });
      }
      // Topics are remembered quietly; only say so for something personal.
      return { label: next && (name || (role && role !== 'unknown')) ? 'Remembered in this browser' : null, result: 'Saved.' };
    }
    case 'log_knowledge_gap':
      // The server logged it when the reply finished.
      return { label: useChat.getState().learning ? 'Question sent to Nithesh' : null, result: 'Noted.' };
  }
}
