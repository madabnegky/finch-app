import React from 'react';
import { formatCurrency } from "@shared/utils/currency";
import { IconCreditCard, IconPlayCircle } from '@/components/core/Icon';

const StaticPreview = () => {
    const transactions = [
        {
            id: 1,
            description: 'Netflix Subscription',
            amount: -15.99,
            date: '2023-10-02',
            category: 'entertainment',
        },
        {
            id: 2,
            description: 'Salary',
            amount: 2500,
            date: '2023-10-01',
            category: 'income',
        },
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                    Recent Activity
                </h3>
                <span className="text-sm font-medium text-blue-600">View All</span>
            </div>
            <div className="space-y-4">
                {transactions.map((t) => (
                    <div key={t.id} className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-full mr-4">
                            {t.category === 'entertainment' ? (
                                <IconPlayCircle className="h-6 w-6 text-gray-500" />
                            ) : (
                                <IconCreditCard className="h-6 w-6 text-gray-500" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {t.description}
                            </p>
                            <p className="text-xs text-gray-500">{t.date}</p>
                        </div>
                        <span
                            className={`text-sm font-semibold ${t.amount < 0 ? 'text-gray-700' : 'text-green-600'
                                }`}
                        >
                            {formatCurrency(t.amount)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaticPreview;