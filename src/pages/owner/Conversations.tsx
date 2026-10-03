import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, PageHeader, inputClass } from '../../components/ui';
import { useDb } from '../../lib/db';
import { formatDateTime, plural, timeAgo } from '../../lib/format';
import { getConversation, listConversations, listKnowledge, setConversationStatus } from '../../lib/ownerApi';
import type { Conversation, ConversationStatus } from '../../lib/types';
import { useOwner } from './OwnerLayout';

type Filter = 'all' | 'handoff' | 'unanswered' | 'active' | 'closed';

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  if (status === 'handoff') return <Badge tone="amber">Needs follow-up</Badge>;
  if (status === 'closed') return <Badge>Closed</Badge>;
  return <Badge tone="green">Active</Badge>;
}

function hasUnanswered(c: Conversation) {
  return c.messages.some((m) => m.role === 'assistant' && m.outcome === 'handoff_offered');
}

export default function Conversations() {
  const db = useDb();
  const { session } = useOwner();
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const all = listConversations(session, db);
  const selected = id ? getConversation(session, id, db) : undefined;
  const knowledge = listKnowledge(session, db);

  const q = search.trim().toLowerCase();
  const filtered = all.filter((c) => {
    if (filter === 'handoff' && c.status !== 'handoff') return false;
    if (filter === 'active' && c.status !== 'active') return false;
    if (filter === 'closed' && c.status !== 'closed') return false;
    if (filter === 'unanswered' && !hasUnanswered(c)) return false;
    return !q || c.messages.some((m) => m.text.toLowerCase().includes(q)) || c.visitorLabel.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader title="Conversations" description="Every chat from your website widget. Visitors can only ever see their own conversation." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={`${selected ? 'hidden lg:block' : ''} min-w-0`}>
          <div className="mb-3 flex flex-col gap-2">
            <input className={inputClass} placeholder="Search messages…" aria-label="Search messages" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter conversations">
              {(
                [
                  ['all', 'All'],
                  ['handoff', 'Needs follow-up'],
                  ['unanswered', 'Had unanswered'],
                  ['active', 'Active'],
                  ['closed', 'Closed'],
                ] as [Filter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    filter === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No conversations match." />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const first = c.messages.find((m) => m.role === 'visitor');
                  const visitorCount = c.messages.filter((m) => m.role === 'visitor').length;
                  return (
                    <li key={c.id}>
                      <Link
                        to={`/owner/conversations/${c.id}`}
                        className={`block px-4 py-3 hover:bg-slate-50 ${selected?.id === c.id ? 'bg-indigo-50/60' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-500">{c.visitorLabel}</span>
                          <span className="text-xs text-slate-400">{timeAgo(c.updatedAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900">{first?.text ?? 'No messages yet'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <ConversationStatusBadge status={c.status} />
                          {hasUnanswered(c) && <Badge tone="red">Unanswered</Badge>}
                          <span className="text-xs text-slate-500">{plural(visitorCount, 'question')}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className={`${selected ? '' : 'hidden lg:block'} min-w-0`}>
          {selected ? (
            <Card className="flex flex-col">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/owner/conversations')}
                    className="rounded-md p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    ←
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selected.visitorLabel}</p>
                    <p className="text-xs text-slate-500">
                      Started {formatDateTime(selected.startedAt)} {selected.pageUrl && `· on ${selected.pageUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConversationStatusBadge status={selected.status} />
                  {selected.status !== 'closed' ? (
                    <Button variant="secondary" size="sm" onClick={() => setConversationStatus(session, selected.id, 'closed')}>
                      Mark closed
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setConversationStatus(session, selected.id, 'active')}>
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 px-4 py-4">
                {selected.messages.length === 0 && <p className="text-sm text-slate-500">The visitor opened the chat but hasn&apos;t asked anything yet.</p>}
                {selected.messages.map((m) => {
                  if (m.role === 'system') {
                    return (
                      <p key={m.id} className="mx-auto max-w-md rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-800 ring-1 ring-emerald-200">
                        Handoff requested: {m.text} <Link to="/owner/inquiries" className="font-medium underline">View inquiry</Link>
                      </p>
                    );
                  }
                  const visitor = m.role === 'visitor';
                  return (
                    <div key={m.id} className={`flex ${visitor ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[85%] sm:max-w-[70%]">
                        <p className={`mb-1 text-[11px] text-slate-500 ${visitor ? '' : 'text-right'}`}>
                          {visitor ? 'Visitor' : 'Assistant (simulated)'} · {formatDateTime(m.createdAt)}
                        </p>
                        <div
                          className={`whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                            visitor ? 'rounded-tl-sm bg-white text-slate-800 ring-1 ring-slate-200' : 'rounded-tr-sm bg-indigo-600 text-white'
                          }`}
                        >
                          {m.text}
                        </div>
                        {m.role === 'assistant' && (
                          <p className="mt-1 text-right text-[11px]">
                            {m.outcome === 'answered' && (
                              <span className="text-emerald-700">
                                Answered from: {(m.sourceIds ?? []).map((sid) => knowledge.find((k) => k.id === sid)?.question ?? 'deleted entry').join(', ')}
                              </span>
                            )}
                            {m.outcome === 'handoff_offered' && <span className="text-amber-700">No approved answer, offered handoff</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <EmptyState title="Select a conversation">Choose a conversation on the left to read the full transcript.</EmptyState>
          )}
        </div>
      </div>
    </>
  );
}
