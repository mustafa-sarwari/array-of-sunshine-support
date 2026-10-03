import { Link } from 'react-router-dom';
import { useBackend } from '../../backend/context';
import { useOwnerQuery, useStatsQuery, useUnansweredQuery } from '../../backend/ownerQueries';
import { Badge, Button, Card, ErrorNote, PageHeader, QueryState, StatCard, buttonClasses } from '../../components/ui';
import { timeAgo } from '../../lib/format';
import { useOwner } from './OwnerLayout';
import { ConversationStatusBadge } from './Conversations';

export default function Overview() {
  const backend = useBackend();
  const { identity, business } = useOwner();
  const statsQuery = useStatsQuery();
  const recentQuery = useOwnerQuery(['conversations', 'recent'], (d) => d.listConversations({ limit: 5 }));
  const unansweredQuery = useUnansweredQuery();

  const stats = statsQuery.data;
  const answerRate = stats?.ratedReplies ? Math.round((stats.answeredReplies / stats.ratedReplies) * 100) : 0;
  const conversations = recentQuery.data?.items ?? [];
  const openUnanswered = (unansweredQuery.data ?? []).filter((u) => u.status === 'open');
  const value = (n: number | string | undefined) => n ?? '…';

  return (
    <>
      <PageHeader
        title={`Welcome back, ${identity.displayName.split(' ')[0]}`}
        description={
          backend.mode === 'local'
            ? `Here's how the ${business.name} assistant is doing. Everything shown is sample data stored in this browser.`
            : `Here's how the ${business.name} assistant is doing.`
        }
        actions={
          business.previewPath && (
            <Link to={business.previewPath} target="_blank" rel="noreferrer" className={buttonClasses('secondary')}>
              Open widget demo ↗
            </Link>
          )
        }
      />

      <ErrorNote error={statsQuery.error} onRetry={() => void statsQuery.refetch()} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Conversations (7 days)" value={value(stats?.conversationsLast7Days)} hint={`${value(stats?.conversationsTotal)} total`} />
        <StatCard
          label="Answered from approved info"
          value={stats ? `${answerRate}%` : '…'}
          hint={`${value(stats?.answeredReplies)} of ${value(stats?.ratedReplies)} questions`}
        />
        <StatCard label="New inquiries" value={value(stats?.newInquiries)} hint="Waiting for a reply" />
        <StatCard label="Unanswered questions" value={value(stats?.openUnanswered)} hint={`${value(stats?.approvedAnswers)} approved answers live`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent conversations</h2>
            <Link to="/owner/conversations" className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="px-4">
            <QueryState query={recentQuery}>{null}</QueryState>
          </div>
          <ul className="divide-y divide-slate-100">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link to={`/owner/conversations/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{c.firstQuestion ?? 'No messages yet'}</p>
                    <p className="text-xs text-slate-500">
                      {c.visitorLabel} · {timeAgo(c.updatedAt)}
                    </p>
                  </div>
                  <ConversationStatusBadge status={c.status} />
                </Link>
              </li>
            ))}
            {recentQuery.isSuccess && conversations.length === 0 && <li className="px-4 py-6 text-sm text-slate-500">No conversations yet.</li>}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Needs an answer</h2>
              <Link to="/owner/unanswered" className="text-xs font-medium text-indigo-600 hover:underline">
                Inbox
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {openUnanswered.slice(0, 4).map((u) => (
                <li key={u.id} className="px-4 py-3">
                  <p className="text-sm text-slate-900">&ldquo;{u.question}&rdquo;</p>
                  <p className="text-xs text-slate-500">{timeAgo(u.createdAt)}</p>
                </li>
              ))}
              {unansweredQuery.isSuccess && openUnanswered.length === 0 && <li className="px-4 py-6 text-sm text-slate-500">All caught up.</li>}
            </ul>
          </Card>

          {backend.resetDemoData ? (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-slate-900">About this demo</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                <li className="flex gap-2">
                  <Badge tone="amber">Local</Badge> Data is saved in this browser&apos;s storage.
                </li>
                <li className="flex gap-2">
                  <Badge tone="amber">Simulated</Badge> Sign-in and AI replies are simulated.
                </li>
                <li className="flex gap-2">
                  <Badge tone="green">Rule</Badge> The assistant only uses approved entries.
                </li>
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 -ml-2"
                onClick={() => {
                  if (confirm('Reset all demo data in this browser to the original sample data?')) backend.resetDemoData?.();
                }}
              >
                Reset demo data
              </Button>
            </Card>
          ) : (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-slate-900">How replies work</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                <li className="flex gap-2">
                  <Badge tone="green">Rule</Badge> The assistant only uses approved entries.
                </li>
                <li className="flex gap-2">
                  <Badge tone="indigo">AI</Badge> Replies are written by Amazon Bedrock from those entries.
                </li>
                <li className="flex gap-2">
                  <Badge>Handoff</Badge> Anything else goes to your Inquiries and Unanswered inbox.
                </li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
