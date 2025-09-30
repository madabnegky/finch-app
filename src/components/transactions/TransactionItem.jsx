import React from 'react';
import { formatCurrency } from '../../utils/currency';
import { CATEGORIES } from '../../constants/categories';
import { 
    IconRepeat, 
    IconDollarSign, 
    IconPencil, 
    IconTrash 
} from '../core/Icon';

const TransactionItem = ({ transaction, accountName, onEdit, onDelete }) => {
    const isTransfer = transaction.type === 'transfer';
    const Category = !isTransfer ? (CATEGORIES[transaction.category] || CATEGORIES['Uncategorized']) : null;
    const CategoryIcon = !isTransfer ? Category.icon : null;
    const effectiveDate = transaction.isRecurring && !transaction.isInstance ? transaction.recurringDetails.nextDate : transaction.date;

    const iconClasses = isTransfer 
        ? 'bg-slate-100 text-slate-600' 
        : transaction.type === 'expense' 
        ? `bg-slate-100 ${Category.color}`
        : 'bg-slate-100 text-green-600';

    const Icon = isTransfer 
        ? IconRepeat 
        : transaction.type === 'expense' 
        ? CategoryIcon 
        : IconDollarSign;

    return (
        <li className="p-4 flex items-center justify-between hover:bg-slate-50 rounded-lg group">
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconClasses}`}>
                    {Icon && <Icon />}
                </div>
                <div>
                    <p className="font-semibold">{transaction.description}</p>
                    <p className="text-sm text-slate-500">
                        {effectiveDate?.toLocaleDateString()} &bull; {accountName}
                        {transaction.isRecurring && !transaction.isInstance && <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">RECURRING</span>}
                        {transaction.isInstance && <span className="ml-2 text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">PAST</span>}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <p className={`font-bold text-lg ${transaction.amount < 0 ? 'text-slate-800' : 'text-green-600'}`}>
                    {transaction.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                </p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(transaction)} className="p-1 text-slate-400 hover:text-blue-600"><IconPencil className="w-5 h-5"/></button>
                    <button onClick={() => onDelete(transaction)} className="p-1 text-slate-400 hover:text-red-600"><IconTrash className="w-5 h-5"/></button>
                </div>
            </div>
        </li>
    );
};

export default TransactionItem;