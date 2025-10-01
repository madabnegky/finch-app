import React, { useMemo } from 'react';
import { formatCurrency } from '../utils/currency';
import { IconAlertTriangle, IconCreditCard, IconBank, IconPencil, IconPlus } from '../components/core/Icon';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import TransactionList from '../components/transactions/TransactionList';

const AddAccountCard = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full bg-white/50 border-2 border-dashed border-finch-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-finch-gray-500 hover:bg-white hover:border-finch-teal-400 hover:text-finch-teal-600 transition-all h-full"
        >
            <IconPlus />
            <span className="mt-2 font-bold text-lg">Add Account</span>
        </button>
    );
};

const AccountCard = ({ account, onOpenEditAccount }) => {
    const cardBorderColor = account.warning?.type === 'error' ? 'border-red-500'
        : account.warning?.type === 'warning' ? 'border-amber-500'
        : 'border-finch-gray-200';

    return (
        <div className={`bg-white rounded-xl shadow-sm p-6 border transition-all duration-300 relative group ${cardBorderColor}`}>
            <button onClick={() => onOpenEditAccount(account)} className="absolute top-4 right-4 text-finch-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-finch-teal-600">
                <IconPencil className="w-5 h-5" />
            </button>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-xl text-finch-gray-800">{account.name}</h3>
                    <p className="text-sm text-finch-gray-500">{account.type}</p>
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
            {account.warning && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-3 text-sm ${account.warning.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                    <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{account.warning.message}</span>
                </div>
            )}
        </div>
    );
};

// THE FIX IS HERE: Add default empty arrays to ALL array props
const DashboardPage = ({ 
    orderedAccounts = [], 
    onOpenEditAccount, 
    onOpenAddAccount,
    transactions = [],
    accounts = [],
    onEditTransaction,
    onDeleteTransaction 
}) => {
    
    const recentTransactions = useMemo(() => {
        return transactions.slice(0, 5);
    }, [transactions]);

    return (
        <section className="space-y-8">
            {/* Accounts Section */}
            <div>
                <Droppable droppableId="accounts">
                    {(provided) => (
                        <div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {/* This .map is now safe */}
                            {orderedAccounts.map((account, index) => (
                                <Draggable key={account.id} draggableId={account.id} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                            <AccountCard account={account} onOpenEditAccount={onOpenEditAccount} />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
                <div className="pt-6 mt-6 border-t border-finch-gray-200">
                    <AddAccountCard onClick={onOpenAddAccount} />
                </div>
            </div>

            {/* Recent Transactions Section */}
            <div className="p-6 bg-white rounded-xl shadow-sm border border-finch-gray-200">
                <h3 className="text-xl font-bold text-finch-gray-800 mb-4">Recent Transactions</h3>
                <TransactionList 
                    transactions={recentTransactions}
                    accounts={accounts}
                    onEdit={onEditTransaction}
                    onDelete={onDeleteTransaction}
                />
            </div>
        </section>
    );
};

export default DashboardPage;