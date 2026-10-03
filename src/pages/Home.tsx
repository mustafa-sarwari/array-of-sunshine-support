import { Link } from 'react-router-dom';
import { SimulatedBadge } from '../components/ui';
import { resetDemoData, useDb } from '../lib/db';

export default function Home() {
  const db = useDb();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-semibold text-slate-900">Array of Sunshine</span>
        </div>
        <Link to="/owner/sign-in" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Owner dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-10 sm:py-16">
          <div className="flex flex-wrap gap-2">
            <SimulatedBadge>Simulated sign-in</SimulatedBadge>
            <SimulatedBadge>Simulated AI</SimulatedBadge>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              Data stored in this browser only
            </span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-slate-900 sm:text-5xl">
            An AI support assistant that only answers from what the owner approved.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            This is a local demo. Business owners manage approved FAQs and service details. Visitors chat through a
            floating widget. Anything the assistant can&apos;t answer from approved information goes to a human.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link to="/owner/sign-in" className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">For owners</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Owner dashboard</h2>
            <p className="mt-2 text-sm text-slate-600">
              Demo sign-in, approved answers, conversations, customer inquiries, and the unanswered-question inbox.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-indigo-600 group-hover:underline">Sign in to the demo →</span>
          </Link>

          {db.businesses.map((b) => (
            <Link
              key={b.id}
              to={`/demo/${b.slug}`}
              className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: b.brandColor }}>
                Public widget demo
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{b.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{b.tagline}</p>
              <span className="mt-4 inline-block text-sm font-medium group-hover:underline" style={{ color: b.brandColor }}>
                Open the demo website →
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Try it in 2 minutes</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>
                Open the <Link className="font-medium text-amber-700 underline" to="/demo/maple-street-bakery">Maple Street Bakery</Link> site
                and ask &ldquo;Are you open on Sunday?&rdquo; in the chat bubble.
              </li>
              <li>Ask something it doesn&apos;t know, like &ldquo;Do you have keto cupcakes?&rdquo;, then send a request to the team.</li>
              <li>
                In another tab, sign in as the bakery owner. The question shows up under <em>Unanswered</em> and the request under{' '}
                <em>Inquiries</em>.
              </li>
              <li>Turn the unanswered question into an approved answer and ask the widget again.</li>
            </ol>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Test data separation</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              <li>
                Ask the bakery widget &ldquo;How much is a tune-up?&rdquo;. It offers a handoff because that answer belongs to Harbor Bike
                Repair.
              </li>
              <li>Sign in as each owner. Each dashboard only shows its own business&apos;s answers, chats, and inquiries.</li>
              <li>Draft entries (like the bakery&apos;s holiday pies) are never used by the widget until approved.</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset all demo data in this browser to the original sample data?')) resetDemoData();
              }}
              className="mt-4 text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              Reset demo data
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
