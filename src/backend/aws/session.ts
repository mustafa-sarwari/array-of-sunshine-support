import { useSyncExternalStore } from 'react';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import type { OwnerSessionState } from '../types';

/** Cognito session as a small external store, kept current by Amplify Hub auth events. */

let state: OwnerSessionState = { status: 'loading' };
const listeners = new Set<() => void>();

function set(next: OwnerSessionState) {
  state = next;
  for (const l of listeners) l();
}

async function refresh() {
  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes().catch(() => ({}) as Record<string, string | undefined>);
    const email = attributes.email ?? user.signInDetails?.loginId ?? '';
    set({ status: 'signedIn', identity: { id: user.userId, email, displayName: attributes.name || email || 'Owner' } });
  } catch {
    set({ status: 'signedOut' });
  }
}

let started = false;

/** Call once, after Amplify.configure. */
export function startSessionTracking() {
  if (started) return;
  started = true;
  Hub.listen('auth', ({ payload }) => {
    if (payload.event === 'signedIn') void refresh();
    if (payload.event === 'signedOut' || payload.event === 'tokenRefresh_failure') set({ status: 'signedOut' });
  });
  void refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCognitoSession(): OwnerSessionState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
