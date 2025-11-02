import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import AssetsPage from './pages/Assets';
import DashboardPage from './pages/Dashboard';
import PeoplePage from './pages/People';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/people" element={<PeoplePage />} />
      </Route>
    </Routes>
  );
}
