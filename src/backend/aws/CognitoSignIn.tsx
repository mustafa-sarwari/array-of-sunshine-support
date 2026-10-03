import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Link, Navigate } from 'react-router-dom';
import { useCognitoSession } from './session';

export default function CognitoSignIn() {
  const session = useCognitoSession();
  if (session.status === 'signedIn') return <Navigate to="/owner" replace />;

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-slate-900">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-semibold">Array of Sunshine</span>
        </Link>
        {session.status === 'loading' ? (
          <p className="text-center text-sm text-slate-600" role="status">
            Checking your sign-in…
          </p>
        ) : (
          <Authenticator hideSignUp />
        )}
        <p className="mt-6 text-center text-xs text-slate-500">
          Owner accounts are created by an administrator. Self sign-up is turned off.
        </p>
      </div>
    </div>
  );
}
