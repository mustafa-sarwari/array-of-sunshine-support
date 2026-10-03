import { Navigate, Route, Routes } from 'react-router-dom';
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
  return (
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
  );
}
