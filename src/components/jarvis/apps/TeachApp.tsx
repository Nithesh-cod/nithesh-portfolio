'use client';

import { BookOpenCheck, Check, LoaderCircle, Lock, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Fact, Flag, Gap } from '@/lib/jarvis/learning';

/* Nithesh's private review desk for JARVIS AI. Opened with ?app=teach or the
 * Terminal command "sudo teach"; nothing here works without the password. The
 * password stays in this component's memory and is gone when the window closes. */

type Snapshot = { learning: boolean; gaps: Gap[]; flags: Flag[]; facts: Fact[] };
type Tab = 'questions' | 'reported' | 'taught';

export function TeachApp() {
  const [password, setPassword] = useState('');
  const [data, setData] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>('questions');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/jarvis/teach', { headers: { 'x-jarvis-admin': password } });
      const json = (await res.json()) as Snapshot & { message?: string };
      if (!res.ok) {
        setData(null);
        setError(json.message ?? 'That didn’t work.');
      } else setData(json);
    } catch {
      setError('Couldn’t reach the server.');
    }
    setBusy(false);
  }, [password]);

  const act = async (body: Record<string, unknown>): Promise<boolean> => {
    const res = await fetch('/api/jarvis/teach', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-jarvis-admin': password },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(json?.message ?? 'That didn’t save.');
      return false;
    }
    setError(null);
    await load();
    return true;
  };

  if (!data) {
    return (
      <form
        className="app-teach-lock"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <Lock size={26} />
        <strong>Teach JARVIS</strong>
        <p>Nithesh’s review desk. Answers approved here go live for every visitor.</p>
        <input type="password" autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && (
          <p className="app-form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="app-btn app-btn--primary" disabled={busy || !password}>
          {busy ? <LoaderCircle size={14} className="app-spin" /> : <BookOpenCheck size={14} />} Open
        </button>
      </form>
    );
  }

  const tabs: [Tab, string, number][] = [
    ['questions', 'Unanswered', data.gaps.length],
    ['reported', 'Reported', data.flags.length],
    ['taught', 'Taught', data.facts.length],
  ];

  return (
    <div className="app-teach">
      <div className="app-toolbar">
        <div className="app-tabs" role="tablist">
          {tabs.map(([id, label, count]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label} · {count}
            </button>
          ))}
        </div>
      </div>
      {!data.learning && <p className="app-form-error">Learning storage isn’t configured, so nothing can be saved yet. See .env.example.</p>}
      {error && (
        <p className="app-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="app-teach-list">
        {tab === 'questions' &&
          (data.gaps.length === 0 ? (
            <p className="app-teach-empty">No unanswered questions right now.</p>
          ) : (
            data.gaps.map((g) => (
              <TeachCard
                key={g.id}
                question={g.question}
                meta={`Asked ${g.count} time${g.count === 1 ? '' : 's'} · last ${g.lastAsked.slice(0, 10)}`}
                onTeach={(answer) => act({ action: 'teach', question: g.question, answer, resolves: g.id })}
                onDismiss={() => act({ action: 'discard', kind: 'gap', id: g.id })}
              />
            ))
          ))}
        {tab === 'reported' &&
          (data.flags.length === 0 ? (
            <p className="app-teach-empty">No reported answers right now.</p>
          ) : (
            data.flags.map((f) => (
              <TeachCard
                key={f.id}
                question={f.question}
                wrong={f.answer}
                meta={`Reported ${f.at.slice(0, 10)}`}
                onTeach={(answer) => act({ action: 'teach', question: f.question, answer, resolves: f.id })}
                onDismiss={() => act({ action: 'discard', kind: 'flag', id: f.id })}
              />
            ))
          ))}
        {tab === 'taught' &&
          (data.facts.length === 0 ? (
            <p className="app-teach-empty">Nothing taught yet. Answers you approve appear here.</p>
          ) : (
            data.facts.map((f) => (
              <article key={f.id} className="app-teach-card">
                <strong>{f.question}</strong>
                <p>{f.answer}</p>
                <div className="app-actions">
                  <button type="button" className="app-btn" onClick={() => void act({ action: 'discard', kind: 'fact', id: f.id })}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </article>
            ))
          ))}
      </div>
    </div>
  );
}

function TeachCard({
  question,
  wrong,
  meta,
  onTeach,
  onDismiss,
}: {
  question: string;
  wrong?: string;
  meta: string;
  onTeach: (answer: string) => Promise<boolean>;
  onDismiss: () => Promise<boolean>;
}) {
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setAnswer(''), [question]);

  return (
    <article className="app-teach-card">
      <strong>{question}</strong>
      <span>{meta}</span>
      {wrong && <blockquote>{wrong}</blockquote>}
      <textarea rows={3} maxLength={800} placeholder="Your answer. It goes live for every visitor as soon as you save it." aria-label={`Answer to: ${question}`} value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <div className="app-actions">
        <button
          type="button"
          className="app-btn app-btn--primary"
          disabled={saving || !answer.trim()}
          onClick={async () => {
            setSaving(true);
            await onTeach(answer);
            setSaving(false);
          }}
        >
          <Check size={13} /> Teach JARVIS
        </button>
        <button type="button" className="app-btn" onClick={() => void onDismiss()}>
          <X size={13} /> Dismiss
        </button>
      </div>
    </article>
  );
}
