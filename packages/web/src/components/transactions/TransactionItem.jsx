import React from 'react';
import { formatCurrency } from '@finch/shared-logic/utils/currency'; // Changed import
import { CATEGORIES } from '../../constants/categories';
import { 
    IconRepeat, 
    IconDollarSign, 
    IconPencil, 
    IconTrash 
} from '../core/Icon';

const TransactionItem = ({ transaction, accountName, onEdit, onDelete }) => {
    const isTransfer = transaction.type === 'transfer';
    const isIncome = transaction.amount > 0 && !isTransfer;
    
    const categoryInfo = !isTransfer && !isIncome ? (CATEGORIES[transaction.category] || CATEGORIES['Uncategorized']) : null;
    
    let Icon;
    if (isTransfer) {
        Icon = IconRepeat;
    } else if (isIncome) {
        Icon = IconDollarSign;
    } else {
        Icon = categoryInfo.icon;
    }

    const iconBgColor = 'bg-finch-gray-100';
    const iconTextColor = isIncome ? 'text-green-600' : (categoryInfo ? categoryInfo.color : 'text-finch-gray-600');

    // --- THE FIX IS HERE ---
    // This function is now simplified to correctly handle Date objects.
    const formatDate = (date) => {
        // If the date is invalid or doesn't exist, return an empty string.
        if (!date || !(date instanceof Date) || isNaN(date)) {
            return '';
        }
        // If it's a valid Date object, format it correctly.
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const effectiveDate = transaction.isRecurring && !transaction.isInstance ? transaction.recurringDetails.nextDate : (transaction.date || transaction.createdAt);

    return (
        <li className="p-4 flex items-center justify-between hover:bg-finch-gray-50 rounded-lg group">
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconBgColor} ${iconTextColor}`}>
                    {Icon && <Icon />}
                </div>
                <div>
                    <p className="font-semibold text-finch-gray-800">{transaction.description}</p>
                    <p className="text-sm text-finch-gray-500">
                        {formatDate(effectiveDate)} &bull; {accountName}
                        {transaction.isRecurring && !transaction.isInstance && <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">RECURRING</span>}
                        {transaction.isInstance && <span className="ml-2 text-xs font-semibold text-finch-gray-500 bg-finch-gray-200 px-2 py-0.5 rounded-full">INSTANCE</span>}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <p className={`font-bold text-lg ${transaction.amount < 0 ? 'text-finch-gray-800' : 'text-green-600'}`}>
                    {transaction.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                </p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <button onClick={() => onEdit(transaction)} className="p-2 text-finch-gray-400 hover:text-finch-teal-600"><IconPencil className="w-5 h-5"/></button>
                    <button onClick={() => onDelete(transaction)} className="p-2 text-finch-gray-400 hover:text-red-600"><IconTrash className="w-5 h-5"/></button>
                </div>
            </div>
        </li>
    );
};

export default TransactionItem;