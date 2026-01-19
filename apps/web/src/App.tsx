import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { CreateLeadPage } from './pages/CreateLeadPage';
import { CalendarPage } from './pages/CalendarPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationProvider } from './components/NotificationProvider';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    return isAuthenticated ? (
        <NotificationProvider>{children}</NotificationProvider>
    ) : (
        <Navigate to="/login" replace />
    );
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <MainLayout />
                    </PrivateRoute>
                }
            >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="leads/new" element={<CreateLeadPage />} />
                <Route path="leads/:id" element={<LeadDetailPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="communications" element={<CommunicationsPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
        </Routes>
    );
}

export default App;

