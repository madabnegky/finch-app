import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '@shared/utils/currency';
import { CATEGORIES } from '../constants/categories';
import { useAppData } from './AppLayout'; // Import the context hook

const ReportsPage = () => {
    const { transactions } = useAppData();

    const monthlySpendingByCategory = useMemo(() => {
        if (!transactions) return [];
        const data = {};
        const today = new Date();
        const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

        for (let i = 0; i < 6; i++) {
            const date = new Date(Date.UTC(sixMonthsAgo.getUTCFullYear(), sixMonthsAgo.getUTCMonth() + i, 1));
            const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth()).padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'short' });
            data[monthKey] = { month: monthName };
        }

        const expenses = transactions.filter(t => t.type === 'expense');

        expenses.forEach(expense => {
            const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
            if (isNaN(expenseDate.getTime())) {
                return;
            }

            if (expenseDate >= sixMonthsAgo) {
                const monthKey = `${expenseDate.getUTCFullYear()}-${String(expenseDate.getUTCMonth()).padStart(2, '0')}`;
                if (data[monthKey]) {
                    const category = expense.category || 'Uncategorized';
                    const amount = Math.abs(expense.amount);
                    data[monthKey][category] = (data[monthKey][category] || 0) + amount;
                }
            }
        });

        return Object.values(data);
    }, [transactions]);

    const allCategories = useMemo(() => {
        if (!transactions) return [];
        const categorySet = new Set();
        transactions.forEach(t => {
            if (t.type === 'expense' && t.category) {
                categorySet.add(t.category);
            }
        });
        return Array.from(categorySet);
    }, [transactions]);

    const [selectedCategories, setSelectedCategories] = useState(() => {
        const totals = monthlySpendingByCategory.reduce((acc, monthData) => {
            Object.keys(monthData).forEach(key => {
                if (key !== 'month') {
                    acc[key] = (acc[key] || 0) + monthData[key];
                }
            });
            return acc;
        }, {});
        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([key]) => key);
    });

    const spendingData = useMemo(() => {
        if (!transactions) return [];
        const now = new Date();
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
        endOfMonth.setUTCHours(23, 59, 59, 999);

        const expenses = transactions.filter(t => {
            if (t.type !== 'expense') return false;
            if (t.isRecurring) return false;
            const txDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            if (isNaN(txDate.getTime())) {
                return false;
            }
            return txDate >= startOfMonth && txDate <= endOfMonth;
        });

        const spendingByCategory = expenses.reduce((acc, curr) => {
            const category = curr.category || 'Uncategorized';
            const amount = Math.abs(curr.amount);
            if (!acc[category]) {
                acc[category] = 0;
            }
            acc[category] += amount;
            return acc;
        }, {});
        
        return Object.entries(spendingByCategory).map(([name, value]) => ({ name, value }));

    }, [transactions]);


    const handleCategoryToggle = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const PIE_CHART_COLORS = ['#4F46E5', '#7C3AED', '#DB2777', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6366F1', '#A78BFA', '#F472B6', '#FBBF24', '#34D399', '#60A5FA', '#F87171'];
    const categoryColorMap = allCategories.reduce((acc, category, index) => {
        acc[category] = PIE_CHART_COLORS[index % PIE_CHART_COLORS.length];
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Spending by Category this Month</h2>
                <p className="text-slate-500 mb-6">A breakdown of your one-time spending for the current month.</p>
                {spendingData.length > 0 ? (
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={spendingData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={150}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                {`${(percent * 100).toFixed(0)}%`}
                                            </text>
                                        );
                                    }}
                                >
                                    {spendingData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={categoryColorMap[entry.name] || PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="text-center py-16 text-slate-500">
                        <p>No one-time spending data for the current month to display.</p>
                    </div>
                )}
            </div>

            <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Monthly Spending Trends</h2>
                <p className="text-slate-500 mb-6">Track how your spending in different categories changes over time.</p>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart data={monthlySpendingByCategory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => formatCurrency(value)} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            {selectedCategories.map(category => (
                                <Line key={category} type="monotone" dataKey={category} stroke={categoryColorMap[category]} strokeWidth={2} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    {allCategories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryToggle(category)}
                            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${selectedCategories.includes(category) ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            style={{ backgroundColor: selectedCategories.includes(category) ? categoryColorMap[category] : undefined }}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;