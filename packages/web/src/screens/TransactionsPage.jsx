import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import TransactionList from '../components/transactions/TransactionList';
import RecurringTransactionItem from '../components/transactions/RecurringTransactionItem';
import { useAppData } from './AppLayout';
import { startOfToday, addDays, isBefore } from 'date-fns';
import { IconX } from '../components/core/Icon';
import Tabs, { Tab } from '../components/core/Tabs';

const TransactionsPage = () => {
    const { accountId } = useParams();
    const { transactions, rawTransactions, accounts, onEditTransaction, onDeleteTransaction } = useAppData();
    const [activeTab, setActiveTab] = useState(0);

    const account = useMemo(() => {
        if (!accountId) return null;
        return accounts.find(acc => acc.id === accountId);
    }, [accounts, accountId]);

    const filteredTransactions = useMemo(() => {
        if (!transactions) return [];
        if (!accountId) return transactions;
        return transactions.filter(t => t.accountId === accountId);
    }, [transactions, accountId]);
    
    const filteredRawTransactions = useMemo(() => {
        if (!rawTransactions) return [];
        if (!accountId) return rawTransactions;
        return rawTransactions.filter(t => t.accountId === accountId);
    }, [rawTransactions, accountId]);

    const { upcomingTransactions, pastTransactions, recurringSeries } = useMemo(() => {
        const today = startOfToday();
        const thirtyDaysFromNow = addDays(today, 30);
        const future = [];
        const past = [];
        const series = [];

        (filteredRawTransactions || []).forEach(t => {
            if (t.isRecurring) {
                const endDate = t.recurringDetails.endDate ? new Date(t.recurringDetails.endDate) : null;
                if (!endDate || !isBefore(endDate, today)) {
                    series.push(t);
                }
            }
        });

        (filteredTransactions || []).forEach(t => {
            if (t.isInstance || !t.isRecurring) {
                const transactionDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                if (transactionDate >= today && transactionDate <= thirtyDaysFromNow) {
                    future.push(t);
                } else if (transactionDate < today) {
                    past.push(t);
                }
            }
        });

        future.sort((a, b) => new Date(a.date) - new Date(b.date));
        past.sort((a, b) => new Date(b.date) - new Date(a.date));
        series.sort((a, b) => new Date(a.recurringDetails.nextDate) - new Date(b.recurringDetails.nextDate));

        return { upcomingTransactions: future, pastTransactions: past, recurringSeries: series };
    }, [filteredTransactions, filteredRawTransactions]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Transactions</h1>
                 {account && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-4">
                        <h2 className="text-md font-bold text-indigo-800">
                            Filtered by: <span className="font-extrabold">{account.name}</span>
                        </h2>
                        <Link to="/app/transactions" className="flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800">
                            <IconX className="w-4 h-4" /> Clear
                        </Link>
                    </div>
                )}
            </div>

            <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
                <Tabs activeIndex={activeTab} onTabClick={setActiveTab}>
                    <Tab label="Upcoming">
                        <p className="text-sm text-slate-500 mb-4">A list of your individual transactions scheduled for the next 30 days.</p>
                        <TransactionList
                            transactions={upcomingTransactions}
                            accounts={accounts}
                            onEdit={onEditTransaction}
                            onDelete={onDeleteTransaction}
                            emptyMessage="No upcoming transactions in the next 30 days."
                        />
                    </Tab>
                    <Tab label="History">
                         <p className="text-sm text-slate-500 mb-4">A complete history of your past one-time and recurring transactions.</p>
                        <TransactionList
                            transactions={pastTransactions}
                            accounts={accounts}
                            onEdit={onEditTransaction}
                            onDelete={onDeleteTransaction}
                            emptyMessage="No past transactions found."
                        />
                    </Tab>
                    <Tab label="Recurring Series">
                        <p className="text-sm text-slate-500 mb-4">Manage your master recurring transaction series here. Edits made here will affect all future occurrences.</p>
                        <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Transaction</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Amount</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Frequency</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Next Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Edit</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {recurringSeries.length > 0 ? recurringSeries.map(t => (
                                        <RecurringTransactionItem
                                            key={t.id}
                                            transaction={t}
                                            onEdit={onEditTransaction}
                                            onDelete={onDeleteTransaction}
                                        />
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-16 text-slate-500">No active recurring series found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Tab>
                </Tabs>
            </div>
        </div>
    );
};

export default TransactionsPage;