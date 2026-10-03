import { Suspense } from 'react';
import { useBackend } from '../../backend/context';

export default function SignIn() {
  const { SignInScreen } = useBackend();
  return (
    <Suspense
      fallback={
        <p className="grid min-h-dvh place-items-center text-sm text-slate-600" role="status">
          Loading sign-in…
        </p>
      }
    >
      <SignInScreen />
    </Suspense>
  );
}
