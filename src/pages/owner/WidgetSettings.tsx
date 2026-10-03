import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Field, PageHeader, buttonClasses, inputClass } from '../../components/ui';
import { updateBusinessProfile, type BusinessProfileInput } from '../../lib/ownerApi';
import { useOwner } from './OwnerLayout';

export default function WidgetSettings() {
  const { session, business } = useOwner();
  const [form, setForm] = useState<BusinessProfileInput>(business);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset only when the business changes, so unrelated data updates don't wipe in-progress edits.
  useEffect(() => setForm(business), [business.id]);

  const embed = `<script src="https://YOUR-AMPLIFY-DOMAIN/widget.js"
        data-widget-key="${business.widgetKey}" async></script>`;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    updateBusinessProfile(session, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const set = (patch: Partial<BusinessProfileInput>) => setForm({ ...form, ...patch });

  return (
    <>
      <PageHeader
        title="Widget & profile"
        description="How the chat widget looks and greets visitors. Hours, prices, and policies belong in Approved answers so the assistant can use them."
        actions={
          <Link to={`/demo/${business.slug}`} target="_blank" rel="noreferrer" className={buttonClasses('secondary')}>
            Preview widget ↗
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name">{(id) => <input id={id} className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} />}</Field>
              <Field label="Brand color">
                {(id) => (
                  <div className="flex gap-2">
                    <input
                      id={id}
                      type="color"
                      className="h-9 w-12 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
                      value={form.brandColor}
                      onChange={(e) => set({ brandColor: e.target.value })}
                    />
                    <input className={inputClass} aria-label="Brand color hex" value={form.brandColor} onChange={(e) => set({ brandColor: e.target.value })} />
                  </div>
                )}
              </Field>
            </div>
            <Field label="Tagline">{(id) => <input id={id} className={inputClass} value={form.tagline} onChange={(e) => set({ tagline: e.target.value })} />}</Field>
            <Field label="Widget greeting" hint="The first message visitors see when they open the chat.">
              {(id) => <textarea id={id} rows={3} className={inputClass} value={form.greeting} onChange={(e) => set({ greeting: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Phone">{(id) => <input id={id} className={inputClass} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}</Field>
              <Field label="Email">{(id) => <input id={id} type="email" className={inputClass} value={form.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
              <Field label="Address">{(id) => <input id={id} className={inputClass} value={form.address} onChange={(e) => set({ address: e.target.value })} />}</Field>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit">Save changes</Button>
              {saved && (
                <span className="text-sm text-emerald-700" role="status">
                  Saved
                </span>
              )}
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Embed code</h2>
            <p className="mt-1 text-xs text-slate-600">
              After the AWS deployment, paste this before <code>&lt;/body&gt;</code> on your website. The widget key is public. It only allows
              chatting with your approved answers and never exposes conversations or documents.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{embed}</pre>
            <Button variant="secondary" size="sm" className="mt-2" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Allowed websites</h2>
            <p className="mt-1 text-xs text-slate-600">The public chat endpoint rejects requests from other origins.</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {business.allowedOrigins.map((o) => (
                <li key={o} className="truncate rounded bg-slate-100 px-2 py-1 font-mono">
                  {o}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
