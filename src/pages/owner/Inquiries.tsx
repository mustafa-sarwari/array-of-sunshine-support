import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInquiriesQuery, useOwnerMutation } from '../../backend/ownerQueries';
import { Badge, Card, EmptyState, ErrorNote, PageHeader, QueryState, inputClass, type BadgeTone } from '../../components/ui';
import { formatDateTime, timeAgo } from '../../lib/format';
import type { InquiryStatus } from '../../lib/types';

const statusLabel: Record<InquiryStatus, [string, BadgeTone]> = {
  new: ['New', 'indigo'],
  contacted: ['Contacted', 'amber'],
  resolved: ['Resolved', 'green'],
};

export default function Inquiries() {
  const [filter, setFilter] = useState<'open' | 'all' | InquiryStatus>('open');
  const query = useInquiriesQuery();
  const setStatus = useOwnerMutation((d, a: { id: string; status: InquiryStatus }) => d.setInquiryStatus(a.id, a.status));
  const all = query.data ?? [];
  const items = all.filter((i) => (filter === 'all' ? true : filter === 'open' ? i.status !== 'resolved' : i.status === filter));

  return (
    <>
      <PageHeader
        title="Customer inquiries"
        description="Requests from visitors who asked to talk to a person. Reply by email or phone, then update the status."
        actions={
          <select className={inputClass} aria-label="Filter inquiries" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="open">Open (new + contacted)</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        }
      />

      <ErrorNote error={setStatus.error} />
      <QueryState query={query}>
        {items.length === 0 ? (
          <EmptyState title="No inquiries here.">When a visitor asks for a person, their request shows up here.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((inq) => {
              const [label, tone] = statusLabel[inq.status];
              return (
                <li key={inq.id}>
                  <Card className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{inq.name}</p>
                        <p className="text-xs text-slate-500" title={formatDateTime(inq.createdAt)}>
                          {timeAgo(inq.createdAt)}
                        </p>
                      </div>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <p className="mt-3 flex-1 whitespace-pre-line text-sm text-slate-700">{inq.message}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <a className="font-medium text-indigo-600 hover:underline" href={`mailto:${inq.email}`}>
                        {inq.email}
                      </a>
                      {inq.phone && (
                        <a className="font-medium text-indigo-600 hover:underline" href={`tel:${inq.phone}`}>
                          {inq.phone}
                        </a>
                      )}
                      {inq.conversationId && (
                        <Link className="text-slate-600 hover:underline" to={`/owner/conversations/${inq.conversationId}`}>
                          View conversation
                        </Link>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <label className="text-xs text-slate-600" htmlFor={`status-${inq.id}`}>
                        Status
                      </label>
                      <select
                        id={`status-${inq.id}`}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                        value={inq.status}
                        disabled={setStatus.isPending}
                        onChange={(e) => setStatus.mutate({ id: inq.id, status: e.target.value as InquiryStatus })}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </>
  );
}
