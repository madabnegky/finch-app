import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navigation from '../components/core/Navigation';
import { useAuth } from '@shared/hooks/useAuth';
import LoadingScreen from '../components/core/LoadingScreen';
import { LogOut, Bell, Settings } from 'lucide-react';
import Icon from '../components/core/Icon';

const AppLayout = () => {
  // FIX: Correctly destructure 'signOut' from useAuth. The original code used
  // 'logout', which does not exist in the hook's context.
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Navigation />
      <div className="flex flex-col flex-1">
        <header className="flex items-center justify-between p-4 bg-white border-b">
          <div>
            <h1 className="text-xl font-bold">
              <Icon name="finch-logo" className="w-8 h-8 mr-2" />
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
              <Bell size={20} />
            </button>
            <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
              <Settings size={20} />
            </button>
            <button
              onClick={signOut} // FIX: Ensure the button calls the correct function.
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;