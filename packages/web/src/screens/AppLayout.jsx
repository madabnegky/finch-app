import React from 'react';
import { Outlet, NavLink, useLocation, Navigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import LoadingScreen from '../components/core/LoadingScreen';
import { LogOut, Bell, Settings } from 'lucide-react';
import Icon from '../components/core/Icon';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import api from '@shared/api/firebase';
import useProjectedBalances from '@shared/hooks/useProjectedBalances'; // Import the hook for calculations

const AppLayout = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();

  const [accountsSnapshot, accountsLoading, accountsError] = useCollection(
    user ? collection(api.firestore, `users/${user.uid}/accounts`) : null
  );

  const [transactionsSnapshot, transactionsLoading, transactionsError] = useCollection(
    user ? collection(api.firestore, `users/${user.uid}/transactions`) : null
  );

  // --- THIS IS THE FIX ---
  // 1. Convert Firestore snapshots into clean data arrays.
  const accounts = React.useMemo(() => accountsSnapshot ? accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [], [accountsSnapshot]);
  const transactions = React.useMemo(() => transactionsSnapshot ? transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [], [transactionsSnapshot]);

  // 2. Use the projected balances hook to do all the heavy lifting and calculations.
  const projections = useProjectedBalances(accounts, transactions);

  // 3. Create an enriched `accounts` array that includes calculated balances.
  const accountsWithBalances = React.useMemo(() => {
    if (!accounts || !projections || projections.length === 0) return accounts;

    return accounts.map(acc => {
      const accountProjection = projections.find(p => p.accountId === acc.id);
      return {
        ...acc,
        // The first projection entry is today's starting balance.
        currentBalance: accountProjection?.projections[0]?.balance || acc.startingBalance,
        // Find the lowest point in the future projection for "available to spend".
        availableToSpend: accountProjection ? Math.min(...accountProjection.projections.map(p => p.balance)) : acc.startingBalance,
      };
    });
  }, [accounts, projections]);


  if (authLoading || accountsLoading || transactionsLoading) {
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
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="flex items-center justify-between p-2 bg-white border-b space-x-4">
        <div className="flex items-center space-x-4">
          <Icon name="FinchLogo" className="w-8 h-8 ml-2" />
          <nav className="flex items-center space-x-2">
            <NavLink to="dashboard" className={navLinkClass}>
              <Icon name="Home" className="w-5 h-5 mr-2" /> Dashboard
            </NavLink>
             <NavLink to="calendar" className={navLinkClass}>
              <Icon name="CalendarDays" className="w-5 h-5 mr-2" /> Calendar
            </NavLink>
            <NavLink to="transactions" className={navLinkClass}>
              <Icon name="Repeat" className="w-5 h-5 mr-2" /> Transactions
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
      
      <main className="flex-1 p-6 overflow-y-auto">
        {/* 4. Pass all the clean, calculated data down to child components. */}
        <Outlet context={{ 
          accounts: accountsWithBalances, // Pass the enriched accounts
          transactions, // Pass the raw transactions
          projections, // Pass the calculated projections
          accountsError,
          transactionsError,
        }} />
      </main>
    </div>
  );
};

export function useAppData() {
  return useOutletContext();
}

export default AppLayout;

