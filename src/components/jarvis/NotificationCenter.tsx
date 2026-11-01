'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff, CheckCheck, ChevronRight, Gamepad2, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useShell } from '@/components/jarvis/shellStore';
import { useNotes, useRunNote, type OSNote } from '@/components/jarvis/useNotes';
import { useOverlay } from '@/components/jarvis/useOverlay';
import { GitHubIcon } from '@/components/ui/BrandIcons';
import { DUR, EASE_IN, EASE_OUT } from '@/lib/jarvis/motion';

const MARK_READ_MS = 1200;
const TOAST_MS = 5000;

const GROUP_ORDER: { tag: OSNote['tag']; heading: string }[] = [
  { tag: 'System', heading: 'This session' },
  { tag: 'Arcade', heading: 'Arcade' },
  { tag: 'GitHub', heading: 'Latest on GitHub' },
  { tag: 'Portfolio', heading: 'From Nithesh' },
];

function NoteIcon({ tag }: { tag: OSNote['tag'] }) {
  if (tag === 'GitHub') return <GitHubIcon size={15} />;
  if (tag === 'Arcade') return <Gamepad2 size={16} />;
  if (tag === 'Portfolio') return <Sparkles size={16} />;
  return <Bell size={16} />;
}

/** The real notifications, with read state, per-item dismiss and clear all. */
export function NotificationCenter() {
  const closePanel = useShell((s) => s.closePanel);
  const markRead = useShell((s) => s.markRead);
  const dismiss = useShell((s) => s.dismiss);
  const { notes, unread } = useNotes();
  const run = useRunNote();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useOverlay(rootRef, closePanel);

  // Anything unread while the panel is open keeps its marker until it closes.
  const fresh = useRef(new Set<string>()).current;
  notes.forEach((n) => !n.read && fresh.add(n.id));

  useEffect(() => closeRef.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    if (unread === 0) return;
    const timer = window.setTimeout(() => markRead(notes.map((n) => n.id)), MARK_READ_MS);
    return () => window.clearTimeout(timer);
  }, [notes, unread, markRead]);

  const openNote = (note: OSNote) => {
    if (!note.action) return;
    closePanel();
    run(note.action);
  };

  return (
    <motion.div
      className="jos-overlay jos-notes-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.quick } }}
      exit={{ opacity: 0, transition: { duration: DUR.quick, ease: EASE_IN } }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closePanel();
      }}
    >
      <motion.aside
        className="jos-notes-panel"
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0, transition: { duration: DUR.standard, ease: EASE_OUT } }}
        exit={{ opacity: 0, x: 24, transition: { duration: DUR.quick, ease: EASE_IN } }}
      >
        <header className="jos-notes-head">
          <h2>Notifications</h2>
          <button type="button" className="jos-icon-btn" aria-label="Close notifications" ref={closeRef} onClick={closePanel}>
            <X size={18} />
          </button>
        </header>

        <div className="jos-notes-tools">
          <button type="button" className="app-btn" disabled={unread === 0} onClick={() => markRead(notes.map((n) => n.id))}>
            <CheckCheck size={14} /> Mark all read
          </button>
          <button type="button" className="app-btn" disabled={notes.length === 0} onClick={() => dismiss(notes.map((n) => n.id))}>
            <Trash2 size={14} /> Clear all
          </button>
        </div>

        <div className="jos-notes-list">
          {notes.length === 0 && (
            <div className="jos-notes-empty">
              <BellOff size={26} aria-hidden />
              <p>You&apos;re all caught up.</p>
            </div>
          )}
          {GROUP_ORDER.map(({ tag, heading }) => {
            const group = notes.filter((n) => n.tag === tag);
            if (group.length === 0) return null;
            return (
              <section key={tag} aria-label={heading}>
                <h3>{heading}</h3>
                <AnimatePresence initial={false}>
                  {group.map((note) => (
                    <motion.article
                      key={note.id}
                      className={fresh.has(note.id) ? 'jos-note is-fresh' : 'jos-note'}
                      exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0, transition: { duration: DUR.quick, ease: EASE_IN } }}
                    >
                      <span className="jos-note-icon">
                        <NoteIcon tag={note.tag} />
                      </span>
                      <button type="button" className="jos-note-main" disabled={!note.action} onClick={() => openNote(note)}>
                        <strong>{note.title}</strong>
                        {(note.body || note.when) && <span>{[note.body, note.when].filter(Boolean).join(' · ')}</span>}
                        {note.action && <ChevronRight className="jos-note-go" size={15} aria-hidden />}
                      </button>
                      <button type="button" className="jos-note-x" aria-label={`Dismiss: ${note.title}`} onClick={() => dismiss([note.id])}>
                        <X size={14} />
                      </button>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      </motion.aside>
    </motion.div>
  );
}

/** One line for something that just happened; it also stays in the centre. */
export function Toast() {
  const toast = useShell((s) => s.toast);
  const clearToast = useShell((s) => s.clearToast);
  const run = useRunNote();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div className="jos-toasts" role="status">
      <AnimatePresence>
        {toast && (
          <motion.button
            key={toast.id}
            type="button"
            className="jos-toast"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0, transition: { duration: DUR.standard, ease: EASE_OUT } }}
            exit={{ opacity: 0, x: 20, transition: { duration: DUR.quick, ease: EASE_IN } }}
            onClick={() => {
              clearToast();
              if (toast.action) run(toast.action);
            }}
          >
            <span className="jos-note-icon">
              <NoteIcon tag={toast.tag} />
            </span>
            <span>
              <strong>{toast.title}</strong>
              {toast.body && <small>{toast.body}</small>}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
