import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@shared/hooks/useAuth';

// Import all our screens and components
import LandingPage from './screens/LandingPage';
import AppLayout from './screens/AppLayout';
import LoadingScreen from './components/core/LoadingScreen';
import AccountSetupGate from './components/core/AccountSetupGate';
import SetupWizard from './screens/SetupWizard';

// A simple wrapper to protect routes that require a user to be logged in
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

// The main router component
function AppRoutes() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* If there is a user, the root path redirects to the app, otherwise show landing page */}
            <Route path="/" element={user ? <Navigate to="/app" /> : <LandingPage />} />

            {/* The setup wizard is a protected route */}
            <Route
                path="/setup"
                element={
                    <ProtectedRoute>
                        <SetupWizard />
                    </ProtectedRoute>
                }
            />

            {/* The main application is a protected route wrapped by our new gatekeeper */}
            <Route
                path="/app/*"
                element={
                    <ProtectedRoute>
                        <AccountSetupGate>
                            <AppLayout />
                        </AccountSetupGate>
                    </ProtectedRoute>
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