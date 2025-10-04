import React, { useState } from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { formatDate as formatDateUtil } from '@shared/utils/date';
import { getCategoryByName } from '../../constants/categories';
import { Edit3, Trash2 } from 'lucide-react';

const TransactionItem = ({ transaction, onEdit, onDelete, isRecurring }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { description, amount, category: categoryName, date } = transaction;

  const category = getCategoryByName(categoryName);
  const isExpense = amount < 0;

  const IconComponent = category.icon;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return formatDateUtil(dateObj, 'MMM d');
  };

  const formattedAmount = formatCurrency(Math.abs(amount));
  const amountColor = isExpense ? 'text-red-500' : 'text-green-500';

  return (
    <div
      className="flex items-center justify-between p-3 transition-colors duration-200 ease-in-out bg-white rounded-lg shadow-sm hover:bg-gray-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center">
        <div className={`flex items-center justify-center w-10 h-10 mr-4 rounded-full ${category.color}`}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">{description}</p>
          <p className="text-sm text-gray-500">{categoryName}</p>
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-right">
          <p className={`font-semibold ${amountColor}`}>
            {isExpense ? '-' : ''}
            {formattedAmount}
          </p>
          <p className="text-sm text-gray-500">
            {isRecurring ? `Next on ${formatDate(date)}` : formatDate(date)}
          </p>
        </div>
        <div className="flex items-center ml-4 space-x-2">
          {isHovered && (
            <>
              <button onClick={() => onEdit(transaction)} className="p-2 text-gray-500 rounded-full hover:bg-gray-200">
                <Edit3 size={18} />
              </button>
              <button onClick={() => onDelete(transaction.id)} className="p-2 text-gray-500 rounded-full hover:bg-gray-200">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;