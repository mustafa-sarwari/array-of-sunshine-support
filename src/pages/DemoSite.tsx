import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useBackend } from '../backend/context';
import { ChatWidget } from '../components/ChatWidget';
import NotFound from './NotFound';

const mapleMenu = [
  { name: 'Country sourdough', detail: 'Baked daily, ready by 9 am', price: '$9' },
  { name: 'Morning bun', detail: 'Orange zest, cinnamon sugar', price: '$4.50' },
  { name: 'Maple pecan scone', detail: 'Local maple glaze', price: '$4' },
  { name: 'Celebration cake', detail: '72 hours notice, from 6"', price: 'from $45' },
];

const harborMenu = [
  { name: 'Basic tune-up', detail: 'Brakes, gears, safety check', price: '$75' },
  { name: 'Full tune-up', detail: 'Adds truing and drivetrain clean', price: '$140' },
  { name: 'Flat repair', detail: 'About 20 minutes, walk-in', price: '$15 + tube' },
  { name: 'Hybrid rental', detail: 'Helmet and lock included', price: '$35/day' },
];

export default function DemoSite() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const backend = useBackend();
  const businesses = backend.useDemoBusinesses();
  const business = businesses.find((b) => b.slug === slug);
  if (!business) return <NotFound />;

  const isBakery = business.slug === 'maple-street-bakery';
  const menu = isBakery ? mapleMenu : harborMenu;
  const others = businesses.filter((b) => b.id !== business.id);

  return (
    <div className="min-h-dvh bg-white">
      <div className="bg-slate-900 px-4 py-2 text-center text-xs text-slate-200">
        <span className="font-semibold text-white">Demo website.</span> The chat bubble in the corner is the embeddable widget.
        {backend.chat.simulated ? ' AI replies are simulated.' : ' Replies come from Amazon Bedrock, limited to approved answers.'}{' '}
        <Link to="/" className="underline">
          Demo home
        </Link>
        {others.map((o) => (
          <span key={o.id}>
            {' · '}
            <Link to={`/demo/${o.slug}`} className="underline">
              Switch to {o.name}
            </Link>
          </span>
        ))}
      </div>

      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="font-display text-xl font-semibold" style={{ color: business.brandColor }}>
            {business.name}
          </span>
          <nav className="hidden gap-6 text-sm text-slate-600 sm:flex">
            <span>{isBakery ? 'Menu' : 'Services'}</span>
            <span>Visit</span>
            <span>Contact</span>
          </nav>
        </div>
      </header>

      <main>
        <section className={isBakery ? 'bg-amber-50' : 'bg-cyan-50'}>
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center md:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: business.brandColor }}>
                {business.category}
              </p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-slate-900 sm:text-5xl">{business.tagline}</h1>
              <p className="mt-4 text-slate-600">
                {business.address} · {business.phone}
              </p>
              <p className="mt-6 text-sm text-slate-500">Have a question? Tap the chat bubble in the bottom-right corner.</p>
            </div>
            <div
              className="aspect-[4/3] rounded-3xl shadow-inner"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${business.brandColor}33, transparent 60%), radial-gradient(circle at 70% 70%, ${business.brandColor}55, transparent 55%), #fff`,
              }}
              aria-hidden
            />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl text-slate-900">{isBakery ? 'Favorites' : 'Popular services'}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {menu.map((m) => (
              <li key={m.name} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">{m.name}</p>
                  <p className="text-sm text-slate-600">{m.detail}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold" style={{ color: business.brandColor }}>
                  {m.price}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-500">
          {business.name} · {business.address} · {business.email}
        </footer>
      </main>

      <ChatWidget key={business.widgetKey} client={backend.chat} widgetKey={business.widgetKey} defaultOpen={params.get('chat') === 'open'} />
    </div>
  );
}
