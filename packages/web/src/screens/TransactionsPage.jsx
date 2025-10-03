import React from 'react';
import TransactionList from '../components/transactions/TransactionList';
import { useAppData } from './AppLayout'; // Import the context hook

// --- THIS IS THE FIX ---
// The page now gets its data from the context and passes it to the TransactionList.
const TransactionsPage = ({ onEdit, onDelete }) => {
    const { transactions, accounts } = useAppData();

    return (
        <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
            <TransactionList
                transactions={transactions}
                accounts={accounts}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
};

export default TransactionsPage;
