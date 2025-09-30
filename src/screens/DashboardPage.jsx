import React from 'react';
import { formatCurrency } from '../utils/currency';
import { IconAlertTriangle, IconCreditCard, IconBank, IconPencil, IconPlus } from '../components/core/Icon';
import { Droppable, Draggable } from 'react-beautiful-dnd';

const AddAccountCard = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-indigo-400 hover:text-indigo-600 transition-all h-full"
        >
            <IconPlus />
            <span className="mt-2 font-bold text-lg">Add Account</span>
        </button>
    );
};

const AccountCard = ({ account, onOpenEditAccount }) => {
    const cardBorderColor = account.warning?.type === 'error' ? 'border-red-500'
        : account.warning?.type === 'warning' ? 'border-amber-500'
        : 'border-slate-200';

    return (
        <div className={`bg-white rounded-xl shadow-md p-6 border transition-all duration-300 relative group border-t-4 ${cardBorderColor}`}>
            <button onClick={() => onOpenEditAccount(account)} className="absolute top-4 right-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-600">
                <IconPencil className="w-5 h-5" />
            </button>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-xl text-slate-800">{account.name}</h3>
                    <p className="text-sm text-slate-500">{account.type}</p>
                </div>
                <div className="text-slate-400">
                    {account.type === 'Checking' ? <IconCreditCard /> : <IconBank />}
                </div>
            </div>
            <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">Available to Spend</p>
                <p className={`text-4xl font-bold tracking-tight ${account.availableToSpend < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatCurrency(account.availableToSpend)}
                </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-center border-t pt-4">
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
                    <p className="font-semibold text-slate-800 mt-1">{formatCurrency(account.currentBalance)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Cushion</p>
                    <p className="font-semibold text-slate-800 mt-1">{formatCurrency(account.cushion)}</p>
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

// The component is now much simpler. It just receives the ordered list and renders it.
const DashboardPage = ({ orderedAccounts, onOpenEditAccount, onOpenAddAccount }) => {
    return (
        <section className="space-y-6">
            <Droppable droppableId="accounts">
                {(provided) => (
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                    >
                        {orderedAccounts.map((account, index) => (
                            <Draggable key={account.id} draggableId={account.id} index={index}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                    >
                                        <AccountCard account={account} onOpenEditAccount={onOpenEditAccount} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
            
            <div className="pt-6 border-t border-slate-200">
                <AddAccountCard onClick={onOpenAddAccount} />
            </div>
        </section>
    );
};

export default DashboardPage;