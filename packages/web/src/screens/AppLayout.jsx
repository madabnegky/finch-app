import React, { useState, useMemo } from 'react';
import { Outlet, NavLink, useOutletContext } from 'react-router-dom';
import { useAuth } from '@shared/hooks/useAuth';
import LoadingScreen from '../components/core/LoadingScreen';
import { LogOut, Bell, Settings, Plus, HelpCircle } from 'lucide-react';
import Icon from '../components/core/Icon';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import api from '@shared/api/firebase';
import useProjectedBalancesFromCloud from '@shared/hooks/useProjectedBalancesFromCloud';
import Button from '../components/core/Button';
import TransactionModal from '../components/modals/TransactionModal';
import WhatIfModal from '../components/modals/WhatIfModal';
import SimulationBanner from '../components/banners/SimulationBanner';
import SaveProgressBanner from '../components/banners/SaveProgressBanner';
import UpgradeAccountModal from '../components/modals/UpgradeAccountModal';
import ErrorBanner from '../components/banners/ErrorBanner';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import AddAccountModal from '../components/modals/AddAccountModal';
import EditAccountModal from '../components/modals/EditAccountModal';
import EditRecurringModal from '../components/modals/EditRecurringModal';
import { parseDateString, toDateInputString, addDays } from '@shared/utils/date';

