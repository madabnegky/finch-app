import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../api/firebase';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/currency';
import { getNextDate } from '../utils/date';

const BudgetCategoryItem = ({ category, Icon, color, spent, budget, onBudgetChange }) => {
    const [inputValue, setInputValue] = useState(budget);

    useEffect(() => {
        setInputValue(budget);
    }, [budget]);

    const handleBlur = () => {
        onBudgetChange(category, inputValue);
    };

    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const remaining = budget - spent;

    let progressBarColor = 'bg-green-500';
    if (percentage > 75) progressBarColor = 'bg-yellow-500';
    if (percentage >= 100) progressBarColor = 'bg-red-500';

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-1/3 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center bg-slate-100 ${color}`}>
                    <Icon />
                </div>
                <span className="font-bold text-lg">{category}</span>
            </div>
            <div className="w-full sm:w-2/3">
                <div className="flex justify-between items-center text-sm mb-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-500">Spent:</span>
                        <span className="font-semibold">{formatCurrency(spent)}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-slate-500">Budget:</span>
                        <input
                            type="number"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onBlur={handleBlur}
                            placeholder="0.00"
                            className="w-24 text-right font-semibold bg-slate-100 rounded-md border-transparent focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-4">
                    <div className={`${progressBarColor} h-4 rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <div className="text-right text-sm mt-1 font-semibold">
                    {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over`}
                </div>
            </div>
        </div>
    );
};


const BudgetPage = ({ transactions, budgets, userId }) => {
    const [currentBudgets, setCurrentBudgets] = useState(budgets || {});

    const monthlyExpenses = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const oneTimeExpenses = transactions.filter(t => t.type === 'expense' && !t.isRecurring && t.date >= startOfMonth && t.date <= endOfMonth);
        
        const recurringInstances = transactions
            .filter(t => t.isRecurring && t.type === 'expense')
            .flatMap(t => {
                const instances = [];
                if (!t.recurringDetails || !t.recurringDetails.nextDate) return [];
                let cursorDate = new Date(t.recurringDetails.nextDate);
                while (cursorDate < startOfMonth) {
                    cursorDate = getNextDate(cursorDate, t.recurringDetails.frequency);
                }
                while (cursorDate <= endOfMonth) {
                    instances.push({ ...t, date: new Date(cursorDate) });
                    cursorDate = getNextDate(cursorDate, t.recurringDetails.frequency);
                }
                return instances;
            });
        
        const allExpenses = [...oneTimeExpenses, ...recurringInstances];

        return allExpenses.reduce((acc, curr) => {
            const category = curr.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + Math.abs(curr.amount);
            return acc;
        }, {});

    }, [transactions]);
    
    const handleBudgetChange = async (category, amount) => {
        const newBudgets = { ...currentBudgets, [category]: parseFloat(amount) || 0 };
        setCurrentBudgets(newBudgets);
        
        const now = new Date();
        const budgetId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const budgetRef = doc(db, `artifacts/${appId}/users/${userId}/budgets`, budgetId);
        await setDoc(budgetRef, { [category]: parseFloat(amount) || 0 }, { merge: true });
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
            <div className="space-y-6">
                {Object.entries(CATEGORIES).filter(([key]) => key !== 'Uncategorized').map(([category, { icon: Icon, color }]) => (
                    <BudgetCategoryItem
                        key={category}
                        category={category}
                        Icon={Icon}
                        color={color}
                        spent={monthlyExpenses[category] || 0}
                        budget={currentBudgets[category] || 0}
                        onBudgetChange={handleBudgetChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default BudgetPage;