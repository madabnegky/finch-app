import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@shared/utils/currency';
import { formatDate } from '@shared/utils/date';

const CashFlowChart = ({ projections }) => {
    if (!projections || projections.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-gray-500">Not enough data to display chart.</p>
            </div>
        );
    }
    
    // --- THIS IS THE FIX ---
    // The date object `p.date` is already a JS Date, so we don't need to call `.toDate()`.
    const chartData = projections.map(p => ({
        date: formatDate(p.date, 'MMM d'),
        balance: p.balance,
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrency(value, true)} />
                <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Balance']}
                    labelStyle={{ color: '#333' }}
                    itemStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="balance" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default CashFlowChart;