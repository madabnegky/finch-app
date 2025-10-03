import React, { useMemo } from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { IconAlertTriangle, IconCreditCard, IconBank, IconPencil, IconPlus, IconLink } from '../components/core/Icon';
// FIX: Import DragDropContext to enable drag-and-drop functionality
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import TransactionList from '../components/transactions/TransactionList';
import UpcomingBills from '../components/dashboard/UpcomingBills';
import CashFlowChart from '../components/dashboard/CashFlowChart';

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

const AccountCard = ({ account, onOpenEditAccount, onLinkAccount }) => {
    const cardBorderColor = account.warning?.type === 'error' ? 'border-red-500'
        : account.warning?.type === 'warning' ? 'border-amber-500'
        : 'border-finch-gray-200';

    const isManual = !account.plaidAccountId;

    return (
        <div className={`bg-white rounded-xl shadow-sm p-6 border transition-all duration-300 relative group ${cardBorderColor}`}>
            <button onClick={() => onOpenEditAccount(account)} className="absolute top-4 right-4 text-finch-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-finch-teal-600">
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
                    <button onClick={() => onLinkAccount(account)} className="w-full bg-indigo-50 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors text-sm">
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
    );
};

const DashboardPage = ({ 
    orderedAccounts = [], 
    onOpenEditAccount, 
    onOpenAddAccount,
    onLinkAccount,
    transactions = [],
    accounts = [],
    onEditTransaction,
    onDeleteTransaction,
    projections = []
}) => {
    
    const recentTransactions = useMemo(() => {
        return transactions.filter(t => !t.isRecurring || t.isInstance).slice(0, 5);
    }, [transactions]);
    
    const onDragEnd = (result) => {
        console.log("Drag ended. In a future feature, we would save this new order:", result);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <section className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-2/3 space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-finch-gray-800 mb-4">Your Accounts</h2>
                        <Droppable droppableId="accounts">
                            {(provided) => (
                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                >
                                    {orderedAccounts.map((account, index) => (
                                        <Draggable key={account.id} draggableId={account.id} index={index}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                                    <AccountCard 
                                                        account={account} 
                                                        onOpenEditAccount={onOpenEditAccount} 
                                                        onLinkAccount={onLinkAccount}
                                                    />
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
                    <div className="p-6 bg-white rounded-xl shadow-sm border border-finch-gray-200">
                        <h3 className="text-xl font-bold text-finch-gray-800 mb-4">Recent Transactions</h3>
                        <TransactionList 
                            transactions={recentTransactions}
                            accounts={accounts}
                            onEdit={onEditTransaction}
                            onDelete={onDeleteTransaction}
                        />
                    </div>
                </div>
                <div className="w-full lg:w-1/3 space-y-8">
                    <div className="p-6 bg-white rounded-xl shadow-sm border border-finch-gray-200">
                        <h3 className="text-xl font-bold text-finch-gray-800 mb-4">Cash Flow</h3>
                        <CashFlowChart projections={projections} />
                    </div>
                    <UpcomingBills transactions={transactions} />
                </div>
            </section>
        </DragDropContext>
    );
};

export default DashboardPage;