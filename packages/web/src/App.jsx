import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/hooks/useAuth';
import LandingPage from './screens/LandingPage';
import AppLayout from './screens/AppLayout';
import DashboardPage from './screens/DashboardPage';
import TransactionsPage from './screens/TransactionsPage';
import BudgetPage from './screens/BudgetPage';
import ReportsPage from './screens/ReportsPage';
import CalendarPage from './screens/CalendarPage';
import SetupWizard from './screens/SetupWizard';
import LoadingScreen from './components/core/LoadingScreen';
import SettingsPage from './screens/SettingsPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route
        path="/dashboard/*"
        element={
          <PrivateRoute>
            <AppLayout>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <PrivateRoute>
            <SetupWizard />
          </PrivateRoute>
        }
      />
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