import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useKnowledgeQuery, useOwnerMutation, useUnansweredQuery } from '../../backend/ownerQueries';
import { Badge, Button, Card, EmptyState, ErrorNote, PageHeader, QueryState } from '../../components/ui';
import { timeAgo } from '../../lib/format';
import type { UnansweredStatus } from '../../lib/types';

export default function Unanswered() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<UnansweredStatus>('open');
  const query = useUnansweredQuery();
  const setStatus = useOwnerMutation((d, a: { id: string; status: UnansweredStatus }) => d.setUnansweredStatus(a.id, a.status));
  const all = query.data ?? [];
  const knowledge = useKnowledgeQuery().data ?? [];
  const items = all.filter((u) => u.status === tab);
  const counts = { open: 0, resolved: 0, dismissed: 0 };
  for (const u of all) counts[u.status]++;

  return (
    <>
      <PageHeader
        title="Unanswered questions"
        description="Questions the assistant couldn't answer from approved information. Add an approved answer so it can handle them next time."
      />

      <div className="mb-4 flex gap-1.5" role="tablist" aria-label="Question status">
        {(['open', 'resolved', 'dismissed'] as UnansweredStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              tab === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      <ErrorNote error={setStatus.error} />
      <QueryState query={query}>
        {items.length === 0 ? (
          <EmptyState title={tab === 'open' ? 'Inbox zero!' : `No ${tab} questions.`}>
            {tab === 'open' && 'Every question so far was answered from your approved information.'}
          </EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {items.map((u) => {
                const linked = u.resolvedKnowledgeId ? knowledge.find((k) => k.id === u.resolvedKnowledgeId) : undefined;
                return (
                  <li key={u.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">&ldquo;{u.question}&rdquo;</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Asked {timeAgo(u.createdAt)}
                        {u.conversationId && (
                          <>
                            {' · '}
                            <Link to={`/owner/conversations/${u.conversationId}`} className="hover:underline">
                              View conversation
                            </Link>
                          </>
                        )}
                        {linked && (
                          <>
                            {' · '}
                            <Badge tone="green">Answered by &ldquo;{linked.question}&rdquo;</Badge>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {u.status === 'open' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/owner/knowledge?question=${encodeURIComponent(u.question)}&unanswered=${encodeURIComponent(u.id)}`)}
                          >
                            Write approved answer
                          </Button>
                          <Button variant="secondary" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: u.id, status: 'dismissed' })}>
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: u.id, status: 'open' })}>
                          Move back to open
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </QueryState>
    </>
  );
}
