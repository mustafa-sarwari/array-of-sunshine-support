import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Field, SimulatedBadge, inputClass } from '../../components/ui';
import { useDb } from '../../lib/db';
import { DemoAuthError, demoSignIn, useDemoSession } from '../../lib/demoAuth';

export default function DemoSignIn() {
  const db = useDb();
  const session = useDemoSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/owner" replace />;

  function signIn(e: string, p: string) {
    try {
      demoSignIn(e, p);
      navigate('/owner');
    } catch (err) {
      setError(err instanceof DemoAuthError ? err.message : 'Sign-in failed.');
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    signIn(email, password);
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-slate-900">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-semibold">Array of Sunshine</span>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-slate-900">Demo owner sign-in</h1>
            <SimulatedBadge>Simulated auth</SimulatedBadge>
          </div>
          <div className="mt-3 rounded-lg bg-fuchsia-50 p-3 text-xs leading-relaxed text-fuchsia-900 ring-1 ring-fuchsia-200">
            <strong>This sign-in is not real security.</strong> It only picks which sample owner you are, and the data lives in
            this browser. The production build uses Amazon Cognito, and the server works out your business from your verified
            identity.
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              {(id) => (
                <input id={id} type="email" autoComplete="username" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </Field>
            <Field label="Password">
              {(id) => (
                <input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
            <ul className="mt-3 space-y-2">
              {db.owners.map((o) => {
                const business = db.businesses.find((b) => b.id === db.memberships.find((m) => m.ownerId === o.id)?.businessId);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => signIn(o.email, o.password)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{business?.name ?? o.displayName}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {o.email} / {o.password}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-indigo-600">Sign in →</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