const AppLayout = () => {
    const { user, loading: authLoading, signOut } = useAuth();

    // Modal States
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [isEditRecurringModalOpen, setIsEditRecurringModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editMode, setEditMode] = useState(null);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [accountToEdit, setAccountToEdit] = useState(null);

    // Simulation State
    const [whatIfTransaction, setWhatIfTransaction] = useState(null);

    // Data Fetching Hooks
    const { projections, loading: projectionsLoading, error: projectionsError, refetch: refetchProjections } = useProjectedBalancesFromCloud(365);
    const [accountsSnapshot, accountsLoading, accountsError] = useCollection(user ? collection(api.firestore, `users/${user.uid}/accounts`) : null);
    const [transactionsSnapshot, transactionsLoading, transactionsError] = useCollection(user ? collection(api.firestore, `users/${user.uid}/transactions`) : null);
    const [goalsSnapshot, goalsLoading, goalsError] = useCollection(user ? collection(api.firestore, `users/${user.uid}/goals`) : null);

    const criticalError = projectionsError || accountsError || transactionsError || goalsError;
    
    const accounts = useMemo(() => accountsSnapshot ? accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [], [accountsSnapshot]);
    const goals = useMemo(() => goalsSnapshot ? goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [], [goalsSnapshot]);
    const rawTransactions = useMemo(() => transactionsSnapshot ? transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [], [transactionsSnapshot]);
    const allTransactions = useMemo(() => {
        if (whatIfTransaction) {
            return [...rawTransactions, whatIfTransaction];
        }
        return rawTransactions;
    }, [rawTransactions, whatIfTransaction]);
    const transactionInstances = useMemo(() => {
        if (projectionsLoading || !projections) return allTransactions;
        const instancesFromCloud = projections.flatMap(accountProj =>
            accountProj.projections.flatMap(dayProj =>
                dayProj.transactions.map(t => ({ ...t, date: new Date(t.date) }))
            )
        );
        const oneTimeTransactions = allTransactions.filter(t => !t.isRecurring);
        const combined = [...instancesFromCloud, ...oneTimeTransactions];
        const unique = Array.from(new Map(combined.map(item => [item.instanceId || item.id, item])).values());
        return unique.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [projections, projectionsLoading, allTransactions]);
    const accountsWithBalances = useMemo(() => {
        if (!accounts || accounts.length === 0 || projectionsLoading) return accounts.map(acc => ({ ...acc, currentBalance: acc.startingBalance, availableToSpend: acc.startingBalance - (acc.cushion || 0) }));
        const allocationsByAccount = goals.reduce((acc, goal) => {
            const { fundingAccountId, allocatedAmount } = goal;
            if (fundingAccountId) {
                if (!acc[fundingAccountId]) acc[fundingAccountId] = 0;
                acc[fundingAccountId] += allocatedAmount || 0;
            }
            return acc;
        }, {});
        return accounts.map(acc => {
            const accountProjection = projections.find(p => p.accountId === acc.id);
            const lowestBalance = accountProjection ? Math.min(...accountProjection.projections.map(p => p.balance)) : acc.startingBalance;
            const allocationsForThisAccount = allocationsByAccount[acc.id] || 0;
            const availableToSpend = lowestBalance - (acc.cushion || 0) - allocationsForThisAccount;
            return {
                ...acc,
                currentBalance: accountProjection?.projections[0]?.balance || acc.startingBalance,
                availableToSpend,
            };
        });
    }, [accounts, projections, goals, projectionsLoading]);

    // --- START MODIFIED LOGIC FOR THE FIX ---
    const handleAddOrEditTransaction = async (data) => {
        if (!user) return;
        try {
            const isEditing = !!editingTransaction;
            
            // This is a simplified, direct update for a master recurring transaction
            if (isEditing && editingTransaction.isRecurring && !editingTransaction.isInstance) {
                const { isRecurring, frequency, ...transactionData } = data;
                const updatedSeries = {
                    ...transactionData,
                    amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
                    isRecurring: true,
                    recurringDetails: {
                        ...editingTransaction.recurringDetails, // Preserve existing details like excludedDates
                        frequency: frequency,
                        nextDate: parseDateString(data.date),
                    }
                };
                await updateDoc(doc(api.firestore, `users/${user.uid}/transactions`, editingTransaction.id), updatedSeries);
            
            // This handles creating a new one-time transaction when editing a single instance
            } else if (isEditing && editingTransaction.isInstance) {
                const batch = writeBatch(api.firestore);
                const { id, isInstance, instanceId, ...newInstanceData } = {
                    ...data,
                    amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
                    isRecurring: false,
                    recurringDetails: null,
                    createdAt: serverTimestamp()
                };
                batch.set(doc(collection(api.firestore, `users/${user.uid}/transactions`)), newInstanceData);

                const originalSeriesRef = doc(api.firestore, `users/${user.uid}/transactions`, editingTransaction.id);
                batch.update(originalSeriesRef, {
                    'recurringDetails.excludedDates': arrayUnion(toDateInputString(editingTransaction.date))
                });
                await batch.commit();

            // This is the standard logic for creating new transactions or editing one-time transactions
            } else {
                const { isRecurring, frequency, ...transactionData } = data;
                const newTransaction = {
                  ...transactionData,
                  date: parseDateString(data.date),
                  amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
                  isRecurring: !!isRecurring,
                };
                if (isRecurring) {
                  newTransaction.recurringDetails = { frequency, nextDate: parseDateString(data.date) };
                }
                
                if (isEditing) { // Editing a one-time transaction
                    await updateDoc(doc(api.firestore, `users/${user.uid}/transactions`, editingTransaction.id), newTransaction);
                } else { // Creating a new transaction (recurring or one-time)
                    await addDoc(collection(api.firestore, `users/${user.uid}/transactions`), { ...newTransaction, createdAt: serverTimestamp() });
                }
            }

            // Reset states and refetch data
            setIsTransactionModalOpen(false);
            setEditingTransaction(null);
            refetchProjections();
        } catch (error) {
            console.error("Error saving transaction:", error);
            alert(`Failed to save transaction: ${error.message}`);
        }
    };
    
    // This handler now becomes much simpler
    const handleOpenEditTransaction = (transaction) => {
        setEditingTransaction(transaction);
        setIsTransactionModalOpen(true);
    };
    // --- END MODIFIED LOGIC FOR THE FIX ---

    const handleConfirmDelete = async () => {
        if (!transactionToDelete || !user) return;
        try {
            // Deleting an instance just excludes it
            if (transactionToDelete.isInstance) {
                await updateDoc(doc(api.firestore, `users/${user.uid}/transactions`, transactionToDelete.id), {
                    'recurringDetails.excludedDates': arrayUnion(toDateInputString(transactionToDelete.date))
                });
            // Deleting a master deletes the whole series
            } else {
                await deleteDoc(doc(api.firestore, `users/${user.uid}/transactions`, transactionToDelete.id));
            }
            setTransactionToDelete(null);
            refetchProjections();
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert(`Failed to delete transaction: ${error.message}`);
        }
    };

    // Other handlers (save account, update account, simulate) are unchanged
    const handleSaveAccount = async (accountData) => {
        if (!user) return;
        try {
            await addDoc(collection(api.firestore, `users/${user.uid}/accounts`), accountData);
            setIsAddAccountModalOpen(false);
            refetchProjections();
        } catch (error) {
            console.error("Error adding account:", error);
            alert(`Failed to add account: ${error.message}`);
        }
    };
    const handleUpdateAccount = async (accountData) => {
        if (!user || !accountToEdit) return;
        try {
            const { id, ...data } = accountData;
            await updateDoc(doc(api.firestore, `users/${user.uid}/accounts`, id), data);
            setAccountToEdit(null);
            refetchProjections();
        } catch (error) {
            console.error("Error updating account:", error);
            alert(`Failed to update account: ${error.message}`);
        }
    };
    const handleOpenEditAccount = (account) => setAccountToEdit(account);
    const handleOpenDeleteModal = (transaction) => setTransactionToDelete(transaction);
    const handleSimulate = (data) => {
        const simulationTransaction = { ...data, amount: -Math.abs(data.amount), id: `whatif-${Date.now()}`, isRecurring: false, type: 'expense' };
        setWhatIfTransaction(simulationTransaction);
        setIsWhatIfModalOpen(false);
    };


    if (authLoading || accountsLoading || transactionsLoading || goalsLoading) {
        return <LoadingScreen />;
    }

    const navLinkClass = ({ isActive }) => `flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <header className="flex items-center justify-between p-2 bg-white border-b space-x-4">
                 <div className="flex items-center space-x-4">
                    <Icon name="FinchLogo" className="w-8 h-8 ml-2" />
                    <nav className="flex items-center space-x-2">
                        <NavLink to="dashboard" className={navLinkClass}><Icon name="Home" className="w-5 h-5 mr-2" /> Dashboard</NavLink>
                        <NavLink to="calendar" className={navLinkClass}><Icon name="CalendarDays" className="w-5 h-5 mr-2" /> Calendar</NavLink>
                        <NavLink to="transactions" className={navLinkClass}><Icon name="Repeat" className="w-5 h-5 mr-2" /> Transactions</NavLink>
                        <NavLink to="reports" className={navLinkClass}><Icon name="ChartBar" className="w-5 h-5 mr-2" /> Reports</NavLink>
                    </nav>
                </div>
                <div className="flex items-center space-x-2 mr-2">
                    <Button onClick={() => setIsWhatIfModalOpen(true)} className="flex items-center gap-2 bg-purple-500 text-white hover:bg-purple-600"><HelpCircle size={16} /> "What If?"</Button>
                    <Button onClick={() => setIsTransactionModalOpen(true)} className="flex items-center gap-2"><Plus size={16} /> Add Transaction</Button>
                    <div className="h-6 border-l border-gray-300 mx-2"></div>
                    <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100"><Bell size={20} /></button>
                    <NavLink to="settings" className="p-2 text-gray-500 rounded-full hover:bg-gray-100"><Settings size={20} /></NavLink>
                    <button onClick={signOut} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"><LogOut className="w-4 h-4 mr-2" />Logout</button>
                </div>
            </header>
            <main className="flex-1 p-6 overflow-y-auto">
                {user && user.isAnonymous && <SaveProgressBanner onSave={() => setIsUpgradeModalOpen(true)} />}
                {whatIfTransaction && <SimulationBanner transaction={whatIfTransaction} onClear={() => setWhatIfTransaction(null)} />}
                <ErrorBanner error={criticalError} />
                <Outlet context={{
                    accounts: accountsWithBalances,
                    rawAccounts: accounts,
                    transactions: transactionInstances,
                    rawTransactions: allTransactions,
                    projections,
                    goals,
                    onEditTransaction: handleOpenEditTransaction,
                    onDeleteTransaction: handleOpenDeleteModal,
                    onOpenAddAccount: () => setIsAddAccountModalOpen(true),
                    onOpenEditAccount: handleOpenEditAccount,
                }} />
            </main>

            {/* We no longer need the EditRecurringModal */}
            <TransactionModal isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }} onSubmit={handleAddOrEditTransaction} accounts={accounts} transaction={editingTransaction} />
            {isWhatIfModalOpen && <WhatIfModal isOpen={isWhatIfModalOpen} onClose={() => setIsWhatIfModalOpen(false)} onSimulate={handleSimulate} accounts={accounts} />}
            {isUpgradeModalOpen && <UpgradeAccountModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />}
            {transactionToDelete && <ConfirmDeleteModal isOpen={!!transactionToDelete} onClose={() => setTransactionToDelete(null)} onConfirm={handleConfirmDelete} transaction={transactionToDelete} />}
            {isAddAccountModalOpen && <AddAccountModal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} onSave={handleSaveAccount} />}
            {accountToEdit && <EditAccountModal isOpen={!!accountToEdit} onClose={() => setAccountToEdit(null)} onSave={handleUpdateAccount} account={accountToEdit} />}
        </div>
    );
};

export function useAppData() {
    return useOutletContext();
}

export default AppLayout;