import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { IconAlertTriangle, IconCreditCard, IconBank, IconPencil, IconPlus, IconLink } from '../components/core/Icon';
import TransactionList from '../components/transactions/TransactionList';
import UpcomingBills from '../components/dashboard/UpcomingBills';
import CashFlowChart from '../components/dashboard/CashFlowChart';
import SixtyDayOutlook from '../components/dashboard/SixtyDayOutlook';
import GoalEnvelope from '../components/dashboard/GoalEnvelope';
import AddGoalModal from '../components/modals/AddGoalModal';
import AllocateFundsModal from '../components/modals/AllocateFundsModal';
import { useAppData } from './AppLayout';
import Button from '../components/core/Button';
import TransactionModal from '../components/modals/TransactionModal';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import api from '@shared/api/firebase';
import { useAuth } from '@shared/hooks/useAuth';
import { Link } from 'react-router-dom';
import Tabs, { Tab } from '../components/core/Tabs';
import { startOfToday, addDays, subDays } from 'date-fns';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { parseDateString } from '@shared/utils/date';


// Components are unchanged
const AddAccountCard = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full bg-white/50 border-2 border-dashed border-finch-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-finch-gray-500 hover:bg-white hover:border-finch-teal-400 hover:text-finch-teal-600 transition-all h-full"
        >
            <IconPlus className="w-8 h-8" />
            <span className="mt-2 font-bold text-lg">Add Account</span>
        </button>
    );
};

const AddGoalCard = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full bg-white/50 border-2 border-dashed border-finch-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-finch-gray-500 hover:bg-white hover:border-finch-teal-400 hover:text-finch-teal-600 transition-all h-full"
        >
            <IconPlus className="w-8 h-8" />
            <span className="mt-2 font-bold text-lg">Add New Goal</span>
        </button>
    );
};

