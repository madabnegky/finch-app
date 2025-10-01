import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { onSnapshot, collection, doc, writeBatch, query, where, updateDoc, deleteDoc, arrayUnion, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { GoogleAuthProvider, linkWithPopup, signInWithPopup } from 'firebase/auth';
import { parseDateString, toDateInputString } from '../utils/date';
import { auth, db, appId, signOutUser } from '../api/firebase';
import { DragDropContext } from 'react-beautiful-dnd';
import useProjectedBalances from '../hooks/useProjectedBalances';
import useTransactionInstances from '../hooks/useTransactionInstances';
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
import Modal from '../components/core/Modal';
import { FinchLogo, IconSparkles, IconRepeat, IconPlus, IconChevronDown, IconAlertTriangle, IconX, IconLink } from '../components/core/Icon';
import PlaidLink from '../components/plaid/PlaidLink';
import AddAccountChoiceModal from '../components/modals/AddAccountChoiceModal';
import AddAccountModal from '../components/modals/AddAccountModal';
import PlaidLinkModal from '../components/modals/PlaidLinkModal';
import LoadingScreen from '../components/core/LoadingScreen'; // Import LoadingScreen

// --- SUB-COMPONENTS (Unchanged) ---
const UserProfile = ({ user, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) { setIsOpen(false); } }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [dropdownRef]);
    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full hover:bg-finch-gray-100 p-1 transition-colors">
                {user.photoURL ? (<img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />) : (<span className="w-8 h-8 rounded-full bg-finch-teal-500 text-white flex items-center justify-center font-bold">{user.email ? user.email.charAt(0).toUpperCase() : '?'}</span>)}
                <IconChevronDown />
            </button>
            {isOpen && (<div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-30"><div className="p-3 border-b"><p className="font-semibold truncate">{user.displayName || 'Guest'}</p><p className="text-sm text-finch-gray-500 truncate">{user.email || 'No email provided'}</p></div><div className="p-2"><button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm text-finch-gray-700 hover:bg-finch-gray-100 hover:text-red-600 rounded-md">Log Out</button></div></div>)}
        </div>
    );
};
const AuthConflictModal = ({ isOpen, onCancel, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title="Account Exists">
            <p className="text-sm text-finch-gray-600">You already have an account with this email. Would you like to sign in to that account? Your current guest data will not be saved.</p>
            <div className="flex justify-end gap-4 pt-4">
                <button onClick={onCancel} className="bg-white hover:bg-finch-gray-100 text-finch-gray-700 font-semibold py-2 px-4 border border-finch-gray-300 rounded-lg shadow-sm">Cancel</button>
                <button onClick={onConfirm} className="bg-finch-teal-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm">Sign In</button>
            </div>
        </Modal>
    );
};


