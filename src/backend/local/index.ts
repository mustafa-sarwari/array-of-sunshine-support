import { useMemo } from 'react';
import { resetDemoData, subscribeDb, useDb } from '../../lib/db';
import { demoSignOut, useDemoSession } from '../../lib/demoAuth';
import DemoSignIn from '../../pages/owner/DemoSignIn';
import type { Backend, OwnerSessionState } from '../types';
import { localChatClient } from './chatClient';
import { createLocalOwnerData } from './ownerData';

export const backend: Backend = {
  mode: 'local',
  useOwnerSession() {
    const session = useDemoSession();
    return useMemo<OwnerSessionState>(
      () =>
        session
          ? { status: 'signedIn', identity: { id: session.ownerId, email: session.email, displayName: session.displayName } }
          : { status: 'signedOut' },
      [session],
    );
  },
  async signOut() {
    demoSignOut();
  },
  SignInScreen: DemoSignIn,
  createOwnerData: createLocalOwnerData,
  subscribeToChanges: subscribeDb,
  useDemoBusinesses() {
    return useDb().businesses;
  },
  resetDemoData,
  chat: localChatClient,
};
