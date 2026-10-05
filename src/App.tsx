import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useBackend } from './backend/context';
import { DemoBanner } from './components/ui';
import Home from './pages/Home';
import DemoSite from './pages/DemoSite';
import NotFound from './pages/NotFound';
import SignIn from './pages/owner/SignIn';
import OwnerLayout from './pages/owner/OwnerLayout';
import Overview from './pages/owner/Overview';
import Knowledge from './pages/owner/Knowledge';
import Conversations from './pages/owner/Conversations';
import Inquiries from './pages/owner/Inquiries';
import Unanswered from './pages/owner/Unanswered';
import WidgetSettings from './pages/owner/WidgetSettings';

export default function App() {
  const { mode } = useBackend();
  const { pathname } = useLocation();
  // The dashboard shows the banner inside its content column so the sticky sidebar keeps its height.
  const inDashboard = pathname.startsWith('/owner') && pathname !== '/owner/sign-in';
  return (
    <>
      {import.meta.env.VITE_PUBLIC_DEMO === 'true' && <div role="note" style={{ padding: '12px 20px', background: '#fff3cd', color: '#493800', textAlign: 'center' }}>Portfolio demo · Use fictional details and a unique demo password. Accounts, conversations, and saved changes reset when this free service restarts or sleeps. The first visit may take about a minute.</div>}
      {mode === 'local' && !inDashboard && <DemoBanner />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Navigate to="/demo/maple-street-bakery" replace />} />
        <Route path="/demo/:slug" element={<DemoSite />} />
        <Route path="/owner/sign-in" element={<SignIn />} />
        <Route path="/owner" element={<OwnerLayout />}>
          <Route index element={<Overview />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="conversations/:id" element={<Conversations />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="unanswered" element={<Unanswered />} />
          <Route path="widget" element={<WidgetSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
