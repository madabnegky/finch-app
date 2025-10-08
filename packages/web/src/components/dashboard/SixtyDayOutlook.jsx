import React, { useMemo } from 'react';
import { formatCurrency } from '@shared/utils/currency';
import { IconArrowDownCircle, IconArrowUpCircle, IconInfo } from '../core/Icon';
import Tooltip from '../core/Tooltip';
import { startOfToday, addDays } from 'date-fns';

const SixtyDayOutlook = ({ projections, accounts, goals }) => {
    const outlook = useMemo(() => {
        if (!projections || projections.length === 0 || !accounts || accounts.length === 0) {
            return { projectedLow: 0, currentBalance: 0, projectedHigh: 0 };
        }

        const today = startOfToday();
        const sixtyDaysFromNow = addDays(today, 60);

        let projectedLow = Infinity;
        let projectedHigh = -Infinity;
        let currentBalance = 0;

        const dailyTotals = {};
        projections.forEach(({ projections: accountProjections }) => {
            accountProjections.forEach(dayProjection => {
                const dateKey = dayProjection.date.toISOString().split('T')[0];
                if (!dailyTotals[dateKey]) {
                    dailyTotals[dateKey] = { date: dayProjection.date, balance: 0 };
                }
                dailyTotals[dateKey].balance += dayProjection.balance;
            });
        });

        const sortedProjections = Object.values(dailyTotals).sort((a, b) => a.date - b.date);
        
        const firstDayProjection = sortedProjections[0];
        if(firstDayProjection) {
            currentBalance = firstDayProjection.balance;
        }

        const sixtyDayProjections = sortedProjections.filter(p => p.date >= today && p.date <= sixtyDaysFromNow);
        if (sixtyDayProjections.length > 0) {
            projectedLow = Math.min(...sixtyDayProjections.map(p => p.balance));
            projectedHigh = Math.max(...sixtyDayProjections.map(p => p.balance));
        } else {
            projectedLow = currentBalance;
            projectedHigh = currentBalance;
        }

        return { projectedLow, currentBalance, projectedHigh };

    }, [projections, accounts, goals]);

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-finch-gray-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-finch-gray-800">
                    60-Day Outlook
                </h3>
                <Tooltip text="This is an aggregated view across all of your accounts.">
                    <div className="flex items-center gap-1 text-sm text-finch-gray-500 cursor-default">
                        <IconInfo className="w-4 h-4" />
                        <span>All Accounts</span>
                    </div>
                </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-sm text-finch-gray-500 flex items-center justify-center gap-1"><IconArrowUpCircle className="w-4 h-4" /> Current Balance</p>
                    <p className="font-bold text-2xl text-finch-gray-800 mt-1">{formatCurrency(outlook.currentBalance)}</p>
                </div>
                <div>
                    <p className="text-sm text-finch-gray-500 flex items-center justify-center gap-1"><IconArrowDownCircle className="w-4 h-4" /> Projected Low</p>
                    <p className={`font-bold text-2xl mt-1 ${outlook.projectedLow < 0 ? 'text-red-600' : 'text-finch-gray-800'}`}>
                        {formatCurrency(outlook.projectedLow)}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-finch-gray-500 flex items-center justify-center gap-1"><IconArrowUpCircle className="w-4 h-4" /> Projected High</p>
                    <p className={`font-bold text-2xl mt-1 text-finch-teal-700`}>
                        {formatCurrency(outlook.projectedHigh)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SixtyDayOutlook;