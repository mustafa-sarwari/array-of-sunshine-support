import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BackendContext } from './backend/context';
import type { Backend } from './backend/types';
import './index.css';

const root = createRoot(document.getElementById('root')!);

// A literal condition on import.meta.env lets the bundler drop the unused backend entirely.
const load: Promise<{ backend: Backend }> = import.meta.env.VITE_BACKEND === 'aws' ? import('./backend/aws') : import('./backend/local');

load.then(
  ({ backend }) =>
    root.render(
      <StrictMode>
        <BackendContext.Provider value={backend}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </BackendContext.Provider>
      </StrictMode>,
    ),
  (error: unknown) =>
    root.render(
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-lg rounded-xl bg-white p-6 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-base font-semibold text-slate-900">The app isn&apos;t configured yet</h1>
          <p className="mt-2">{error instanceof Error ? error.message : 'The backend failed to load.'}</p>
        </div>
      </div>,
    ),
);
