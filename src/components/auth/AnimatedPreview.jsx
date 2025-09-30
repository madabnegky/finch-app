import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/currency';
import { IconCreditCard, IconDollarSign, IconCar, IconUtensils, IconShoppingBasket } from '../core/Icon';

const AnimatedPreview = () => {
    const [step, setStep] = useState(0);
    const [balance, setBalance] = useState(2450.75);
    const [available, setAvailable] = useState(1250.75);

    const steps = [
        { type: 'income', description: 'Paycheck', amount: 1800.00, icon: IconDollarSign, color: 'text-green-500' },
        { type: 'expense', description: 'Groceries', amount: -85.50, icon: IconShoppingBasket, color: 'text-green-600' },
        { type: 'expense', description: 'Gas', amount: -45.00, icon: IconCar, color: 'text-purple-600' },
        { type: 'expense', description: 'Dinner Out', amount: -62.30, icon: IconUtensils, color: 'text-orange-600' },
        { type: 'reset' }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % steps.length);
        }, 3000); // Change step every 3 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const currentStep = steps[step];
        if(!currentStep) return;

        if (currentStep.type === 'reset') {
            setBalance(2450.75);
            setAvailable(1250.75);
        } else {
            setBalance(prev => prev + currentStep.amount);
            if (currentStep.type === 'expense') {
                setAvailable(prev => prev + currentStep.amount);
            }
        }
    }, [step]);

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md border border-slate-200 relative aspect-[4/3] overflow-hidden">
            <div className="absolute top-8 text-center px-4">
                <h2 className="text-2xl font-bold text-slate-800">See Finch in Action</h2>
                <p className="text-sm text-slate-500 mt-1">See your true cash flow. Finch calculates your balance <em>after</em> future bills are paid, so you always know what's really available.</p>
            </div>

            {/* Floating transaction items - Rendered first to be on the bottom layer */}
            {steps.map((s, index) => {
                if (s.type === 'reset') return null;
                const Icon = s.icon;
                const isActive = step === index;
                const isExiting = step === (index + 1) % steps.length;

                let transformClass = 'translate-y-8 opacity-0';
                if (isActive) transformClass = 'translate-y-0 opacity-100';
                if (isExiting) transformClass = '-translate-y-8 opacity-0';

                let positionClass = 'top-28 left-8'; // Default
                if (s.type === 'income') {
                    positionClass = 'bottom-28 right-8';
                } else {
                    if (s.description === 'Gas') positionClass = 'top-40 right-12';
                    if (s.description === 'Dinner Out') positionClass = 'bottom-40 left-12';
                }

                return (
                    <div key={index} className={`absolute flex items-center gap-3 bg-slate-50/90 p-3 rounded-lg shadow-lg transition-all duration-700 ease-in-out ${transformClass} ${positionClass}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white ${s.color}`}>
                            <Icon />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{s.description}</p>
                            <p className={`text-sm font-bold ${s.type === 'income' ? 'text-green-600' : 'text-slate-700'}`}>
                                {s.type === 'income' ? '+' : '−'}{formatCurrency(Math.abs(s.amount))}
                            </p>
                        </div>
                    </div>
                );
            })}

            {/* The main card being animated - Rendered last to be on the top layer */}
            <div className="bg-white rounded-xl shadow-lg p-6 border w-80 relative transition-all">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Your Checking</h3>
                        <p className="text-sm text-slate-500">Chase Bank</p>
                    </div>
                    <IconCreditCard className="text-slate-400" />
                </div>
                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500">Available to Spend</p>
                    <p className="text-4xl font-bold tracking-tight text-slate-900 transition-colors duration-500">
                        {formatCurrency(available)}
                    </p>
                </div>
                <div className="mt-6 flex justify-between text-center border-t pt-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
                        <p className="font-semibold text-slate-800 mt-1 transition-colors duration-500">{formatCurrency(balance)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Cushion</p>
                        <p className="font-semibold text-slate-800 mt-1">{formatCurrency(200)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimatedPreview;