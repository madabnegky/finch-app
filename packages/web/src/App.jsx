import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/hooks/useAuth';

// Import all our screens and components
import LandingPage from './screens/LandingPage';
import AppLayout from './screens/AppLayout';
import LoadingScreen from './components/core/LoadingScreen';
import AccountSetupGate from './components/core/AccountSetupGate';
import SetupWizard from './screens/SetupWizard';
import DashboardPage from './screens/DashboardPage';
import BudgetPage from './screens/BudgetPage';
import TransactionsPage from './screens/TransactionsPage';
import ReportsPage from './screens/ReportsPage';
import CalendarPage from './screens/CalendarPage';
import SettingsPage from './screens/SettingsPage';


function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return <LoadingScreen />;
    }
    if (!user) {
        return <Navigate to="/" replace />;
    }
    return children;
}

function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/" element={user ? <Navigate to="/app/dashboard" /> : <LandingPage />} />
            <Route path="/setup" element={<ProtectedRoute><SetupWizard /></ProtectedRoute>} />
            
            <Route
                path="/app"
                element={
                    <ProtectedRoute>
                        <AccountSetupGate>
                            <AppLayout>
                                <Outlet />
                            </AppLayout>
                        </AccountSetupGate>
                    </ProtectedRoute>
                }
            >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                {/* Add this new route for filtered calendar */}
                <Route path="calendar/account/:accountId" element={<CalendarPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;