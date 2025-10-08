import React from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { getCategoryByName } from '../../constants/categories';
import { IconDollarSign, IconRepeat } from '../core/Icon';
import { parseDateString } from '@shared/utils/date'; // Import the robust date parser

const ActivityFeedItem = ({ item }) => {
    const isExpense = item.amount < 0;
    const category = isExpense ? getCategoryByName(item.category) : { icon: IconDollarSign, color: 'text-green-600' };
    const IconComponent = category.icon;

    const formatDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // --- START DEFINITIVE FIX ---
        // Use the robust, timezone-proof parser for all date handling
        const itemDate = parseDateString(date);
        // --- END DEFINITIVE FIX ---

        const diffTime = itemDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        
        // Format based on UTC date parts to avoid timezone shift in display
        const utcDate = new Date(itemDate.getUTCFullYear(), itemDate.getUTCMonth(), itemDate.getUTCDate());

        if (diffDays > 1 && diffDays <= 7) {
            return utcDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        }
        
        return utcDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    };

    return (
        <li className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
            <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${isExpense ? 'bg-slate-100' : 'bg-green-50'} ${category.color}`}>
                    <IconComponent className="w-4 h-4" />
                </div>
                <div>
                    <p className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                        {item.description}
                        {item.isInstance && <IconRepeat size={12} className="text-slate-400" />}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                </div>
            </div>
            <p className={`font-semibold text-sm ${isExpense ? 'text-slate-700' : 'text-green-600'}`}>
                {formatCurrency(item.amount)}
            </p>
        </li>
    );
};

export default ActivityFeedItem;