const AccountCard = ({ account, onOpenEditAccount, onLinkAccount, isSelected, onClick }) => {
    const cardBorderColor = isSelected ? 'border-indigo-500' 
        : account.warning?.type === 'error' ? 'border-red-500'
        : account.warning?.type === 'warning' ? 'border-amber-500'
        : 'border-finch-gray-200';

    const isManual = !account.plaidAccountId;

    return (
        <div onClick={onClick} className={`block group cursor-pointer`}>
            <div className={`bg-white rounded-xl shadow-sm p-6 border-2 transition-all duration-300 relative h-full ${cardBorderColor} group-hover:shadow-lg group-hover:border-finch-teal-400`}>
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        onOpenEditAccount(account);
                    }} 
                    className="absolute top-4 right-4 text-finch-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-finch-teal-600"
                >
                    <IconPencil className="w-5 h-5" />
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-xl text-finch-gray-800">{account.name}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-finch-gray-500">{account.type}</p>
                            {isManual && <span className="text-xs font-semibold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">MANUAL</span>}
                        </div>
                    </div>
                    <div className="text-finch-gray-400">
                        {account.type === 'Checking' ? <IconCreditCard /> : <IconBank />}
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <p className="text-sm text-finch-gray-500">Available to Spend</p>
                    <p className={`text-4xl font-bold tracking-tight ${account.availableToSpend < 0 ? 'text-red-600' : 'text-finch-gray-900'}`}>
                        {formatCurrency(account.availableToSpend)}
                    </p>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-center border-t border-finch-gray-200 pt-4">
                    <div>
                        <p className="text-xs text-finch-gray-500 uppercase tracking-wider">Balance</p>
                        <p className="font-semibold text-finch-gray-800 mt-1">{formatCurrency(account.currentBalance)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-finch-gray-500 uppercase tracking-wider">Cushion</p>
                        <p className="font-semibold text-finch-gray-800 mt-1">{formatCurrency(account.cushion)}</p>
                    </div>
                </div>
                {isManual && (
                    <div className="mt-4 border-t border-finch-gray-200 pt-4">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onLinkAccount(account);
                            }} 
                            className="w-full bg-indigo-50 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                            <IconLink className="w-4 h-4" /> Link to Bank
                        </button>
                    </div>
                )}
                {account.warning && (
                    <div className={`mt-4 p-3 rounded-lg flex items-start gap-3 text-sm ${account.warning.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                        <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{account.warning.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const DashboardPage = ({
    onLinkAccount,
}) => {
    const { user } = useAuth();
    const { 
      accounts, 
      rawAccounts, 
      transactions, 
      projections, 
      goals, 
      onEditTransaction, 
      onDeleteTransaction,
      onOpenAddAccount,
      onOpenEditAccount 
    } = useAppData();

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
    const [goalToAllocate, setGoalToAllocate] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts.length > 0 ? accounts[0].id : null);

    const handleAddTransaction = async (data) => {
        if (!user) return;
        try {
            const { isRecurring, frequency, ...transactionData } = data;
            const newTransaction = {
                ...transactionData,
                amount: data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
                createdAt: serverTimestamp(),
                isRecurring: !!isRecurring,
            };
            if (isRecurring) {
                newTransaction.recurringDetails = {
                    frequency: frequency,
                    nextDate: parseDateString(data.date),
                };
            }
            const transactionsCollection = collection(api.firestore, `users/${user.uid}/transactions`);
            await addDoc(transactionsCollection, newTransaction);
            setIsTransactionModalOpen(false);
        } catch (error) {
            console.error("Error adding transaction:", error);
            alert(`Failed to save transaction: ${error.message}`);
        }
    };

    const handleAddGoal = async (data) => {
        if (!user) return;
        try {
            const goalsCollection = collection(api.firestore, `users/${user.uid}/goals`);
            await addDoc(goalsCollection, data);
            setIsGoalModalOpen(false);
        } catch (error) {
            console.error("Error adding goal to Firestore:", error);
            alert(`Failed to save goal: ${error.message}`);
        }
    };

    const handleOpenAllocateModal = (goal) => {
        const fundingAccount = accounts.find(acc => acc.id === goal.fundingAccountId);
        setGoalToAllocate({
            ...goal,
            availableToSpend: fundingAccount ? fundingAccount.availableToSpend : 0
        });
        setIsAllocateModalOpen(true);
    };

    const handleAllocateFunds = async (goal, amountToAllocate) => {
        if (!user || !goal || amountToAllocate <= 0) return;
        try {
            const goalRef = doc(api.firestore, `users/${user.uid}/goals`, goal.id);
            const newAllocatedAmount = (goal.allocatedAmount || 0) + amountToAllocate;
            await updateDoc(goalRef, {
                allocatedAmount: newAllocatedAmount
            });
            setIsAllocateModalOpen(false);
        } catch (error) {
            console.error("Error allocating funds:", error);
            alert(`Failed to allocate funds: ${error.message}`);
        }
    };

    const { aggregatedProjections } = useMemo(() => {
        if (!projections || projections.length === 0) {
            return { aggregatedProjections: [] };
        }
        const dailyTotals = {};
        projections.forEach(({ projections: accountProjections }) => {
            accountProjections.forEach(dayProjection => {
                const dateKey = dayProjection.date.toISOString().split('T')[0];
                if (!dailyTotals[dateKey]) {
                    dailyTotals[dateKey] = { date: dayProjection.date, balance: 0 };
                }
                dailyTotals[dateKey].balance += dayProjection.balance;
            });
        });
        const sortedProjections = Object.values(dailyTotals).sort((a, b) => a.date - b.date);
        return { aggregatedProjections: sortedProjections };
    }, [projections]);
    
    const activityFeedItems = useMemo(() => {
        if (!transactions) return [];
        const today = startOfToday();
        const thirtyDaysAgo = subDays(today, 30);
        const thirtyDaysFromNow = addDays(today, 30);
        return transactions
            .filter(t => {
                const itemDate = parseDateString(t.date);
                if (!itemDate) return false;
                const isInDateRange = itemDate >= thirtyDaysAgo && itemDate <= thirtyDaysFromNow;
                if (!isInDateRange) return false;
                if (t.isInstance) {
                    const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? parseDateString(t.createdAt) : null);
                    if (createdAt && itemDate < createdAt) return false;
                }
                return true;
            })
            .sort((a, b) => {
                const dateA = parseDateString(a.date);
                const dateB = parseDateString(b.date);
                if (dateA >= today && dateB >= today) return dateA - dateB;
                if (dateA < today && dateB < today) return dateB - dateA;
                return dateA < dateB ? 1 : -1;
            });
    }, [transactions]);
    
    // --- START DEFINITIVE FIX ---
    const accountSpecificTransactions = useMemo(() => {
        if (!transactions || !selectedAccountId) return [];
        const today = startOfToday();

        return transactions
            .filter(t => {
                const itemDate = parseDateString(t.date);
                if (!itemDate) return false;

                // Rule 1: Must belong to the selected account AND be on or before today.
                if (t.accountId !== selectedAccountId || itemDate > today) {
                    return false;
                }

                // Rule 2: If it's a recurring instance, it must not have occurred before the original was created.
                if (t.isInstance) {
                    const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? parseDateString(t.createdAt) : null);
                    if (createdAt && itemDate < startOfToday(createdAt)) {
                        return false;
                    }
                }
                
                return true;
            })
            .sort((a, b) => parseDateString(b.date) - parseDateString(a.date)); // Sort by date descending
    }, [transactions, selectedAccountId]);
    // --- END DEFINITIVE FIX ---

    const handleAccountPillClick = (accountId) => {
        setSelectedAccountId(accountId);
        setActiveTab(1);
    };

    return (
        <>
            <section className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <Tabs activeIndex={activeTab} onTabClick={setActiveTab}>
                    <Tab label="Overview">
                         <div className="space-y-8 mt-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">At a Glance</h3>
                                <div className="flex flex-wrap gap-4">
                                    {accounts.map(account => (
                                        <button 
                                            key={account.id} 
                                            onClick={() => handleAccountPillClick(account.id)}
                                            className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                                        >
                                            <p className="text-sm font-semibold text-slate-600">{account.name}</p>
                                            <p className={`text-2xl font-bold ${account.availableToSpend < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                                {formatCurrency(account.availableToSpend)}
                                            </p>
                                            <p className="text-xs text-slate-500">Available to Spend</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                                <div className="lg:col-span-3 space-y-8">
                                    <SixtyDayOutlook projections={projections} accounts={rawAccounts} goals={goals} />
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-4">Cash Flow</h3>
                                        <CashFlowChart projections={aggregatedProjections} />
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                     <ActivityFeed transactions={activityFeedItems} accounts={accounts} />
                                </div>
                            </div>
                        </div>
                    </Tab>
                    <Tab label="Accounts">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {accounts.map((account) => (
                                <AccountCard
                                    key={account.id}
                                    account={account}
                                    onOpenEditAccount={onOpenEditAccount}
                                    onLinkAccount={onLinkAccount}
                                    isSelected={selectedAccountId === account.id}
                                    onClick={() => setSelectedAccountId(account.id)}
                                />
                            ))}
                            <AddAccountCard onClick={onOpenAddAccount} />
                        </div>
                        {selectedAccountId && (
                             <div className="mt-8">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Transaction History for {accounts.find(a => a.id === selectedAccountId)?.name}</h3>
                                <TransactionList
                                    transactions={accountSpecificTransactions}
                                    accounts={accounts}
                                    onEdit={onEditTransaction}
                                    onDelete={onDeleteTransaction}
                                    emptyMessage="No transactions found for this account."
                                />
                            </div>
                        )}
                    </Tab>
                    <Tab label="Envelopes">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {goals.map((goal) => (
                                <GoalEnvelope key={goal.id} goal={goal} onAllocate={handleOpenAllocateModal} />
                            ))}
                            <AddGoalCard onClick={() => setIsGoalModalOpen(true)} />
                        </div>
                    </Tab>
                </Tabs>
            </section>
            {isTransactionModalOpen && (
                <TransactionModal
                    isOpen={isTransactionModalOpen}
                    onClose={() => setIsTransactionModalOpen(false)}
                    onSubmit={handleAddTransaction}
                    accounts={rawAccounts}
                />
            )}
            {isGoalModalOpen && (
                <AddGoalModal
                    isOpen={isGoalModalOpen}
                    onClose={() => setIsGoalModalOpen(false)}
                    onSave={handleAddGoal}
                    accounts={rawAccounts}
                />
            )}
            {isAllocateModalOpen && goalToAllocate && (
                <AllocateFundsModal
                    isOpen={isAllocateModalOpen}
                    onClose={() => setIsAllocateModalOpen(false)}
                    onSave={handleAllocateFunds}
                    goal={goalToAllocate}
                />
            )}
        </>
    );
};

export default DashboardPage;