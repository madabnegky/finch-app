import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onSnapshot, collection, doc, writeBatch, query, where, updateDoc, deleteDoc, arrayUnion, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { GoogleAuthProvider, linkWithPopup, signInWithPopup } from 'firebase/auth';
import { parseDateString, toDateInputString } from '../utils/date';
import { auth, db, appId, signOutUser } from '../api/firebase';
import { DragDropContext } from 'react-beautiful-dnd';
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
// We are moving WhatIfModal inside this file to fix it
// import WhatIfModal from '../components/modals/WhatIfModal'; 
import { FinchLogo, IconSparkles, IconRepeat, IconPlus, IconChevronDown, IconAlertTriangle, IconX } from '../components/core/Icon';

// --- SUB-COMPONENTS DEFINED WITHIN AppLayout ---

const UserProfile = ({ user, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) { setIsOpen(false); } }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [dropdownRef]);
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 transition-colors">
                {user.photoURL ? (<img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />) : (<span className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">{user.email ? user.email.charAt(0).toUpperCase() : '?'}</span>)}
                <IconChevronDown />
            </button>
            {isOpen && (<div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-30"><div className="p-3 border-b"><p className="font-semibold truncate">{user.displayName || 'Guest'}</p><p className="text-sm text-slate-500 truncate">{user.email || 'No email provided'}</p></div><div className="p-2"><button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-red-600 rounded-md">Log Out</button></div></div>)}
        </div>
    );
};

const AuthConflictModal = ({ isOpen, onCancel, onConfirm }) => { /* ... Unchanged ... */ };
const AddAccountModal = ({ isOpen, onClose, onSave }) => { /* ... Unchanged ... */ };

