import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc } from "firebase/firestore";
import api from '@shared/api/firebase';
import { useAuth } from '@shared/hooks/useAuth';
import Button from '../components/core/Button';
import Input from '../components/core/Input';
import Select from '../components/core/Select';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '@shared/utils/currency';

const BudgetPage = () => {
  const { user } = useAuth();
  const [budgets, loading, error] = useCollection(
    user ? collection(api.firestore, `users/${user.uid}/budgets`) : null
  );

  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!newBudgetCategory || !newBudgetLimit) {
      alert('Please select a category and enter a limit.');
      return;
    }
    try {
        const budgetsCollection = collection(api.firestore, `users/${user.uid}/budgets`);
        await addDoc(budgetsCollection, {
          category: newBudgetCategory,
          limit: parseFloat(newBudgetLimit),
          spent: 0, 
        });
        setNewBudgetCategory('');
        setNewBudgetLimit('');
    } catch (error) {
        console.error("Error adding budget:", error);
        alert(`Failed to add budget: ${error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const categoryOptions = Object.keys(CATEGORIES).map((c) => ({ value: c, label: c }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Budgets</h1>

      <div className="p-4 bg-white rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-2">Create New Budget</h2>
        <form onSubmit={handleAddBudget} className="flex items-end space-x-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <Select
              value={newBudgetCategory}
              onChange={(e) => setNewBudgetCategory(e.target.value)}
              className="mt-1"
            >
                <option value="">Select a category</option>
                {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Monthly Limit</label>
            <Input
              type="number"
              value={newBudgetLimit}
              onChange={(e) => setNewBudgetLimit(e.target.value)}
              placeholder="e.g., 500"
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="primary">
            Add Budget
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets &&
          budgets.docs.map((doc) => {
            const budget = doc.data();
            const percentageSpent = (budget.spent / budget.limit) * 100;
            return (
              <div key={doc.id} className="p-4 bg-white rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-semibold text-lg">{budget.category}</h2>
                    <span className="text-sm text-gray-600">
                        {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
         {!budgets?.docs.length && <p>You haven't created any budgets yet. Add one above to get started!</p>}
      </div>
    </div>
  );
};

export default BudgetPage;