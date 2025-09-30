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
    <nav className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm sticky top-4 z-20 border border-slate-200">
      <ul className="flex justify-around items-center p-1">
        {navItems.map(item => {
          const isActive = currentPage === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex flex-col sm:flex-row items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors duration-200 relative ${
                  isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
                {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-indigo-600 rounded-full"></span>}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  );
};

export default Navigation;