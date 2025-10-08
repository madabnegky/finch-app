import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '@shared/utils/currency';
import { formatDate } from '@shared/utils/date';

// Custom Tooltip for a cleaner look
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const balance = payload[0].value;
        return (
            <div className="p-3 bg-slate-700 text-white rounded-lg shadow-lg">
                <p className="font-bold">{label}</p>
                <p className={`text-sm ${balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    Balance: {formatCurrency(balance)}
                </p>
            </div>
        );
    }
    return null;
};

// Custom Y-Axis tick formatter to abbreviate large numbers
const formatYAxisTick = (value) => {
    if (value >= 1000000) return `${formatCurrency(value / 1000000)}M`;
    if (value >= 1000) return `${formatCurrency(value / 1000)}k`;
    return formatCurrency(value);
};

const CashFlowChart = ({ projections }) => {
    if (!projections || projections.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
                <p className="text-slate-500">Not enough data to display chart.</p>
            </div>
        );
    }

    const chartData = projections.map(p => ({
        date: formatDate(p.date, 'MMM d'),
        balance: p.balance,
    }));
    
    // Find the point where the balance crosses zero
    const zeroCross = chartData.findIndex(p => p.balance < 0);
    const gradientOffset = zeroCross !== -1 ? (zeroCross / chartData.length) : 1;

    return (
        <ResponsiveContainer width="100%" height={250}>
            <AreaChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
                <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset={0} stopColor="#398272" stopOpacity={0.4}/>
                        <stop offset={gradientOffset} stopColor="#398272" stopOpacity={0.4}/>
                        <stop offset={gradientOffset} stopColor="#EF4444" stopOpacity={0.4}/>
                        <stop offset={1} stopColor="#EF4444" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis 
                    tickFormatter={formatYAxisTick} 
                    tick={{ fontSize: 12 }} 
                    domain={['dataMin - 100', 'dataMax + 100']}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#398272" 
                    strokeWidth={2} 
                    fill="url(#balanceGradient)" 
                    dot={false}
                    activeDot={{ r: 5, stroke: '#2a6155' }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default CashFlowChart;