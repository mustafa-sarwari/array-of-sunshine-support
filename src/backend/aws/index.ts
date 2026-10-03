import { lazy } from 'react';
import { Amplify } from 'aws-amplify';
import { signOut } from 'aws-amplify/auth';
import { SEED_BUSINESSES } from '../../lib/seed';
import { createHttpChatClient } from '../http/chatClient';
import type { Backend } from '../types';
import { amplifyOutputs, publicChatUrl } from './outputs';
import { createAwsOwnerData } from './ownerData';
import { startSessionTracking, useCognitoSession } from './session';

if (!amplifyOutputs) {
  throw new Error('amplify_outputs.json was not found. Deploy the backend (npx ampx sandbox or Amplify Hosting), then rebuild with VITE_BACKEND=aws.');
}
if (!publicChatUrl) {
  throw new Error('No public chat URL. amplify_outputs.json has no custom.publicChatUrl and VITE_PUBLIC_CHAT_URL is not set.');
}

Amplify.configure(amplifyOutputs);
startSessionTracking();

export const backend: Backend = {
  mode: 'aws',
  useOwnerSession: useCognitoSession,
  signOut: () => signOut(),
  SignInScreen: lazy(() => import('./CognitoSignIn')),
  createOwnerData: createAwsOwnerData,
  useDemoBusinesses: () => SEED_BUSINESSES,
  chat: createHttpChatClient(publicChatUrl),
};
