'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Check, CircleCheck, Flag, Mic, MicOff, RotateCcw, Send, Square, Volume2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { NRLogo } from '@/components/jarvis/NRLogo';
import { play } from '@/lib/audio';
import { useChat } from '@/lib/jarvis/chatStore';
import { DUR, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS } from '@/lib/jarvis/osStore';
import {
  canListen,
  canSpeak,
  createRecognizer,
  orbSignal,
  speak,
  stopSpeaking,
  trackMicLevel,
  type Recognizer,
} from '@/lib/jarvis/voice';

const JarvisOrb = dynamic(() => import('@/components/jarvis/JarvisOrb'), { ssr: false });

const SUGGESTIONS = [
  'What is Qurious?',
  'Show me his Android work',
  'Which AI projects has he built?',
  'Is he open to internships?',
  'Download his resume',
  'Take me to the museum',
];

const MAX = 600;

/** Chat with JARVIS (Claude Opus 5.5) by text or voice. */
export function JarvisAI({ payload }: { payload?: Record<string, unknown> }) {
  const msgs = useChat((s) => s.msgs);
  const busy = useChat((s) => s.busy);
  const engine = useChat((s) => s.engine);
  const ask = useChat((s) => s.ask);
  const reset = useChat((s) => s.reset);
  const stop = useChat((s) => s.stop);
  const memory = useChat((s) => s.memory);
  const learning = useChat((s) => s.learning);
  const hydrate = useChat((s) => s.hydrate);
  const forget = useChat((s) => s.forget);
  const flag = useChat((s) => s.flag);
  const clearPayload = useOS((s) => s.clearPayload);

  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [voiceOk, setVoiceOk] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const recRef = useRef<Recognizer | null>(null);
  const stopLevel = useRef<() => void>(() => undefined);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setVoiceOk(canListen()), []);
  useEffect(() => hydrate(), [hydrate]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  // Stop the mic and speech when the window goes away.
  useEffect(
    () => () => {
      recRef.current?.abort();
      stopLevel.current();
    },
    [],
  );

  const send = (text: string, voice = false) => {
    if (!text.trim() || busy) return;
    play('click_primary');
    stopSpeaking();
    setInput('');
    void ask(text, { voice });
  };

  const listen = async () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = createRecognizer(memory?.language === 'ta' ? 'ta-IN' : 'en-IN');
    if (!rec) {
      setMicNote('Voice input needs Chrome, Edge or Safari.');
      return;
    }
    stopSpeaking();
    setMicNote(null);
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r?.[0]) continue;
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput((finalText + interim).slice(0, MAX));
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMicNote('Microphone access was blocked. Allow it in the address bar to talk to JARVIS.');
      else if (e.error === 'no-speech') setMicNote('I didn’t catch that. Tap the mic and try again.');
    };
    rec.onend = () => {
      setListening(false);
      stopLevel.current();
      orbSignal.state = 'idle';
      if (finalText.trim()) send(finalText, true);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      orbSignal.state = 'listening';
      stopLevel.current = await trackMicLevel();
    } catch {
      setMicNote('Tap the mic to talk to JARVIS.');
    }
  };

  // Launch payloads: a prefilled question (e.g. from Resume) or "start listening".
  useEffect(() => {
    if (!payload) return;
    clearPayload('jarvis');
    if (typeof payload.prefill === 'string') send(payload.prefill);
    else if (payload.voice) void listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const status = listening ? 'Listening…' : busy ? 'Thinking…' : engine === 'claude' ? 'Online · Claude Opus 5.5' : 'Online · Built-in AI';

  const greeting = memory?.name
    ? `Welcome back, ${memory.name}. ${memory.interests[0] ? `Last time you were interested in ${memory.interests[0]}. ` : ''}What would you like to know?`
    : 'Hi, I’m JARVIS. Ask me anything about Nithesh: his projects, skills, certificates or how to reach him. I can open things on screen too.';

  return (
    <div className="app-ai">
      <div className="app-ai-head">
        <div className="app-ai-orb" aria-hidden>
          <JarvisOrb />
        </div>
        <div className="app-ai-id">
          <strong>JARVIS</strong>
          <span className={busy || listening ? 'is-busy' : 'is-on'}>
            <i /> {status}
          </span>
        </div>
        <div className="app-ai-head-actions">
          {memory && (
            <button type="button" className="app-btn app-ai-reset" aria-expanded={memoryOpen} onClick={() => setMemoryOpen((o) => !o)}>
              <Brain size={13} /> Memory
            </button>
          )}
          {msgs.length > 0 && (
            <button
              type="button"
              className="app-btn app-ai-reset"
              onClick={() => {
                stopSpeaking();
                reset();
              }}
            >
              <RotateCcw size={13} /> New chat
            </button>
          )}
        </div>
      </div>

      {memory && memoryOpen && (
        <div className="app-ai-memory">
          <dl>
            {memory.name && (
              <div>
                <dt>Name</dt>
                <dd>{memory.name}</dd>
              </div>
            )}
            {memory.role && (
              <div>
                <dt>You are</dt>
                <dd>{memory.role}</dd>
              </div>
            )}
            {memory.language && (
              <div>
                <dt>Language</dt>
                <dd>{memory.language === 'ta' ? 'Tamil' : 'English'}</dd>
              </div>
            )}
            {memory.interests.length > 0 && (
              <div>
                <dt>Interests</dt>
                <dd>{memory.interests.join(', ')}</dd>
              </div>
            )}
          </dl>
          <p>Saved only in this browser, and sent along with your questions so JARVIS can use it.</p>
          <button
            type="button"
            className="app-btn"
            onClick={() => {
              stopSpeaking();
              forget();
              setMemoryOpen(false);
            }}
          >
            Forget me
          </button>
        </div>
      )}

      <div ref={logRef} className="app-ai-log" role="log" aria-live="polite" aria-busy={busy}>
        {msgs.length === 0 && (
          <div className="app-ai-empty">
            <p>{greeting}</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              className={`app-ai-msg is-${m.role}${m.error ? ' is-error' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { duration: DUR.standard, ease: EASE_OUT } }}
            >
              {m.role === 'jarvis' && (
                <span className="app-ai-avatar" aria-hidden>
                  <NRLogo size={26} />
                </span>
              )}
              <div className="app-ai-bubble">
                {m.text ? <p>{m.text}</p> : m.streaming ? <TypingDots /> : null}
                {m.actions.length > 0 && (
                  <ul className="app-ai-actions">
                    {m.actions.map((a) => (
                      <li key={a}>
                        <CircleCheck size={13} /> {a}
                      </li>
                    ))}
                  </ul>
                )}
                {m.role === 'jarvis' && !m.streaming && !m.error && m.text && (
                  <div className="app-ai-tools">
                    {canSpeak() && (
                      <button type="button" aria-label="Read aloud" onClick={() => speak(m.text)}>
                        <Volume2 size={13} />
                      </button>
                    )}
                    {learning && (
                      <button type="button" disabled={m.flagged} aria-label="Report this answer as wrong or unhelpful" onClick={() => flag(m.id)}>
                        {m.flagged ? <Check size={13} /> : <Flag size={13} />}
                        {m.flagged ? 'Sent to Nithesh' : 'Wrong answer?'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {msgs.length === 0 && (
        <div className="app-ai-suggest">
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.05, duration: DUR.standard, ease: EASE_OUT } }}
              onClick={() => send(s)}
              disabled={busy}
            >
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {micNote && <p className="app-ai-note">{micNote}</p>}

      <form
        className="app-ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <button
          type="button"
          className={`app-ai-mic${listening ? ' is-live' : ''}`}
          aria-label={listening ? 'Stop listening' : 'Talk to JARVIS'}
          aria-pressed={listening}
          disabled={!voiceOk || busy}
          title={voiceOk ? undefined : 'Voice input needs Chrome, Edge or Safari'}
          onClick={() => void listen()}
        >
          {listening ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <input
          ref={inputRef}
          value={input}
          maxLength={MAX}
          placeholder={listening ? 'Listening…' : 'Ask JARVIS about Nithesh…'}
          aria-label="Message JARVIS"
          onChange={(e) => setInput(e.target.value)}
        />
        {busy ? (
          <button type="button" className="app-ai-send" aria-label="Stop" onClick={stop}>
            <Square size={15} />
          </button>
        ) : (
          <button type="submit" className="app-ai-send" aria-label="Send" disabled={!input.trim()}>
            <Send size={16} />
          </button>
        )}
      </form>
      <p className="app-ai-foot">
        {engine === 'claude'
          ? 'Answers come from Claude Opus 5.5 using this portfolio, Nithesh’s public GitHub and answers he has approved. It can still make mistakes.'
          : 'Answers come from JARVIS’s built-in AI, trained on this portfolio, Nithesh’s public GitHub and answers he has approved. It sticks to those facts and can still misread a question.'}
        {learning && ' Questions it can’t answer and replies you report are saved for 30 days, without your name, so he can review them.'}
      </p>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="app-ai-dots" aria-label="JARVIS is thinking">
      <i />
      <i />
      <i />
    </span>
  );
}
