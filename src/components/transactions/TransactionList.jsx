import React, { useMemo } from 'react';
import useTransactionInstances from '../../hooks/useTransactionInstances';
import TransactionItem from './TransactionItem';

const TransactionList = ({ transactions, accounts, onEdit, onDelete }) => {
    const accountMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.name])), [accounts]);
    const displayTransactions = useTransactionInstances(transactions);

    if (displayTransactions.length === 0) {
        return <div className="text-center py-16 text-slate-500">No transactions yet.</div>;
    }

    return (
        <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto -mr-2 pr-2">
            {displayTransactions.map(t => (
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