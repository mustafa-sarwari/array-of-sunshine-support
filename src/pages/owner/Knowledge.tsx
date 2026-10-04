import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { KnowledgeEntry } from '../../../shared/knowledge';
import { useBackend } from '../../backend/context';
import { useKnowledgeQuery, useOwnerMutation } from '../../backend/ownerQueries';
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Modal, PageHeader, QueryState, SimulatedBadge, inputClass } from '../../components/ui';
import { timeAgo } from '../../lib/format';
import { generateSimulatedReply } from '../../lib/simulatedAi';
import type { KnowledgeKind, KnowledgeStatus } from '../../lib/types';
import { validateKnowledge, type KnowledgeInput } from '../../lib/validation';
import { useOwner } from './OwnerLayout';

type KindFilter = 'all' | KnowledgeKind;
type StatusFilter = 'all' | KnowledgeStatus;

const emptyInput: KnowledgeInput = { kind: 'faq', question: '', answer: '', keywords: [], status: 'approved' };
const NO_ITEMS: KnowledgeEntry[] = [];

export default function Knowledge() {
  const backend = useBackend();
  const { business } = useOwner();
  const [params, setParams] = useSearchParams();
  const knowledgeQuery = useKnowledgeQuery();
  const items = knowledgeQuery.data ?? NO_ITEMS;
  const save = useOwnerMutation((d, a: { input: KnowledgeInput; id?: string; resolves?: string }) => d.saveKnowledge(a.input, a.id, a.resolves));
  const remove = useOwnerMutation((d, id: string) => d.deleteKnowledge(id));

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<{ id?: string; input: KnowledgeInput; keywordsText: string; resolves?: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [testQuestion, setTestQuestion] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const question = params.get('question');
    if (question) {
      setEditing({ input: { ...emptyInput, question }, keywordsText: '', resolves: params.get('unanswered') ?? undefined });
      setErrors([]);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const editId = params.get('edit');
  useEffect(() => {
    if (!editId || !knowledgeQuery.isSuccess) return;
    const item = items.find((k) => k.id === editId);
    if (item) openEdit(item);
    setParams({}, { replace: true });
  }, [editId, items, knowledgeQuery.isSuccess, setParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (k) =>
        (kind === 'all' || k.kind === kind) &&
        (status === 'all' || k.status === status) &&
        (!q || `${k.question} ${k.answer} ${k.keywords.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [items, search, kind, status]);

  const testResult = useMemo(
    () => (testQuestion.trim() ? generateSimulatedReply(business.name, items, testQuestion) : null),
    [testQuestion, items, business.name],
  );

  function openNew() {
    setEditing({ input: emptyInput, keywordsText: '' });
    setErrors([]);
  }

  function openEdit(item: KnowledgeEntry) {
    setEditing({
      id: item.id,
      input: { kind: item.kind, question: item.question, answer: item.answer, keywords: item.keywords, status: item.status },
      keywordsText: item.keywords.join(', '),
    });
    setErrors([]);
  }

  async function onSave(e?: FormEvent) {
    e?.preventDefault();
    if (!editing || save.isPending) return;
    const input = { ...editing.input, keywords: editing.keywordsText.split(',') };
    const v = validateKnowledge(input);
    setErrors(v);
    if (v.length) return;
    try {
      await save.mutateAsync({ input, id: editing.id, resolves: editing.resolves });
      setNotice(editing.id ? 'Entry updated.' : editing.resolves ? input.status === 'approved' ? 'Answer added and question marked resolved.' : 'Draft saved; question remains open.' : 'Entry added.');
      setEditing(null);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Could not save.']);
    }
  }

  async function onDelete(item: KnowledgeEntry) {
    if (!confirm(`Delete "${item.question}"? The assistant will stop using it immediately.`)) return;
    try {
      await remove.mutateAsync(item.id);
      setNotice('Entry deleted.');
    } catch {
      // Shown by the ErrorNote bound to remove.error.
    }
  }

  const set = (patch: Partial<KnowledgeInput>) => editing && setEditing({ ...editing, input: { ...editing.input, ...patch } });
  const titleOf = (id: string) => items.find((k) => k.id === id)?.question ?? id;

  return (
    <>
      <PageHeader
        title="Approved answers"
        description="FAQs and service information the assistant is allowed to use. Only entries marked Approved are shown to visitors. Drafts stay private."
        actions={<Button onClick={openNew}>+ Add entry</Button>}
      />

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200" role="status">
          {notice}
          <button type="button" className="text-xs font-medium" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <ErrorNote error={remove.error} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              className={`${inputClass} sm:max-w-xs`}
              placeholder="Search answers…"
              aria-label="Search answers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <select className={inputClass} aria-label="Filter by type" value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
                <option value="all">All types</option>
                <option value="faq">FAQs</option>
                <option value="service">Service info</option>
              </select>
              <select className={inputClass} aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                <option value="all">Any status</option>
                <option value="approved">Approved</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <QueryState query={knowledgeQuery}>
            {filtered.length === 0 ? (
              <EmptyState title={items.length ? 'No entries match your filters.' : 'No approved answers yet.'}>
                {!items.length && 'Add your first FAQ so the assistant has something to answer from.'}
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {filtered.map((item) => (
                  <li key={item.id}>
                    <Card className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={item.status === 'approved' ? 'green' : 'amber'}>{item.status === 'approved' ? 'Approved' : 'Draft'}</Badge>
                            <Badge tone={item.kind === 'faq' ? 'indigo' : 'sky'}>{item.kind === 'faq' ? 'FAQ' : 'Service info'}</Badge>
                            <span className="text-xs text-slate-500">Updated {timeAgo(item.updatedAt)}</span>
                          </div>
                          <h3 className="mt-2 text-sm font-semibold text-slate-900">{item.question}</h3>
                          <p className="mt-1 line-clamp-3 text-sm text-slate-600">{item.answer}</p>
                          {item.keywords.length > 0 && (
                            <p className="mt-2 flex flex-wrap gap-1">
                              {item.keywords.map((kw) => (
                                <span key={kw} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                                  {kw}
                                </span>
                              ))}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => onDelete(item)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Test the assistant</h2>
              {backend.chat.simulated ? <SimulatedBadge /> : <Badge>Retrieval preview</Badge>}
            </div>
            <p className="mt-1 text-xs text-slate-600">Type a customer question to see which approved answer would be used.</p>
            <input
              className={`${inputClass} mt-3`}
              placeholder="e.g. Do you deliver?"
              aria-label="Test question"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
            />
            {testResult && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
                {testResult.outcome === 'answered' ? (
                  <>
                    <p className="text-xs font-semibold text-emerald-700">Would answer from: {testResult.sourceIds.map(titleOf).join(', ')}</p>
                    {backend.mode !== 'aws' ? (
                      <p className="mt-1 whitespace-pre-line text-slate-700">{testResult.text}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-600">The live assistant writes its reply with Amazon Bedrock using only these entries.</p>
                    )}
                  </>
                ) : testResult.unanswered ? (
                  <p className="text-xs font-semibold text-amber-700">No approved answer matches. The visitor would be offered a handoff, and the question would go to your Unanswered inbox.</p>
                ) : (
                  <p className="text-slate-700">{testResult.text}</p>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>

      <Modal
        open={!!editing}
        title={editing?.id ? 'Edit entry' : 'Add approved entry'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {editing && (
          <form onSubmit={onSave} className="space-y-4">
            {editing.resolves && (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800 ring-1 ring-indigo-200">
                Saving an approved answer resolves this question. A draft leaves it open.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                {(id) => (
                  <select id={id} className={inputClass} value={editing.input.kind} onChange={(e) => set({ kind: e.target.value as KnowledgeKind })}>
                    <option value="faq">FAQ</option>
                    <option value="service">Service information</option>
                  </select>
                )}
              </Field>
              <Field label="Status" hint="Only approved entries are used by the assistant.">
                {(id) => (
                  <select id={id} className={inputClass} value={editing.input.status} onChange={(e) => set({ status: e.target.value as KnowledgeStatus })}>
                    <option value="approved">Approved</option>
                    <option value="draft">Draft</option>
                  </select>
                )}
              </Field>
            </div>
            <Field label={editing.input.kind === 'faq' ? 'Question' : 'Title'}>
              {(id) => (
                <input
                  id={id}
                  className={inputClass}
                  value={editing.input.question}
                  onChange={(e) => set({ question: e.target.value })}
                  placeholder={editing.input.kind === 'faq' ? 'Do you take reservations?' : 'Delivery area'}
                />
              )}
            </Field>
            <Field label="Approved answer" hint={`${editing.input.answer.length}/1500 characters. Write exactly what customers should be told.`}>
              {(id) => (
                <textarea id={id} rows={5} className={inputClass} value={editing.input.answer} onChange={(e) => set({ answer: e.target.value })} />
              )}
            </Field>
            <Field label="Keywords" hint="Comma-separated words customers might use, e.g. delivery, deliver, shipping.">
              {(id) => (
                <input id={id} className={inputClass} value={editing.keywordsText} onChange={(e) => setEditing({ ...editing, keywordsText: e.target.value })} />
              )}
            </Field>
            {errors.length > 0 && (
              <ul role="alert" className="space-y-1 text-sm text-red-700">
                {errors.map((er) => (
                  <li key={er}>{er}</li>
                ))}
              </ul>
            )}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}
      </Modal>
    </>
  );
}
