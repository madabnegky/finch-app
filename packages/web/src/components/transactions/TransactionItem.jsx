import React, { useState } from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { formatDate as formatDateUtil } from '@shared/utils/date';
import { getCategoryByName } from '../../constants/categories';
import { Edit3, Trash2, Repeat } from 'lucide-react';
import { IconDollarSign } from '../core/Icon';

const TransactionItem = ({ transaction, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { description, amount, category: categoryName, date, isInstance } = transaction;

  const isExpense = amount < 0;

  // --- START FIX ---
  // If the transaction is an expense, get its category. Otherwise, create a
  // temporary "category" object for display purposes with a dollar sign icon.
  const category = isExpense ? getCategoryByName(categoryName) : { icon: IconDollarSign, color: 'text-green-600' };
  const IconComponent = category.icon;
  // --- END FIX ---

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return formatDateUtil(dateObj, 'MMM d');
  };

  const formattedAmount = formatCurrency(amount);
  const amountColor = isExpense ? 'text-slate-800' : 'text-green-600';

  return (
    <li
      className="flex items-center justify-between p-3 transition-colors duration-200 ease-in-out bg-white rounded-lg hover:bg-slate-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 ${category.color}`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 flex items-center gap-2">
            {description}
            {isInstance && (
              <span title="Recurring transaction instance" className="text-slate-400">
                <Repeat size={14} />
              </span>
            )}
          </p>
          {isExpense && categoryName && <p className="text-sm text-slate-500">{categoryName}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`font-bold ${amountColor}`}>
            {formattedAmount}
          </p>
          <p className="text-sm text-slate-500">
            {formatDate(date)}
          </p>
        </div>
        <div className="flex items-center w-20 justify-end">
          {isHovered && (
            <>
              <button onClick={() => onEdit(transaction)} className="p-2 text-slate-500 rounded-full hover:bg-slate-200">
                <Edit3 size={16} />
              </button>
              <button onClick={() => onDelete(transaction)} className="p-2 text-slate-500 rounded-full hover:bg-slate-200">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
};

export default TransactionItem;