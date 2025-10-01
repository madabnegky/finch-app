import React from 'react';
import { 
    IconLayoutDashboard, 
    IconCalendarDays, 
    IconListTree, 
    IconTarget, 
    IconBarChart 
} from './Icon';

const Navigation = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: IconCalendarDays },
    { id: 'transactions', label: 'Transactions', icon: IconListTree },
    { id: 'budgets', label: 'Budgets', icon: IconTarget },
    { id: 'reports', label: 'Reports', icon: IconBarChart },
  ];

  return (
    // Updated container styles for a cleaner, more integrated look
    <nav className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-finch-gray-200 p-1">
      <ul className="flex justify-around items-center">
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => setCurrentPage(item.id)}
                // NEW STYLES: This logic creates the "pill" effect
                className={`w-full flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'bg-finch-teal-50 text-finch-teal-700 font-bold' 
                    : 'text-finch-gray-500 hover:bg-finch-gray-100 hover:text-finch-gray-800'
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  );
};

export default Navigation;