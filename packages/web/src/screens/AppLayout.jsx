import React, { useState } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
// FIX: Import the useAuth hook to get user, loading, and logout function
import { useAuth } from '@shared/hooks/useAuth';
import Navigation from '../components/core/Navigation';
import LoadingScreen from '../components/core/LoadingScreen';
import AccountSetupGate from '../components/core/AccountSetupGate';
import { LogOut, Settings, User, BrainCircuit } from 'lucide-react';
import WhatIfModal from '../components/modals/WhatIfModal';
import Button from '../components/core/Button';

// Your original Header component is preserved in its entirety.
const Header = ({ user, onSignOut, onWhatIfClick }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
         {/* This is a placeholder title */}
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <Button onClick={onWhatIfClick} variant="outline" size="sm">
            <BrainCircuit className="w-4 h-4 mr-2"/>
            What If?
        </Button>
      </div>
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 focus:outline-none"
        >
          <span className="text-gray-600 hidden sm:inline">{user.email || 'Guest User'}</span>
          <User className="w-6 h-6 text-gray-600 rounded-full" />
        </button>
        {dropdownOpen && (
          <div 
            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <Link
              to="/settings"
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setDropdownOpen(false)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
            <button
              onClick={() => {
                onSignOut();
                setDropdownOpen(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

// Your original AppLayout component is preserved.
const AppLayout = () => {
  // FIX: Destructure 'logout' from useAuth() to use for signing out.
  const { user, loading, logout } = useAuth();
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <AccountSetupGate>
      <div className="flex h-screen bg-gray-100 font-sans">
        <Navigation />
        <div className="flex flex-col flex-1">
           {/* The Header now receives the correct 'logout' function. */}
          <Header user={user} onSignOut={logout} onWhatIfClick={() => setIsWhatIfModalOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <WhatIfModal 
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
      />
    </AccountSetupGate>
  );
};

export default AppLayout;