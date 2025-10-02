import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon'; // Change this line back to a default import

const Navigation = () => {
  return (
    <nav className="flex-1 px-2 space-y-1">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }
      >
        <Icon name="home" className="mr-3" />
        Dashboard
      </NavLink>
      <NavLink
        to="/transactions"
        className={({ isActive }) =>
          `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }
      >
        <Icon name="switch-horizontal" className="mr-3" />
        Transactions
      </NavLink>
      <NavLink
        to="/budget"
        className={({ isActive }) =>
          `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }
      >
        <Icon name="chart-pie" className="mr-3" />
        Budget
      </NavLink>
      <NavLink
        to="/reports"
        className={({ isActive }) =>
          `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }
      >
        <Icon name="chart-bar" className="mr-3" />
        Reports
      </NavLink>
      <NavLink
        to="/calendar"
        className={({ isActive }) =>
          `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }
      >
        <Icon name="calendar" className="mr-3" />
        Calendar
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center px-4 py-2 text-sm font-medium rounded-md ${
            isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`
        }
      >
        <Icon name="cog" className="mr-3" />
        Settings
      </NavLink>
    </nav>
  );
};

export default Navigation;