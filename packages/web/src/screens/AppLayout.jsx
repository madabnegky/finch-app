import React from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import LoadingScreen from '../components/core/LoadingScreen';
import { LogOut, Bell, Settings } from 'lucide-react';
import Icon from '../components/core/Icon';

const AppLayout = () => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
      isActive
        ? 'bg-gray-200 text-gray-900'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    // FIX: Changed to a vertical flex layout
    <div className="flex flex-col h-screen bg-gray-100">
      {/* FIX: This is now a horizontal header */}
      <header className="flex items-center justify-between p-2 bg-white border-b space-x-4">
        <div className="flex items-center space-x-4">
          <Icon name="FinchLogo" className="w-8 h-8 ml-2" />
          {/* FIX: Navigation links moved here */}
          <nav className="flex items-center space-x-2">
            <NavLink to="dashboard" className={navLinkClass}>
              <Icon name="Home" className="w-5 h-5 mr-2" /> Dashboard
            </NavLink>
            <NavLink to="transactions" className={navLinkClass}>
              <Icon name="Repeat" className="w-5 h-5 mr-2" /> Transactions
            </NavLink>
            <NavLink to="budget" className={navLinkClass}>
              <Icon name="ShoppingCart" className="w-5 h-5 mr-2" /> Budget
            </NavLink>
             <NavLink to="reports" className={navLinkClass}>
              <Icon name="ChartBar" className="w-5 h-5 mr-2" /> Reports
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center space-x-4 mr-2">
          <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
            <Bell size={20} />
          </button>
          <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
            <Settings size={20} />
          </button>
          <button
            onClick={signOut}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </header>
      
      {/* The main content area now renders below the header */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;