// THIS IS THE CORRECTED WhatIfModal
const WhatIfModal = ({ isOpen, onClose, onSimulate, accounts }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(toDateInputString(new Date()));
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSimulate({ description, amount, date: parseDateString(date), accountId });
        // The modal will close automatically because the parent's state changes.
        // We no longer call onClose() here. This was the bug.
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold">"What If?" Scenario</h2>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><IconX /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600">See how a potential purchase could impact your future balance. This won't be saved as a real transaction.</p>
                        <div><label className="block text-sm font-medium text-slate-700">Purchase Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., New TV" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700">Amount</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500.00" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required/></div>
                            <div><label className="block text-sm font-medium text-slate-700">Account</label><select value={accountId} onChange={e => setAccountId(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700">Purchase Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required/></div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-b-xl flex justify-end">
                        <button type="submit" className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-purple-700">Run Simulation</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- MAIN AppLayout COMPONENT ---

const AppLayout = ({ user }) => {
    // All state and handlers are the same, but are included in full here for completeness
    const [currentUser, setCurrentUser] = useState(user);
    useEffect(() => { const unsubscribe = auth.onAuthStateChanged(user => { if (user) { setCurrentUser(user); } }); return () => unsubscribe(); }, []);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [data, setData] = useState({ accounts: [], transactions: [], loading: true });
    const [budgets, setBudgets] = useState({ loading: true, data: {} });
    const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [isAccountModalOpen, setAccountModalOpen] = useState(false);
    const [isAddAccountModalOpen, setAddAccountModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editingTransfer, setEditingTransfer] = useState(null);
    const [editingAccount, setEditingAccount] = useState(null);
    const [deletingTransaction, setDeletingTransaction] = useState(null);
    const [calendarAccountId, setCalendarAccountId] = useState('all');
    const [prefilledTransfer, setPrefilledTransfer] = useState(null);
    const [simulatedTransaction, setSimulatedTransaction] = useState(null);
    const [authConflictProvider, setAuthConflictProvider] = useState(null);
    const [orderedAccounts, setOrderedAccounts] = useState([]);
    const handleLogout = async () => { try { await signOutUser(); } catch (error) { console.error("Error signing out:", error); } };
    const handleLinkAccount = async () => { if (!auth.currentUser || !auth.currentUser.isAnonymous) return; const provider = new GoogleAuthProvider(); try { auth.tenantId = null; const result = await linkWithPopup(auth.currentUser, provider); setCurrentUser(result.user); } catch (error) { if (error.code === 'auth/credential-already-in-use') { setAuthConflictProvider(provider); } else { console.error("Error linking with popup:", error); } } };
    const handleConflictSignIn = async () => { if (!authConflictProvider) return; try { await signOutUser(); await signInWithPopup(auth, authConflictProvider); setAuthConflictProvider(null); } catch (signInError) { console.error("Error during sign-in to existing account:", signInError); setAuthConflictProvider(null); } };
    const handleOpenAddModal = () => { setTransactionModalOpen(true); };
    const handleOpenAddAccountModal = () => { setAddAccountModalOpen(true); };
    const handleOpenTransferModal = (initialData = null) => { setPrefilledTransfer(initialData); setTransferModalOpen(true); };
    const handleOpenEditModal = (transaction) => { if (transaction.type === 'transfer') { const transferPair = data.transactions.filter(t => t.transferId === transaction.transferId); setEditingTransfer(transferPair); setTransferModalOpen(true); } else { setEditingTransaction(transaction); setTransactionModalOpen(true); } };
    const handleOpenEditAccountModal = (account) => { setEditingAccount(account); setAccountModalOpen(true); };
    const handleOpenDeleteModal = (transaction) => { setDeletingTransaction(transaction); };
    const handleCloseModal = () => { setTransactionModalOpen(false); setEditingTransaction(null); setTransferModalOpen(false); setEditingTransfer(null); setPrefilledTransfer(null); setAccountModalOpen(false); setEditingAccount(null); };
    const handleRunSimulation = (simTransaction) => { setSimulatedTransaction({ ...simTransaction, amount: -Math.abs(parseFloat(simTransaction.amount)), type: 'expense', isRecurring: false, id: `sim-${Date.now()}` }); };
    const handleClearSimulation = () => { setSimulatedTransaction(null); };
    const handleSaveNewAccount = async (accountData) => { if (!accountData.name) { return; } try { const accountsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/accounts`); await addDoc(accountsRef, { ...accountData, createdAt: serverTimestamp(), }); setAddAccountModalOpen(false); } catch (error) { console.error("Error adding new account: ", error); } };
    const handleSaveTransfer = async (transfer) => { const { fromAccountId, toAccountId, amount, date, description, transferId } = transfer; const transferAmount = parseFloat(amount); if (!fromAccountId || !toAccountId || !transferAmount || !date) { console.error("Missing transfer details"); return; } const batch = writeBatch(db); const transactionsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`); if (transferId) { const q = query(transactionsRef, where("transferId", "==", transferId)); const querySnapshot = await getDocs(q); querySnapshot.forEach((doc) => { const docData = doc.data(); if (docData.amount < 0) { batch.update(doc.ref, { accountId: fromAccountId, amount: -transferAmount, date: parseDateString(date), description: `Transfer to ${data.accounts.find(a => a.id === toAccountId)?.name}`, notes: description, }); } else { batch.update(doc.ref, { accountId: toAccountId, amount: transferAmount, date: parseDateString(date), description: `Transfer from ${data.accounts.find(a => a.id === fromAccountId)?.name}`, notes: description, }); } }); } else { const newTransferId = crypto.randomUUID(); const withdrawalRef = doc(transactionsRef); batch.set(withdrawalRef, { accountId: fromAccountId, amount: -transferAmount, date: parseDateString(date), description: `Transfer to ${data.accounts.find(a => a.id === toAccountId)?.name}`, notes: description, type: 'transfer', isRecurring: false, transferId: newTransferId, createdAt: serverTimestamp(), }); const depositRef = doc(transactionsRef); batch.set(depositRef, { accountId: toAccountId, amount: transferAmount, date: parseDateString(date), description: `Transfer from ${data.accounts.find(a => a.id === fromAccountId)?.name}`, notes: description, type: 'transfer', isRecurring: false, transferId: newTransferId, createdAt: serverTimestamp(), }); } try { await batch.commit(); handleCloseModal(); } catch (error) { console.error("Error saving transfer:", error); } };
    const handleSaveAccount = async (account) => { const { id, ...accountData } = account; const accountRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/accounts`, id); try { await updateDoc(accountRef, accountData); handleCloseModal(); } catch (error) { console.error("Error updating account:", error); } };
    const handleDeleteConfirm = async () => { if (!deletingTransaction) return; try { if (deletingTransaction.type === 'transfer') { const batch = writeBatch(db); const q = query(collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`), where("transferId", "==", deletingTransaction.transferId)); const querySnapshot = await getDocs(q); querySnapshot.forEach((doc) => { batch.delete(doc.ref); }); await batch.commit(); } else if (deletingTransaction.isInstance) { const parentRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`, deletingTransaction.parentId); await updateDoc(parentRef, { 'recurringDetails.excludedDates': arrayUnion(deletingTransaction.date) }); } else { const transactionRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`, deletingTransaction.id); await deleteDoc(transactionRef); } setDeletingTransaction(null); } catch (error) { console.error("Error deleting transaction: ", error); } };
    const handleOnDragEnd = (result) => { if (!result.destination) return; const items = Array.from(orderedAccounts); const [reorderedItem] = items.splice(result.source.index, 1); items.splice(result.destination.index, 0, reorderedItem); setOrderedAccounts(items); };
    useEffect(() => { if (!currentUser) return; setData(d => ({ ...d, loading: true })); const accountsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/accounts`); const transactionsRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/transactions`); const now = new Date(); const budgetId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`; const budgetRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/budgets`, budgetId); const unsubAccounts = onSnapshot(accountsRef, (snapshot) => { const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); setData(prevData => ({ ...prevData, accounts: accountsData, loading: false })); }); const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => { const transactionsData = snapshot.docs.map(doc => { const docData = doc.data(); const recurringDetails = docData.recurringDetails ? { ...docData.recurringDetails, nextDate: docData.recurringDetails.nextDate?.toDate(), endDate: docData.recurringDetails.endDate?.toDate(), excludedDates: docData.recurringDetails.excludedDates?.map(ts => ts.toDate()) || [], } : null; return { id: doc.id, ...docData, date: docData.date?.toDate(), createdAt: docData.createdAt?.toDate(), recurringDetails, }; }); setData(prevData => ({ ...prevData, transactions: transactionsData, loading: false })); }); const unsubBudgets = onSnapshot(budgetRef, (doc) => { if (doc.exists()) { setBudgets({ loading: false, data: doc.data() }); } else { setBudgets({ loading: false, data: {} }); } }); return () => { unsubAccounts(); unsubTransactions(); unsubBudgets(); }; }, [currentUser]);
    const transactionsWithSimulation = useMemo(() => { if (simulatedTransaction) { return [...data.transactions, simulatedTransaction]; } return data.transactions; }, [data.transactions, simulatedTransaction]);
    const projections = useProjectedBalances(data.accounts, transactionsWithSimulation);
    const calendarProjections = useProjectedBalances(data.accounts, transactionsWithSimulation, calendarAccountId);
    const accountSummaries = useMemo(() => { if (data.loading || !projections || projections.length === 0) return []; const endOfTodayBalances = projections[0]?.balances || {}; return data.accounts.map(account => { const currentBalance = endOfTodayBalances[account.id] ?? account.startingBalance; const roundedCushion = Math.round((account.cushion || 0) * 100) / 100; const sixtyDayProjection = projections.slice(0, 61); const lowestBalanceIn60Days = Math.min(...sixtyDayProjection.map(p => p.balances[account.id] ?? Infinity)); const availableToSpend = lowestBalanceIn60Days - roundedCushion; const roundedCurrentBalance = Math.round(currentBalance * 100) / 100; let warning = null; if (lowestBalanceIn60Days < 0) { warning = { type: 'error', message: "Your balance is projected to go negative in the next 60 days." }; } else if (lowestBalanceIn60Days < roundedCushion) { warning = { type: 'warning', message: "Heads up: Your balance may dip into your cushion soon." }; } return { ...account, cushion: roundedCushion, currentBalance: roundedCurrentBalance, availableToSpend: Math.round(availableToSpend * 100) / 100, warning }; }); }, [data.accounts, data.loading, projections]);
    useEffect(() => { setOrderedAccounts(accountSummaries); }, [accountSummaries]);
    const pageTitles = { dashboard: 'Dashboard', calendar: 'Calendar', transactions: 'Transactions', budgets: 'Budgets', reports: 'Reports' };
    const renderPage = () => { if (!currentUser || data.loading || budgets.loading) { return <div className="flex justify-center items-center h-96"><p>Loading data...</p></div>; } switch (currentPage) { case 'dashboard': return <DashboardPage orderedAccounts={orderedAccounts} onOpenEditAccount={handleOpenEditAccountModal} onOpenAddAccount={handleOpenAddAccountModal} />; case 'calendar': return <CalendarPage projections={calendarProjections} accounts={data.accounts} selectedAccountId={calendarAccountId} setSelectedAccountId={setCalendarAccountId} />; case 'transactions': return <TransactionsPage transactions={data.transactions} accounts={data.accounts} onEdit={handleOpenEditModal} onDelete={handleOpenDeleteModal} />; case 'budgets': return <BudgetPage transactions={data.transactions} budgets={budgets.data} userId={currentUser.uid} />; case 'reports': return <ReportsPage transactions={data.transactions} />; default: return <DashboardPage orderedAccounts={orderedAccounts} onOpenEditAccount={handleOpenEditAccountModal} onOpenAddAccount={handleOpenAddAccountModal}/>; } };
    const welcomeName = currentUser?.displayName || null;
    if (!currentUser) { return <div className="flex justify-center items-center h-screen"><p>Loading user...</p></div>; }
    
    return (
        <>
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {currentUser.isAnonymous && (<SaveProgressBanner onSave={handleLinkAccount} />)}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div className="flex items-center gap-4">
                        <FinchLogo className="w-14 h-14" />
                        <div>
                            <h1 className="text-4xl font-bold text-slate-800">{pageTitles[currentPage]}</h1>
                            <p className="text-slate-500">{welcomeName ? `Welcome back, ${welcomeName}!` : 'Your financial overview.'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <button onClick={() => setSimulatedTransaction('new')} className="bg-white text-slate-700 font-bold py-3 px-5 rounded-lg shadow-sm border border-slate-300 hover:bg-slate-50 flex items-center gap-2 transition-all"><IconSparkles /> What If?</button>
                        <button onClick={() => handleOpenTransferModal()} className="bg-white text-slate-700 font-bold py-3 px-5 rounded-lg shadow-sm border border-slate-300 hover:bg-slate-50 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={data.accounts.length < 2}><IconRepeat /> Transfer</button>
                        <button onClick={handleOpenAddModal} className="bg-indigo-600 text-white font-bold py-3 px-5 rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2 transition-all transform hover:scale-105"><IconPlus /> Add Transaction</button>
                        <div className="h-8 w-px bg-slate-200 mx-2"></div>
                        <UserProfile user={currentUser} onLogout={handleLogout} />
                    </div>
                </header>
                {simulatedTransaction && typeof simulatedTransaction === 'object' && (<SimulationBanner transaction={simulatedTransaction} onClear={handleClearSimulation} />)}
                <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
                <DragDropContext onDragEnd={handleOnDragEnd}>
                    <main className="mt-6">
                        {renderPage()}
                    </main>
                </DragDropContext>
            </div>
            {isTransactionModalOpen && (<TransactionModal isOpen={isTransactionModalOpen} onClose={handleCloseModal} accounts={data.accounts} userId={currentUser.uid} transactionToEdit={editingTransaction} />)}
            {isTransferModalOpen && (<TransferModal isOpen={isTransferModalOpen} onClose={handleCloseModal} accounts={data.accounts} onSave={handleSaveTransfer} transferToEdit={editingTransfer} initialData={prefilledTransfer} />)}
            {isAccountModalOpen && (<EditAccountModal isOpen={isAccountModalOpen} onClose={handleCloseModal} account={editingAccount} onSave={handleSaveAccount} />)}
            {deletingTransaction && (<ConfirmDeleteModal isOpen={!!deletingTransaction} onClose={() => setDeletingTransaction(null)} onConfirm={handleDeleteConfirm} transaction={deletingTransaction} />)}
            {simulatedTransaction === 'new' && (<WhatIfModal isOpen={simulatedTransaction === 'new'} onClose={() => setSimulatedTransaction(null)} onSimulate={handleRunSimulation} accounts={data.accounts} />)}
            <AuthConflictModal isOpen={!!authConflictProvider} onCancel={() => setAuthConflictProvider(null)} onConfirm={handleConflictSignIn}/>
            <AddAccountModal isOpen={isAddAccountModalOpen} onClose={() => setAddAccountModalOpen(false)} onSave={handleSaveNewAccount} />
        </>
    );
};

export default AppLayout;