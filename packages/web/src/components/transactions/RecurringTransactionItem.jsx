import React from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { formatDate, parseDateString } from '@shared/utils/date';
import { getCategoryByName } from '../../constants/categories';
import { Edit3, Trash2 } from 'lucide-react';
import { IconDollarSign } from '../core/Icon';

const RecurringTransactionItem = ({ transaction, onEdit, onDelete }) => {
    const { description, amount, category: categoryName, recurringDetails } = transaction;

    const isExpense = amount < 0;
    const category = isExpense ? getCategoryByName(categoryName) : { icon: IconDollarSign, color: 'text-green-600' };
    const IconComponent = category.icon;

    const formatDetailDate = (date) => {
        if (!date) return 'N/A';
        const dateObj = parseDateString(date);
        return formatDate(dateObj, 'MMM d, yyyy');
    };

    const frequencyMap = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'bi-weekly': 'Bi-Weekly',
        'monthly': 'Monthly',
        'quarterly': 'Quarterly',
        'annually': 'Annually'
    };

    return (
        <tr>
            <td className="w-full max-w-0 py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:w-auto sm:max-w-none sm:pl-6">
                <div className="flex items-center gap-3">
                     <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${isExpense ? 'bg-slate-100' : 'bg-green-50'} ${category.color}`}>
                        <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                        {description}
                        {categoryName && <p className="text-xs text-slate-500">{categoryName}</p>}
                    </div>
                </div>
            </td>
            <td className={`px-3 py-4 text-sm ${isExpense ? 'text-slate-700' : 'text-green-600'}`}>{formatCurrency(amount)}</td>
            <td className="px-3 py-4 text-sm text-slate-500">{frequencyMap[recurringDetails.frequency]}</td>
            <td className="px-3 py-4 text-sm text-slate-500">{formatDetailDate(recurringDetails.nextDate)}</td>
            <td className="py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                 <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(transaction)} className="p-2 text-slate-500 rounded-md hover:bg-slate-100 hover:text-indigo-600">
                        <Edit3 size={16} />
                    </button>
                    <button onClick={() => onDelete(transaction)} className="p-2 text-slate-500 rounded-md hover:bg-slate-100 hover:text-red-600">
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default RecurringTransactionItem;