import React, { useMemo } from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { IconCalendarDays } from '../core/Icon';
import { startOfDay } from 'date-fns';

const UpcomingBills = ({ transactions }) => {
    const upcomingBills = useMemo(() => {
        const today = startOfDay(new Date());

        // The transactions prop now contains all generated instances.
        // We filter for instances of recurring transactions that are expenses and are upcoming.
        return transactions
            .filter(t => t.isInstance && t.type === 'expense' && t.date >= today)
            .sort((a, b) => a.date - b.date)
            .slice(0, 4);
    }, [transactions]);

    const formatDate = (date) => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const aWeekFromNow = new Date(today);
        aWeekFromNow.setDate(aWeekFromNow.getDate() + 7);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
        if (date > today && date <= aWeekFromNow) {
            return date.toLocaleDateString('en-US', { weekday: 'long' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-finch-gray-200 h-full">
            <h3 className="text-xl font-bold text-finch-gray-800 mb-4 flex items-center gap-2">
                <IconCalendarDays className="w-6 h-6" /> Upcoming Bills
            </h3>
            {upcomingBills.length > 0 ? (
                <ul className="space-y-3">
                    {upcomingBills.map(bill => (
                        <li key={bill.instanceId} className="flex items-center justify-between p-3 bg-finch-gray-50 rounded-lg">
                            <div>
                                <p className="font-semibold text-finch-gray-800">{bill.description}</p>
                                <p className="text-sm text-finch-gray-500">{formatDate(bill.date)}</p>
                            </div>
                            <p className="font-bold text-lg text-finch-gray-800">
                                {formatCurrency(Math.abs(bill.amount))}
                            </p>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-10 text-finch-gray-500">
                    <p>No upcoming recurring bills found.</p>
                </div>
            )}
        </div>
    );
};

export default UpcomingBills;