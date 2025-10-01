import React from 'react';
import TransactionList from '../components/transactions/TransactionList';

// This page now receives the display-ready transactions directly
const TransactionsPage = ({ displayTransactions, accounts, onEdit, onDelete }) => (
    <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
        <TransactionList
            transactions={displayTransactions}
            accounts={accounts}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    </div>
);

export default TransactionsPage;