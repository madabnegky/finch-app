import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onSnapshot, collection, doc, writeBatch, query, where, updateDoc, deleteDoc, arrayUnion, serverTimestamp, getDocs } from 'firebase/firestore';
import { GoogleAuthProvider, linkWithRedirect } from 'firebase/auth';
import { parseDateString, toDateInputString } from '../utils/date';
import { auth, db, appId, signOutUser } from '../api/firebase';
import useProjectedBalances from '../hooks/useProjectedBalances';
import DashboardPage from './DashboardPage';
import CalendarPage from './CalendarPage';
import TransactionsPage from './TransactionsPage';
import BudgetPage from './BudgetPage';
import ReportsPage from './ReportsPage';
import Navigation from '../components/core/Navigation';
import SaveProgressBanner from '../components/banners/SaveProgressBanner';
import SimulationBanner from '../components/banners/SimulationBanner';
import TransactionModal from '../components/modals/TransactionModal';
import TransferModal from '../components/modals/TransferModal';
import EditAccountModal from '../components/modals/EditAccountModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import WhatIfModal from '../components/modals/WhatIfModal';
import { FinchLogo, IconSparkles, IconRepeat, IconPlus, IconChevronDown } from '../components/core/Icon';

const UserProfile = ({ user, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 transition-colors">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                ) : (
                    <span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
                        {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                    </span>
                )}
                 <IconChevronDown />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-30">
                    <div className="p-3 border-b">
                        <p className="font-semibold truncate">{user.displayName || 'Guest'}</p>
                        <p className="text-sm text-slate-500 truncate">{user.email || 'No email provided'}</p>
                    </div>
                    <div className="p-2">
                        <button
                            onClick={onLogout}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-red-600 rounded-md"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const AppLayout = ({ user }) => {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [data, setData] = useState({ accounts: [], transactions: [], loading: true });
    const [budgets, setBudgets] = useState({ loading: true, data: {} });
    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [isAccountModalOpen, setAccountModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editingTransfer, setEditingTransfer] = useState(null);
    const [editingAccount, setEditingAccount] = useState(null);
    const [deletingTransaction, setDeletingTransaction] = useState(null);
    const [calendarAccountId, setCalendarAccountId] = useState('all');
    const [prefilledTransfer, setPrefilledTransfer] = useState(null);
    const [simulatedTransaction, setSimulatedTransaction] = useState(null);
    
    const handleLogout = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleOpenAddModal = () => { setTransactionModalOpen(true); };
    const handleOpenTransferModal = (initialData = null) => { setPrefilledTransfer(initialData); setTransferModalOpen(true); };
    const handleOpenEditModal = (transaction) => {
        if (transaction.type === 'transfer') {
            const transferPair = data.transactions.filter(t => t.transferId === transaction.transferId);
            setEditingTransfer(transferPair);
            setTransferModalOpen(true);
        } else {
            setEditingTransaction(transaction);
            setTransactionModalOpen(true);
        }
    };
    const handleOpenEditAccountModal = (account) => { setEditingAccount(account); setAccountModalOpen(true); };
    const handleOpenDeleteModal = (transaction) => { setDeletingTransaction(transaction); };
    const handleCloseModal = () => {
        setTransactionModalOpen(false); setEditingTransaction(null);
        setTransferModalOpen(false); setEditingTransfer(null); setPrefilledTransfer(null);
        setAccountModalOpen(false); setEditingAccount(null);
    };
    const handleRunSimulation = (simTransaction) => {
        setSimulatedTransaction({
            ...simTransaction, amount: -Math.abs(parseFloat(simTransaction.amount)),
            type: 'expense', isRecurring: false, id: `sim-${Date.now()}`
        });
    };
    const handleClearSimulation = () => { setSimulatedTransaction(null); };
    const handleLinkAccount = async () => {
        if (!auth.currentUser || !auth.currentUser.isAnonymous) return;
        const provider = new GoogleAuthProvider();
        try {
            await linkWithRedirect(auth.currentUser, provider);
        } catch (error) { console.error("Error initiating account linking redirect:", error); }
    };
    const handleSaveTransfer = async (transfer) => {
        const { fromAccountId, toAccountId, amount, date, description, transferId } = transfer;
        const transferAmount = parseFloat(amount);
        if (!fromAccountId || !toAccountId || !transferAmount || !date) { console.error("Missing transfer details"); return; }
        const batch = writeBatch(db);
        const transactionsRef = collection(db, `artifacts/${appId}/users/${user.uid}/transactions`);
        if (transferId) {
            const q = query(transactionsRef, where("transferId", "==", transferId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                if (docData.amount < 0) {
                    batch.update(doc.ref, {
                        accountId: fromAccountId, amount: -transferAmount, date: parseDateString(date),
                        description: `Transfer to ${data.accounts.find(a => a.id === toAccountId)?.name}`, notes: description,
                    });
                } else {
                    batch.update(doc.ref, {
                        accountId: toAccountId, amount: transferAmount, date: parseDateString(date),
                        description: `Transfer from ${data.accounts.find(a => a.id === fromAccountId)?.name}`, notes: description,
                    });
                }
            });
        } else {
            const newTransferId = crypto.randomUUID();
            const withdrawalRef = doc(transactionsRef);
            batch.set(withdrawalRef, {
                accountId: fromAccountId, amount: -transferAmount, date: parseDateString(date),
                description: `Transfer to ${data.accounts.find(a => a.id === toAccountId)?.name}`, notes: description,
                type: 'transfer', isRecurring: false, transferId: newTransferId, createdAt: serverTimestamp(),
            });
            const depositRef = doc(transactionsRef);
            batch.set(depositRef, {
                accountId: toAccountId, amount: transferAmount, date: parseDateString(date),
                description: `Transfer from ${data.accounts.find(a => a.id === fromAccountId)?.name}`, notes: description,
                type: 'transfer', isRecurring: false, transferId: newTransferId, createdAt: serverTimestamp(),
            });
        }
        try { await batch.commit(); handleCloseModal(); } catch (error) { console.error("Error saving transfer:", error); }
    };
    const handleSaveAccount = async (account) => {
        const { id, ...accountData } = account;
        const accountRef = doc(db, `artifacts/${appId}/users/${user.uid}/accounts`, id);
        try { await updateDoc(accountRef, accountData); handleCloseModal(); } catch (error) { console.error("Error updating account:", error); }
    };
    const handleDeleteConfirm = async () => {
        if (!deletingTransaction) return;
        try {
            if (deletingTransaction.type === 'transfer') {
                const batch = writeBatch(db);
                const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`), where("transferId", "==", deletingTransaction.transferId));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
                await batch.commit();
            } else if (deletingTransaction.isInstance) {
                const parentRef = doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, deletingTransaction.parentId);
                await updateDoc(parentRef, { 'recurringDetails.excludedDates': arrayUnion(deletingTransaction.date) });
            } else {
                const transactionRef = doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, deletingTransaction.id);
                await deleteDoc(transactionRef);
            }
            setDeletingTransaction(null);
        } catch (error) { console.error("Error deleting transaction: ", error); }
    };

    useEffect(() => {
        if (!user) return;
        setData(d => ({ ...d, loading: true }));
        const accountsRef = collection(db, `artifacts/${appId}/users/${user.uid}/accounts`);
        const transactionsRef = collection(db, `artifacts/${appId}/users/${user.uid}/transactions`);
        const now = new Date();
        const budgetId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const budgetRef = doc(db, `artifacts/${appId}/users/${user.uid}/budgets`, budgetId);
        const unsubAccounts = onSnapshot(accountsRef, (snapshot) => {
            const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(prevData => ({ ...prevData, accounts: accountsData, loading: false }));
        });
        const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => {
                const docData = doc.data();
                const recurringDetails = docData.recurringDetails ? {
                    ...docData.recurringDetails,
                    nextDate: docData.recurringDetails.nextDate?.toDate(),
                    endDate: docData.recurringDetails.endDate?.toDate(),
                    excludedDates: docData.recurringDetails.excludedDates?.map(ts => ts.toDate()) || [],
                } : null;
                return {
                    id: doc.id, ...docData,
                    date: docData.date?.toDate(), createdAt: docData.createdAt?.toDate(),
                    recurringDetails,
                };
            });
            setData(prevData => ({ ...prevData, transactions: transactionsData, loading: false }));
        });
        const unsubBudgets = onSnapshot(budgetRef, (doc) => {
            if (doc.exists()) { setBudgets({ loading: false, data: doc.data() }); }
            else { setBudgets({ loading: false, data: {} }); }
        });
        return () => { unsubAccounts(); unsubTransactions(); unsubBudgets(); };
    }, [user]);

    const transactionsWithSimulation = useMemo(() => {
        if (simulatedTransaction) { return [...data.transactions, simulatedTransaction]; }
        return data.transactions;
    }, [data.transactions, simulatedTransaction]);
    const projections = useProjectedBalances(data.accounts, transactionsWithSimulation);
    const calendarProjections = useProjectedBalances(data.accounts, transactionsWithSimulation, calendarAccountId);
    const accountSummaries = useMemo(() => {
        if (data.loading || !projections || projections.length === 0) return [];
        const endOfTodayBalances = projections[0]?.balances || {};
        return data.accounts.map(account => {
            const currentBalance = endOfTodayBalances[account.id] ?? account.startingBalance;
            const roundedCushion = Math.round((account.cushion || 0) * 100) / 100;
            const sixtyDayProjection = projections.slice(0, 61);
            const lowestBalanceIn60Days = Math.min(...sixtyDayProjection.map(p => p.balances[account.id] ?? Infinity));
            const availableToSpend = lowestBalanceIn60Days - roundedCushion;
            const roundedCurrentBalance = Math.round(currentBalance * 100) / 100;
            let warning = null;
            if (lowestBalanceIn60Days < 0) {
                warning = { type: 'error', message: "Your balance is projected to go negative in the next 60 days." };
            } else if (lowestBalanceIn60Days < roundedCushion) {
                warning = { type: 'warning', message: "Heads up: Your balance may dip into your cushion soon." };
            }
            return {
                ...account, cushion: roundedCushion,
                currentBalance: roundedCurrentBalance,
                availableToSpend: Math.round(availableToSpend * 100) / 100,
                warning
            };
        });
    }, [data.accounts, data.loading, projections]);

    const pageTitles = {
        dashboard: 'Dashboard', calendar: 'Calendar', transactions: 'Transactions',
        budgets: 'Budgets', reports: 'Reports'
    };
    const renderPage = () => {
        if (data.loading || budgets.loading) {
            return <div className="flex justify-center items-center h-96"><p>Loading data...</p></div>;
        }
        switch (currentPage) {
            case 'dashboard': return <DashboardPage accountSummaries={accountSummaries} onOpenEditAccount={handleOpenEditAccountModal} />;
            case 'calendar': return <CalendarPage projections={calendarProjections} accounts={data.accounts} selectedAccountId={calendarAccountId} setSelectedAccountId={setCalendarAccountId} />;
            case 'transactions': return <TransactionsPage transactions={data.transactions} accounts={data.accounts} onEdit={handleOpenEditModal} onDelete={handleOpenDeleteModal} />;
            case 'budgets': return <BudgetPage transactions={data.transactions} budgets={budgets.data} userId={user.uid} />;
            case 'reports': return <ReportsPage transactions={data.transactions} />;
            default: return <DashboardPage accountSummaries={accountSummaries} />;
        }
    };

    return (
        <>
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {user.isAnonymous && (
                    <SaveProgressBanner onSave={handleLinkAccount} />
                )}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div className="flex items-center gap-4">
                        <FinchLogo className="w-14 h-14" />
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800">{pageTitles[currentPage]}</h1>
                            <p className="text-slate-500">Your financial overview.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white font-bold py-3 px-5 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-all transform hover:scale-105">
                            <IconPlus /> Add Transaction
                        </button>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <UserProfile user={user} onLogout={handleLogout} />
                    </div>
                </header>
                {simulatedTransaction && (
                    <SimulationBanner transaction={simulatedTransaction} onClear={handleClearSimulation} />
                )}
                <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
                <main className="mt-6">
                    {renderPage()}
                </main>
            </div>
            {isTransactionModalOpen && (<TransactionModal isOpen={isTransactionModalOpen} onClose={handleCloseModal} accounts={data.accounts} userId={user.uid} transactionToEdit={editingTransaction} />)}
            {isTransferModalOpen && (<TransferModal isOpen={isTransferModalOpen} onClose={handleCloseModal} accounts={data.accounts} onSave={handleSaveTransfer} transferToEdit={editingTransfer} initialData={prefilledTransfer} />)}
            {isAccountModalOpen && (<EditAccountModal isOpen={isAccountModalOpen} onClose={handleCloseModal} account={editingAccount} onSave={handleSaveAccount} />)}
            {deletingTransaction && (<ConfirmDeleteModal isOpen={!!deletingTransaction} onClose={() => setDeletingTransaction(null)} onConfirm={handleDeleteConfirm} transaction={deletingTransaction} />)}
            {simulatedTransaction === 'new' && (<WhatIfModal isOpen={simulatedTransaction === 'new'} onClose={handleClearSimulation} onSimulate={handleRunSimulation} accounts={data.accounts} />)}
        </>
    );
};

export default AppLayout;