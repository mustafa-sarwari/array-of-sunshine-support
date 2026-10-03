import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useBackend } from '../../backend/context';
import { OwnerDataProvider, useBusinessQuery, useStatsQuery } from '../../backend/ownerQueries';
import type { OwnerBusiness, OwnerIdentity } from '../../backend/types';
import { Button, DemoBanner, SimulatedBadge } from '../../components/ui';

interface OwnerContext {
  identity: OwnerIdentity;
  business: OwnerBusiness;
}

export function useOwner(): OwnerContext {
  return useOutletContext<OwnerContext>();
}

export default function OwnerLayout() {
  const session = useBackend().useOwnerSession();
  if (session.status === 'loading') return <FullPage>Checking your sign-in…</FullPage>;
  if (session.status === 'signedOut') return <Navigate to="/owner/sign-in" replace />;
  return (
    <OwnerDataProvider key={session.identity.id} identity={session.identity}>
      <OwnerShell identity={session.identity} />
    </OwnerDataProvider>
  );
}

function FullPage({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center text-sm text-slate-700" role="status">
      <div>{children}</div>
    </div>
  );
}

function OwnerShell({ identity }: { identity: OwnerIdentity }) {
  const backend = useBackend();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const businessQuery = useBusinessQuery();
  const stats = useStatsQuery().data;
  const signOut = () => void backend.signOut();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (businessQuery.isPending) return <FullPage>Loading your dashboard…</FullPage>;
  if (businessQuery.isError) {
    return (
      <FullPage>
        <p>{businessQuery.error instanceof Error ? businessQuery.error.message : 'Access error.'}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => void businessQuery.refetch()}>
            Try again
          </Button>
          <Button onClick={signOut}>Sign out</Button>
        </div>
      </FullPage>
    );
  }

  const business = businessQuery.data;
  const newInquiries = stats?.newInquiries ?? 0;
  const openUnanswered = stats?.openUnanswered ?? 0;

  const nav = [
    { to: '/owner', label: 'Overview', end: true },
    { to: '/owner/knowledge', label: 'Approved answers' },
    { to: '/owner/conversations', label: 'Conversations' },
    { to: '/owner/inquiries', label: 'Inquiries', count: newInquiries },
    { to: '/owner/unanswered', label: 'Unanswered', count: openUnanswered },
    { to: '/owner/widget', label: 'Widget & profile' },
  ];

  const navList = (
    <nav className="space-y-1" aria-label="Dashboard">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
            }`
          }
        >
          {item.label}
          {!!item.count && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">{item.count}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarFooter = (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <div className="text-xs text-slate-600">
        <p className="font-medium text-slate-900">{identity.displayName}</p>
        <p className="truncate">{identity.email}</p>
      </div>
      {backend.mode === 'local' && (
        <div className="flex flex-wrap gap-1.5">
          <SimulatedBadge>Demo sign-in</SimulatedBadge>
          <SimulatedBadge>Simulated AI</SimulatedBadge>
        </div>
      )}
      <Button variant="secondary" size="sm" className="w-full" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <BusinessHeader business={business} />
        <div className="flex-1 overflow-y-auto">{navList}</div>
        {sidebarFooter}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <BusinessHeader business={business} />
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 20 20" className="size-5 fill-current" aria-hidden>
            <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
          </svg>
        </button>
      </div>
      {menuOpen && (
        <div className="fixed inset-x-0 top-[61px] bottom-0 z-30 overflow-y-auto bg-white p-4 lg:hidden">
          {navList}
          <div className="mt-6">{sidebarFooter}</div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {backend.mode === 'local' && <DemoBanner className="-mx-4 -mt-6 mb-6 sm:-mx-6 lg:-mx-10 lg:-mt-8" />}
        <Outlet context={{ identity, business } satisfies OwnerContext} />
      </main>
    </div>
  );
}

function BusinessHeader({ business }: { business: OwnerBusiness }) {
  return (
    <Link to="/owner" className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: business.brandColor }}>
        {business.name.charAt(0)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{business.name}</span>
        <span className="block text-xs text-slate-500">Owner dashboard</span>
      </span>
    </Link>
  );
}
