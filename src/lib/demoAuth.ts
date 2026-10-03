import { useSyncExternalStore } from 'react';
import { getDb } from './db';

/**
 * SIMULATED AUTHENTICATION — demo only.
 * The session only holds an owner id, the way a verified Cognito token only
 * carries the user's `sub`. The business is always looked up server-side
 * (see ownerApi.requireBusinessId), never taken from the browser.
 */

export interface DemoSession {
  ownerId: string;
  email: string;
  displayName: string;
  issuedAt: string;
}

const SESSION_KEY = 'aos-support-demo:session';
const listeners = new Set<() => void>();
let cached: DemoSession | null | undefined;

function read(): DemoSession | null {
  if (cached !== undefined) return cached;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_KEY) : null;
    cached = raw ? (JSON.parse(raw) as DemoSession) : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(session: DemoSession | null) {
  cached = session;
  if (typeof window !== 'undefined') {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  }
  for (const l of listeners) l();
}

export class DemoAuthError extends Error {}

export function demoSignIn(email: string, password: string): DemoSession {
  const owner = getDb().owners.find((o) => o.email.toLowerCase() === email.trim().toLowerCase());
  if (!owner || owner.password !== password) {
    throw new DemoAuthError('Those demo credentials don\u2019t match. Use one of the demo accounts listed below.');
  }
  const session: DemoSession = {
    ownerId: owner.id,
    email: owner.email,
    displayName: owner.displayName,
    issuedAt: new Date().toISOString(),
  };
  write(session);
  return session;
}

export function demoSignOut(): void {
  write(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) {
      cached = undefined;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useDemoSession(): DemoSession | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
