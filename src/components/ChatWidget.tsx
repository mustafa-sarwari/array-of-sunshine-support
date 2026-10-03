import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDb } from '../lib/db';
import {
  MAX_VISITOR_MESSAGE_LENGTH,
  getVisitorTranscript,
  getWidgetConfig,
  sendVisitorMessage,
  startConversation,
  submitHandoff,
  validateHandoff,
  type HandoffInput,
  type VisitorConversation,
} from '../lib/publicApi';
import type { ChatMessage } from '../lib/types';

/**
 * Embeddable public chat widget. It talks only to publicApi (the stand-in for
 * the public-chat Lambda) using a public widget key and the visitor's own
 * conversation token, so it cannot reach private conversations or documents.
 */

function storageKey(widgetKey: string) {
  return `aos-support-demo:widget:${widgetKey}`;
}

function loadRef(widgetKey: string): VisitorConversation | null {
  try {
    const raw = localStorage.getItem(storageKey(widgetKey));
    return raw ? (JSON.parse(raw) as VisitorConversation) : null;
  } catch {
    return null;
  }
}

function saveRef(widgetKey: string, ref: VisitorConversation | null) {
  if (ref) localStorage.setItem(storageKey(widgetKey), JSON.stringify(ref));
  else localStorage.removeItem(storageKey(widgetKey));
}

const emptyHandoff: HandoffInput = { name: '', email: '', phone: '', message: '' };

