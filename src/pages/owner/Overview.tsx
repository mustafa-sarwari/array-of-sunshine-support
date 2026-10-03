import { Link } from 'react-router-dom';
import { Badge, Button, Card, PageHeader, StatCard, buttonClasses } from '../../components/ui';
import { resetDemoData, useDb } from '../../lib/db';
import { timeAgo } from '../../lib/format';
import { listConversations, listInquiries, listKnowledge, listUnanswered } from '../../lib/ownerApi';
import { useOwner } from './OwnerLayout';
import { ConversationStatusBadge } from './Conversations';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function Overview() {
  const db = useDb();
  const { session, business } = useOwner();

  const conversations = listConversations(session, db);
  const knowledge = listKnowledge(session, db);
  const inquiries = listInquiries(session, db);
  const unanswered = listUnanswered(session, db);

  const recent = conversations.filter((c) => Date.now() - new Date(c.updatedAt).getTime() < WEEK);
  const replies = conversations.flatMap((c) => c.messages).filter((m) => m.role === 'assistant' && m.outcome !== 'smalltalk');
  const answered = replies.filter((m) => m.outcome === 'answered').length;
  const answerRate = replies.length ? Math.round((answered / replies.length) * 100) : 0;
  const approvedCount = knowledge.filter((k) => k.status === 'approved').length;
  const openUnanswered = unanswered.filter((u) => u.status === 'open');
  const newInquiries = inquiries.filter((i) => i.status === 'new');

  return (
    <>
      <PageHeader
        title={`Welcome back, ${session.displayName.split(' ')[0]}`}
        description={`Here's how the ${business.name} assistant is doing. Everything shown is sample data stored in this browser.`}
        actions={
          <Link to={`/demo/${business.slug}`} target="_blank" rel="noreferrer" className={buttonClasses('secondary')}>
            Open widget demo ↗
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Conversations (7 days)" value={recent.length} hint={`${conversations.length} total`} />
        <StatCard label="Answered from approved info" value={`${answerRate}%`} hint={`${answered} of ${replies.length} questions`} />
        <StatCard label="New inquiries" value={newInquiries.length} hint="Waiting for a reply" />
        <StatCard label="Unanswered questions" value={openUnanswered.length} hint={`${approvedCount} approved answers live`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recent conversations</h2>
            <Link to="/owner/conversations" className="text-xs font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {conversations.slice(0, 5).map((c) => {
              const first = c.messages.find((m) => m.role === 'visitor');
              return (
                <li key={c.id}>
                  <Link to={`/owner/conversations/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{first?.text ?? 'No messages yet'}</p>
                      <p className="text-xs text-slate-500">
                        {c.visitorLabel} · {timeAgo(c.updatedAt)}
                      </p>
                    </div>
                    <ConversationStatusBadge status={c.status} />
                  </Link>
                </li>
              );
            })}
            {conversations.length === 0 && <li className="px-4 py-6 text-sm text-slate-500">No conversations yet.</li>}
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
              {openUnanswered.length === 0 && <li className="px-4 py-6 text-sm text-slate-500">All caught up.</li>}
            </ul>
          </Card>

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
                if (confirm('Reset all demo data in this browser to the original sample data?')) resetDemoData();
              }}
            >
              Reset demo data
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
