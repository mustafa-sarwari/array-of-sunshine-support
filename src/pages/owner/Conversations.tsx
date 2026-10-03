import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useBackend } from '../../backend/context';
import { useKnowledgeQuery, useOwnerData, useOwnerMutation, useOwnerQuery } from '../../backend/ownerQueries';
import type { ConversationSummary } from '../../backend/types';
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, QueryState, inputClass } from '../../components/ui';
import { formatDateTime, plural, timeAgo } from '../../lib/format';
import type { ConversationStatus } from '../../lib/types';

type Filter = 'all' | 'handoff' | 'unanswered' | 'active' | 'closed';

const PAGE_SIZE = 50;

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  if (status === 'handoff') return <Badge tone="amber">Needs follow-up</Badge>;
  if (status === 'closed') return <Badge>Closed</Badge>;
  return <Badge tone="green">Active</Badge>;
}

const hasUnanswered = (c: ConversationSummary) => c.handoffOfferedCount > 0;

export default function Conversations() {
  const backend = useBackend();
  const data = useOwnerData();
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const listQuery = useInfiniteQuery({
    queryKey: ['conversations', 'list'],
    queryFn: ({ pageParam }) => data.listConversations({ limit: PAGE_SIZE, nextToken: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextToken,
  });
  const detailQuery = useOwnerQuery(['conversation', id], (d) => d.getConversation(id!), { enabled: !!id });
  const knowledge = useKnowledgeQuery().data ?? [];
  const setStatus = useOwnerMutation((d, args: { id: string; status: ConversationStatus }) => d.setConversationStatus(args.id, args.status));

  const all = listQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const selected = detailQuery.data ?? undefined;

  const q = search.trim().toLowerCase();
  const filtered = all.filter((c) => {
    if (filter === 'handoff' && c.status !== 'handoff') return false;
    if (filter === 'active' && c.status !== 'active') return false;
    if (filter === 'closed' && c.status !== 'closed') return false;
    if (filter === 'unanswered' && !hasUnanswered(c)) return false;
    return !q || `${c.firstQuestion ?? ''} ${c.visitorLabel} ${c.pageUrl ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeader title="Conversations" description="Every chat from your website widget. Visitors can only ever see their own conversation." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={`${id ? 'hidden lg:block' : ''} min-w-0`}>
          <div className="mb-3 flex flex-col gap-2">
            <input className={inputClass} placeholder="Search conversations…" aria-label="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} />
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

          <QueryState query={listQuery}>
            {filtered.length === 0 ? (
              <EmptyState title="No conversations match." />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/owner/conversations/${c.id}`}
                        className={`block px-4 py-3 hover:bg-slate-50 ${id === c.id ? 'bg-indigo-50/60' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-500">{c.visitorLabel}</span>
                          <span className="text-xs text-slate-400">{timeAgo(c.updatedAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900">{c.firstQuestion ?? 'No messages yet'}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <ConversationStatusBadge status={c.status} />
                          {hasUnanswered(c) && <Badge tone="red">Unanswered</Badge>}
                          <span className="text-xs text-slate-500">{plural(c.visitorMessageCount, 'question')}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {listQuery.hasNextPage && (
              <Button variant="secondary" size="sm" className="mt-3 w-full" disabled={listQuery.isFetchingNextPage} onClick={() => void listQuery.fetchNextPage()}>
                {listQuery.isFetchingNextPage ? 'Loading…' : 'Load older conversations'}
              </Button>
            )}
          </QueryState>
        </div>

        <div className={`${id ? '' : 'hidden lg:block'} min-w-0`}>
          {!id ? (
            <EmptyState title="Select a conversation">Choose a conversation on the left to read the full transcript.</EmptyState>
          ) : (
            <QueryState query={detailQuery}>
              {!selected ? (
                <EmptyState title="Conversation not found">It may have been removed, or it belongs to another business.</EmptyState>
              ) : (
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
                        <p className="text-sm font-semibold text-slate-900">{selected.summary.visitorLabel}</p>
                        <p className="text-xs text-slate-500">
                          Started {formatDateTime(selected.summary.startedAt)} {selected.summary.pageUrl && `· on ${selected.summary.pageUrl}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConversationStatusBadge status={selected.summary.status} />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: selected.summary.id, status: selected.summary.status !== 'closed' ? 'closed' : 'active' })}
                      >
                        {selected.summary.status !== 'closed' ? 'Mark closed' : 'Reopen'}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 bg-slate-50 px-4 py-4">
                    <ErrorNote error={setStatus.error} />
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
                              {visitor ? 'Visitor' : backend.chat.simulated ? 'Assistant (simulated)' : 'Assistant'} · {formatDateTime(m.createdAt)}
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
              )}
            </QueryState>
          )}
        </div>
      </div>
    </>
  );
}