// --- MAIN AppLayout COMPONENT ---
const AppLayout = ({ user }) => {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [data, setData] = useState({ accounts: [], transactions: [], loading: true });
    const [budgets, setBudgets] = useState({ loading: true, data: {} });
    // ... all other state variables are the same
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
    const [isAddAccountChoiceModalOpen, setAddAccountChoiceModalOpen] = useState(false);
    const [isPlaidLinkOpen, setIsPlaidLinkOpen] = useState(false);
    const [accountToLink, setAccountToLink] = useState(null);

    // REWRITTEN AND SIMPLIFIED DATA FETCHING LOGIC
    useEffect(() => {
        if (!user) return;
        console.log("AppLayout: User detected, setting up Firestore listeners...");

        let accountsLoaded = false;
        let transactionsLoaded = false;
        let budgetsLoaded = false;

        const checkIfAllLoaded = () => {
            if(accountsLoaded && transactionsLoaded && budgetsLoaded) {
                console.log("AppLayout: All initial data loaded.");
                setData(prev => ({ ...prev, loading: false }));
            }
        }

        const accountsRef = collection(db, `artifacts/${appId}/users/${user.uid}/accounts`);
        const transactionsRef = collection(db, `artifacts/${appId}/users/${user.uid}/transactions`);
        const now = new Date();
        const budgetId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const budgetRef = doc(db, `artifacts/${appId}/users/${user.uid}/budgets`, budgetId);
        
        const unsubAccounts = onSnapshot(accountsRef, (snapshot) => {
            const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`AppLayout: Fetched ${accountsData.length} accounts.`);
            setData(prev => ({...prev, accounts: accountsData }));
            accountsLoaded = true;
            checkIfAllLoaded();
        }, (error) => { console.error("Error fetching accounts:", error); });

        const unsubTransactions = onSnapshot(transactionsRef, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => {
                const docData = doc.data();
                const recurringDetails = docData.recurringDetails ? { ...docData.recurringDetails, nextDate: docData.recurringDetails.nextDate?.toDate(), endDate: docData.recurringDetails.endDate?.toDate(), excludedDates: docData.recurringDetails.excludedDates?.map(ts => ts.toDate()) || [], } : null;
                return { id: doc.id, ...docData, date: docData.date?.toDate(), createdAt: docData.createdAt?.toDate(), recurringDetails, };
            });
            console.log(`AppLayout: Fetched ${transactionsData.length} transactions.`);
            setData(prev => ({...prev, transactions: transactionsData }));
            transactionsLoaded = true;
            checkIfAllLoaded();
        }, (error) => { console.error("Error fetching transactions:", error); });
        
        const unsubBudgets = onSnapshot(budgetRef, (doc) => {
            console.log("AppLayout: Fetched budgets.");
            setBudgets({ data: doc.exists() ? doc.data() : {} });
            budgetsLoaded = true;
            checkIfAllLoaded();
        }, (error) => { console.error("Error fetching budgets:", error); });
        
        return () => {
            console.log("AppLayout: Cleaning up Firestore listeners.");
            unsubAccounts();
            unsubTransactions();
            unsubBudgets();
        };
    }, [user]);

    // All handler functions remain the same
    const handleLogout = async () => { /* ... */ };
    const handleLinkAccount = async () => { /* ... */ };
    const handleConflictSignIn = async () => { /* ... */ };
    // ... include all your other handle... functions here, they don't need to change.
    const handleOpenAddModal = () => { setEditingTransaction(null); setTransactionModalOpen(true); };
    const handleOpenTransferModal = (initialData = null) => { setPrefilledTransfer(initialData); setTransferModalOpen(true); };
    const handleOpenEditModal = (transaction) => { if (transaction.type === 'transfer') { const transferPair = data.transactions.filter(t => t.transferId === transaction.transferId); setEditingTransfer(transferPair); setTransferModalOpen(true); } else { setEditingTransaction(transaction); setTransactionModalOpen(true); } };
    const handleOpenEditAccountModal = (account) => { setEditingAccount(account); setAccountModalOpen(true); };
    const handleOpenDeleteModal = (transaction) => { setDeletingTransaction(transaction); };
    const handleCloseModal = () => { setTransactionModalOpen(false); setEditingTransaction(null); setTransferModalOpen(false); setEditingTransfer(null); setPrefilledTransfer(null); setAccountModalOpen(false); setEditingAccount(null); };
    const handleRunSimulation = (simTransaction) => { setSimulatedTransaction({ ...simTransaction, amount: -Math.abs(parseFloat(simTransaction.amount)), type: 'expense', isRecurring: false, id: `sim-${Date.now()}` }); };
    const handleClearSimulation = () => { setSimulatedTransaction(null); };
    const handleSaveNewAccount = async (accountData) => { if (!accountData.name) { return; } try { const accountsRef = collection(db, `artifacts/${appId}/users/${user.uid}/accounts`); await addDoc(accountsRef, { ...accountData, createdAt: serverTimestamp(), }); setAddAccountModalOpen(false); } catch (error) { console.error("Error adding new account: ", error); } };
    const handleSaveTransfer = async (transfer) => { const { fromAccountId, toAccountId, amount, date, description, transferId } = transfer; const transferAmount = parseFloat(amount); if (!fromAccountId || !toAccountId || !transferAmount || !date) { console.error("Missing transfer details"); return; } const batch = writeBatch(db); const transactionsRef = collection(db, `artifacts/${appId}/users/${user.uid}/transactions`); if (transferId) { const q = query(transactionsRef, where("transferId", "==", transferId)); const querySnapshot = await getDocs(q); querySnapshot.forEach((doc) => { const docData = doc.data(); if (docData.amount < 0) { batch.update(doc.ref, { accountId: fromAccountId, amount: -transferAmount, date: parseDateString(date), description: `Transfer to ${data.accounts.find(a => a.id === toAccountId)?.name}`, notes: description, }); } else { batch.update(doc.ref, { accountId: toAccountId, amount: transferAmount, date: parseDateString(date), description: `Transfer from ${data.accounts.find(a => a.id === fromAccountId)?.name}`, notes: description, }); } }); } else { const newTransferId = crypto.randomUUID(); const withdrawalRef = doc(transactionsRef); batch.set(withdrawalRef, { accountId: fromAccountId, amount: -transferAmount, date: parseDateString(date), description: `Transfer to ${data.accounts.find(a => a.id === toAccountId)?.name}`, notes: description, type: 'transfer', isRecurring: false, transferId: newTransferId, createdAt: serverTimestamp(), }); const depositRef = doc(transactionsRef); batch.set(depositRef, { accountId: toAccountId, amount: transferAmount, date: parseDateString(date), description: `Transfer from ${data.accounts.find(a => a.id === fromAccountId)?.name}`, notes: description, type: 'transfer', isRecurring: false, transferId: newTransferId, createdAt: serverTimestamp(), }); } try { await batch.commit(); handleCloseModal(); } catch (error) { console.error("Error saving transfer:", error); } };
    const handleSaveAccount = async (account) => { const { id, ...accountData } = account; const accountRef = doc(db, `artifacts/${appId}/users/${user.uid}/accounts`, id); try { await updateDoc(accountRef, accountData); handleCloseModal(); } catch (error) { console.error("Error updating account:", error); } };
    const handleDeleteConfirm = async () => { if (!deletingTransaction) return; try { if (deletingTransaction.type === 'transfer') { const batch = writeBatch(db); const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/transactions`), where("transferId", "==", deletingTransaction.transferId)); const querySnapshot = await getDocs(q); querySnapshot.forEach((doc) => { batch.delete(doc.ref); }); await batch.commit(); } else if (deletingTransaction.isInstance) { const parentRef = doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, deletingTransaction.parentId); await updateDoc(parentRef, { 'recurringDetails.excludedDates': arrayUnion(deletingTransaction.date) }); } else { const transactionRef = doc(db, `artifacts/${appId}/users/${user.uid}/transactions`, deletingTransaction.id); await deleteDoc(transactionRef); } setDeletingTransaction(null); } catch (error) { console.error("Error deleting transaction: ", error); } };
    const handleOnDragEnd = (result) => { if (!result.destination) return; const items = Array.from(orderedAccounts); const [reorderedItem] = items.splice(result.source.index, 1); items.splice(result.destination.index, 0, reorderedItem); setOrderedAccounts(items); };
    const handleOpenAddAccountChoice = () => { setAddAccountChoiceModalOpen(true); };
    const handleChooseManual = () => { setAddAccountChoiceModalOpen(false); setAddAccountModalOpen(true); };
    const handleChoosePlaid = () => { setAddAccountChoiceModalOpen(false); setIsPlaidLinkOpen(true); };

    // All hooks remain the same
    const transactionsWithSimulation = useMemo(() => { if (simulatedTransaction) { return [...data.transactions, simulatedTransaction]; } return data.transactions; }, [data.transactions, simulatedTransaction]);
    const projections = useProjectedBalances(data.accounts, transactionsWithSimulation);
    const calendarProjections = useProjectedBalances(data.accounts, transactionsWithSimulation, calendarAccountId);
    
    // CORRECTED: This logic now correctly calculates summaries
    const accountSummaries = useMemo(() => {
        if (!projections || projections.length === 0) {
            return data.accounts.map(account => ({
                ...account,
                currentBalance: account.startingBalance,
                availableToSpend: account.startingBalance - (account.cushion || 0),
                warning: null
            }));
        }
        
        const endOfTodayBalances = projections[0]?.balances || {};
        
        return data.accounts.map(account => {
            const currentBalance = endOfTodayBalances[account.id] ?? account.startingBalance;
            const roundedCushion = Math.round((account.cushion || 0) * 100) / 100;
            const sixtyDayProjection = projections.slice(0, 61);
            
            const lowestBalanceIn60Days = Math.min(...sixtyDayProjection.map(p => p.balances[account.id] ?? Infinity));
            const availableToSpend = lowestBalanceIn60Days - roundedCushion;
            
            let warning = null;
            if (lowestBalanceIn60Days < 0) {
                warning = { type: 'error', message: "Your balance is projected to go negative in the next 60 days." };
            } else if (lowestBalanceIn60Days < roundedCushion) {
                warning = { type: 'warning', message: "Heads up: Your balance may dip into your cushion soon." };
            }
            
            return {
                ...account,
                cushion: roundedCushion,
                currentBalance: Math.round(currentBalance * 100) / 100,
                availableToSpend: Math.round(availableToSpend * 100) / 100,
                warning
            };
        });
    }, [data.accounts, projections]);

    useEffect(() => { setOrderedAccounts(accountSummaries); }, [accountSummaries]);
    const displayTransactions = useTransactionInstances(data.transactions);
    const pageTitles = { dashboard: 'Dashboard', calendar: 'Calendar', transactions: 'Transactions', budgets: 'Budgets', reports: 'Reports' };
    
    // UPDATED RENDER LOGIC
    if (data.loading) {
        return <LoadingScreen />;
    }

    const renderPage = () => {
        // This function is now simpler as the main loading check is outside
        switch (currentPage) {
            case 'dashboard': return <DashboardPage orderedAccounts={orderedAccounts} onOpenEditAccount={handleOpenEditAccountModal} onOpenAddAccount={handleOpenAddAccountChoice} onLinkAccount={setAccountToLink} transactions={displayTransactions} accounts={data.accounts} onEditTransaction={handleOpenEditModal} onDeleteTransaction={handleOpenDeleteModal} projections={projections} />;
            case 'calendar': return <CalendarPage projections={calendarProjections} accounts={data.accounts} selectedAccountId={calendarAccountId} setSelectedAccountId={setCalendarAccountId} />;
            case 'transactions': return <TransactionsPage displayTransactions={displayTransactions} accounts={data.accounts} onEdit={handleOpenEditModal} onDelete={handleOpenDeleteModal} />;
            case 'budgets': return <BudgetPage transactions={data.transactions} budgets={budgets.data} userId={user.uid} />;
            case 'reports': return <ReportsPage transactions={data.transactions} />;
            default: return <DashboardPage orderedAccounts={orderedAccounts} />;
        }
    };
    
    return (
        <div className="bg-finch-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {user.isAnonymous && (<SaveProgressBanner onSave={handleLinkAccount} />)}
                <header className="bg-white border border-finch-gray-200 rounded-xl shadow-sm p-4 flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <FinchLogo className="w-10 h-10" />
                        <div><h1 className="text-2xl font-bold text-finch-gray-800">{pageTitles[currentPage]}</h1></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSimulatedTransaction('new')} className="bg-white text-finch-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm border border-finch-gray-300 hover:bg-finch-gray-50 flex items-center gap-2 transition-all text-sm"><IconSparkles /> What If?</button>
                        <button onClick={() => handleOpenTransferModal()} className="bg-white text-finch-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm border border-finch-gray-300 hover:bg-finch-gray-50 flex items-center gap-2 transition-all text-sm disabled:opacity-50" disabled={data.accounts.length < 2}><IconRepeat /> Transfer</button>
                        <button onClick={handleOpenAddModal} className="bg-finch-orange-500 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-finch-orange-600 flex items-center gap-2 transition-all text-sm"><IconPlus /> New Transaction</button>
                        <div className="h-6 w-px bg-finch-gray-200 mx-1"></div>
                        <UserProfile user={user} onLogout={handleLogout} />
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
            
            {/* All modals remain the same */}
            {isTransactionModalOpen && (<TransactionModal isOpen={isTransactionModalOpen} onClose={handleCloseModal} accounts={data.accounts} userId={user.uid} transactionToEdit={editingTransaction} />)}
            {isTransferModalOpen && (<TransferModal isOpen={isTransferModalOpen} onClose={handleCloseModal} accounts={data.accounts} onSave={handleSaveTransfer} transferToEdit={editingTransfer} initialData={prefilledTransfer} />)}
            {isAccountModalOpen && (<EditAccountModal isOpen={isAccountModalOpen} onClose={handleCloseModal} account={editingAccount} onSave={handleSaveAccount} />)}
            {deletingTransaction && (<ConfirmDeleteModal isOpen={!!deletingTransaction} onClose={() => setDeletingTransaction(null)} onConfirm={handleDeleteConfirm} transaction={deletingTransaction} />)}
            {simulatedTransaction === 'new' && (<WhatIfModal isOpen={simulatedTransaction === 'new'} onClose={() => setSimulatedTransaction(null)} onSimulate={handleRunSimulation} accounts={data.accounts} />)}
            <AuthConflictModal isOpen={!!authConflictProvider} onCancel={() => setAuthConflictProvider(null)} onConfirm={handleConflictSignIn}/>
            <AddAccountChoiceModal isOpen={isAddAccountChoiceModalOpen} onClose={() => setAddAccountChoiceModalOpen(false)} onPlaid={handleChoosePlaid} onManual={handleChooseManual} />
            {isPlaidLinkOpen && ( <PlaidLink onLinkSuccess={() => setIsPlaidLinkOpen(false)} buttonText="This will not be visible" /> )}
            <AddAccountModal isOpen={isAddAccountModalOpen} onClose={() => setAddAccountModalOpen(false)} onSave={handleSaveNewAccount} />
            {accountToLink && (
                <PlaidLinkModal
                    isOpen={!!accountToLink}
                    onClose={() => setAccountToLink(null)}
                    manualAccount={accountToLink}
                    onLinkSuccess={() => { setAccountToLink(null); }}
                />
            )}
        </div>
    );
};

export default AppLayout;