export function ChatWidget({ widgetKey, defaultOpen = false }: { widgetKey: string; defaultOpen?: boolean }) {
  useDb();
  let config: ReturnType<typeof getWidgetConfig> | null = null;
  try {
    config = getWidgetConfig(widgetKey);
  } catch {
    config = null;
  }

  const [open, setOpen] = useState(defaultOpen);
  const [ref, setRef] = useState<VisitorConversation | null>(() => loadRef(widgetKey));
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoff, setHandoff] = useState<HandoffInput>(emptyHandoff);
  const [handoffErrors, setHandoffErrors] = useState<string[]>([]);
  const [dismissedOfferFor, setDismissedOfferFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRef(loadRef(widgetKey));
    setShowHandoff(false);
    setDraft(null);
    setError(null);
  }, [widgetKey]);

  const transcript: ChatMessage[] = ref ? (getVisitorTranscript(widgetKey, ref) ?? []) : [];
  const handedOff = transcript.some((m) => m.role === 'system');
  const lastAssistant = [...transcript].reverse().find((m) => m.role === 'assistant');
  const offerHandoff =
    !busy &&
    !showHandoff &&
    !handedOff &&
    lastAssistant?.outcome === 'handoff_offered' &&
    transcript[transcript.length - 1]?.id === lastAssistant.id &&
    dismissedOfferFor !== lastAssistant.id;

  useEffect(() => {
    if (ref && getVisitorTranscript(widgetKey, ref) === null) {
      saveRef(widgetKey, null);
      setRef(null);
    }
  }, [ref, widgetKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript.length, draft, showHandoff, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!config) return null;
  const brand = config.brandColor;

  function ensureConversation(): VisitorConversation {
    if (ref && getVisitorTranscript(widgetKey, ref) !== null) return ref;
    const created = startConversation(widgetKey, window.location.pathname);
    saveRef(widgetKey, created);
    setRef(created);
    return created;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setBusy(true);
    setInput('');
    setShowHandoff(false);
    setDraft('');
    try {
      const conv = ensureConversation();
      for await (const event of sendVisitorMessage(widgetKey, conv, trimmed)) {
        if (event.type === 'delta') setDraft((d) => (d ?? '') + event.text);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setDraft(null);
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function openHandoff() {
    const lastVisitor = [...transcript].reverse().find((m) => m.role === 'visitor');
    setHandoff({ ...emptyHandoff, message: lastVisitor?.text ?? '' });
    setHandoffErrors([]);
    setShowHandoff(true);
  }

  function onHandoffSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateHandoff(handoff);
    setHandoffErrors(errors);
    if (errors.length) return;
    try {
      submitHandoff(widgetKey, ensureConversation(), handoff);
      setShowHandoff(false);
      setHandoff(emptyHandoff);
    } catch (err) {
      setHandoffErrors([err instanceof Error ? err.message : 'Could not send your request.']);
    }
  }

  function startOver() {
    saveRef(widgetKey, null);
    setRef(null);
    setShowHandoff(false);
    setError(null);
    setDismissedOfferFor(null);
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={`${config.businessName} chat assistant`}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-white sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[380px] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-black/10"
        >
          <header className="flex items-start gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-white" style={{ backgroundColor: brand }}>
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-semibold">
              {config.businessName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{config.businessName}</p>
              <p className="text-xs text-white/85">Answers from approved business info</p>
            </div>
            <button
              type="button"
              onClick={startOver}
              className="rounded-md px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15"
              title="Start a new conversation"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-white/90 hover:bg-white/15"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 20 20" className="size-5 fill-current" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </header>

          <div className="flex items-center justify-center gap-1.5 border-b border-fuchsia-100 bg-fuchsia-50 px-3 py-1.5 text-[11px] font-medium text-fuchsia-800">
            Local demo: AI responses are simulated. No model is called.
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite" aria-busy={busy}>
            <Bubble role="assistant" brand={brand} text={config.greeting} />

            {transcript.length === 0 && !busy && config.suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {config.suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="rounded-full border bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                    style={{ borderColor: `${brand}55` }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {transcript.map((m) =>
              m.role === 'system' ? (
                <p key={m.id} className="mx-auto max-w-[90%] rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800 ring-1 ring-emerald-200">
                  Request sent. {m.text} The team will be in touch soon.
                </p>
              ) : (
                <Bubble key={m.id} role={m.role} brand={brand} text={m.text} grounded={m.outcome === 'answered'} />
              ),
            )}

            {draft !== null &&
              (draft ? (
                <Bubble role="assistant" brand={brand} text={draft} />
              ) : (
                <div className="flex w-16 items-center justify-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200" aria-label="Assistant is typing">
                  <span className="typing-dot size-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot size-1.5 rounded-full bg-slate-400" />
                  <span className="typing-dot size-1.5 rounded-full bg-slate-400" />
                </div>
              ))}

            {offerHandoff && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openHandoff}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: brand }}
                >
                  Yes, contact the team
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedOfferFor(lastAssistant?.id ?? null)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
                >
                  No thanks
                </button>
              </div>
            )}

            {showHandoff && (
              <form onSubmit={onHandoffSubmit} className="space-y-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200" noValidate>
                <p className="text-sm font-semibold text-slate-900">Contact {config.businessName}</p>
                <p className="text-xs text-slate-600">A person will follow up. Only the business sees these details.</p>
                <input
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  placeholder="Your name"
                  autoComplete="name"
                  aria-label="Your name"
                  value={handoff.name}
                  onChange={(e) => setHandoff({ ...handoff, name: e.target.value })}
                />
                <input
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  aria-label="Email"
                  value={handoff.email}
                  onChange={(e) => setHandoff({ ...handoff, email: e.target.value })}
                />
                <input
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  placeholder="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  aria-label="Phone (optional)"
                  value={handoff.phone}
                  onChange={(e) => setHandoff({ ...handoff, phone: e.target.value })}
                />
                <textarea
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  rows={3}
                  placeholder="How can the team help?"
                  aria-label="Message"
                  value={handoff.message}
                  onChange={(e) => setHandoff({ ...handoff, message: e.target.value })}
                />
                {handoffErrors.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-red-700" role="alert">
                    {handoffErrors.map((er) => (
                      <li key={er}>{er}</li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setShowHandoff(false)} className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    Cancel
                  </button>
                  <button type="submit" className="rounded-md px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: brand }}>
                    Send to team
                  </button>
                </div>
              </form>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_VISITOR_MESSAGE_LENGTH}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask a question…"
                aria-label="Type your question"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-base focus:border-slate-400 focus:outline-none sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-white disabled:opacity-40"
                style={{ backgroundColor: brand }}
                aria-label="Send message"
              >
                <svg viewBox="0 0 20 20" className="size-5 fill-current" aria-hidden>
                  <path d="M3.1 2.3a.75.75 0 0 0-1 .9l1.7 5.9a.75.75 0 0 0 .6.5l6.6 1.1c.3 0 .3.4 0 .5l-6.6 1.1a.75.75 0 0 0-.6.5l-1.7 5.9a.75.75 0 0 0 1 .9 28.9 28.9 0 0 0 15.3-7.2.75.75 0 0 0 0-1.1A28.9 28.9 0 0 0 3.1 2.3Z" />
                </svg>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <button type="button" onClick={openHandoff} disabled={handedOff} className="font-medium underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60">
                {handedOff ? 'Team has been notified' : 'Talk to a person'}
              </button>
              <span>Powered by Array of Sunshine</span>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`fixed right-4 bottom-4 z-40 size-14 place-items-center rounded-full text-white shadow-lg ring-4 ring-white/60 transition hover:scale-105 sm:right-6 sm:bottom-6 ${open ? 'hidden sm:grid' : 'grid'}`}
        style={{ backgroundColor: brand }}
        aria-label={open ? 'Close chat' : `Chat with ${config.businessName}`}
        aria-expanded={open}
      >
        {open ? (
          <svg viewBox="0 0 20 20" className="size-6 fill-current" aria-hidden>
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-7 fill-current" aria-hidden>
            <path d="M4.8 3h14.4A2.8 2.8 0 0 1 22 5.8v9.4a2.8 2.8 0 0 1-2.8 2.8H9.6l-4.7 3.6A.75.75 0 0 1 3.7 21v-3.1A2.8 2.8 0 0 1 2 15.2V5.8A2.8 2.8 0 0 1 4.8 3Zm2.7 6.3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4.5 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm4.5 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" />
          </svg>
        )}
      </button>
    </>
  );
}

function Bubble({ role, text, brand, grounded }: { role: string; text: string; brand: string; grounded?: boolean }) {
  const mine = role === 'visitor';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%]">
        <div
          className={`whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            mine ? 'rounded-br-sm text-white' : 'rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
          }`}
          style={mine ? { backgroundColor: brand } : undefined}
        >
          {text}
        </div>
        {grounded && <p className="mt-1 pl-1 text-[11px] text-slate-500">✓ From approved business information</p>}
      </div>
    </div>
  );
}
