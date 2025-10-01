import React, { useMemo } from 'react';
import TransactionItem from './TransactionItem';

// This component is now "dumb". It just renders the transactions it's given.
const TransactionList = ({ transactions, accounts, onEdit, onDelete }) => {
    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);

    if (!transactions || transactions.length === 0) {
        return <div className="text-center py-16 text-slate-500">No transactions yet.</div>;
    }

    return (
        <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto -mr-2 pr-2">
            {transactions.map(t => (
                <TransactionItem 
                    key={t.id}
                    transaction={t}
                    accountName={accountMap.get(t.accountId) || 'Unknown Account'}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </ul>
    );
};

export default TransactionList;