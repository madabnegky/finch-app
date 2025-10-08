import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@shared/utils/currency'; // Changed import
import { IconBank, IconKey, IconShieldCheck, IconCheckCircle, IconUtensils, IconAlertTriangle, IconCalendarDays } from '../core/Icon';

const AnimatedCharacter = ({ mood }) => (
    <div className="relative w-24 h-24">
        {/* Head */}
        <div className="w-16 h-16 bg-slate-200 rounded-full absolute top-0 left-4"></div>
        {/* Body */}
        <div className="w-24 h-12 bg-slate-200 rounded-t-full absolute bottom-0 left-0"></div>
        {/* Eyes */}
        <div className="w-2 h-2 bg-slate-800 rounded-full absolute top-6 left-8"></div>
        <div className="w-2 h-2 bg-slate-800 rounded-full absolute top-6 right-8"></div>
        {/* Mouth */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-6 h-3 border-b-4 border-slate-800 rounded-b-full" style={{ opacity: mood === 'happy' ? 1 : 0, transition: 'opacity 0.2s' }}></div>
        <div className="absolute top-11 left-1/2 -translate-x-1/2 w-6 h-1 bg-slate-800" style={{ opacity: mood === 'worried' ? 1 : 0, transition: 'opacity 0.2s' }}></div>
        {/* Exclamation */}
        <div className="absolute -top-2 right-2 text-3xl font-bold text-red-500 transition-all duration-200" style={{ opacity: mood === 'worried' ? 1 : 0, transform: mood === 'worried' ? 'scale(1)' : 'scale(0.5)' }}>!</div>
    </div>
);

const AnimatedPreview = () => {
    const [scene, setScene] = useState(0);

    const scenes = [
        { id: 'start', duration: 2500 },
        { id: 'connecting', duration: 2200 },
        { id: 'calculation', duration: 4000 },
        { id: 'contemplating', duration: 3000 },
        { id: 'warning', duration: 4000 },
        { id: 'decision', duration: 2500 },
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setScene(prev => (prev + 1) % scenes.length);
        }, scenes[scene]?.duration);
        return () => clearTimeout(timer);
    }, [scene]);

    const characterMood = scene >= 4 ? 'worried' : 'happy';

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-md border border-slate-200 relative overflow-hidden min-h-[550px] font-sans">
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes progress-bar { from { width: 0%; } to { width: 100%; } }
                @keyframes icon-pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes highlight-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); } 50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } }
                @keyframes cross-out { from { width: 0%; } to { width: 100%; } }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; opacity: 0; }
                .animate-progress-bar { animation: progress-bar 1s ease-in-out forwards; }
                .animate-icon-pop { animation: icon-pop 0.4s ease-out forwards; }
                .animate-highlight-pulse { animation: highlight-pulse 1.5s ease-out infinite; }
                .animate-cross-out { animation: cross-out 0.3s ease-in-out forwards; }
            `}</style>
            
            {/* --- Static Title --- */}
            <div className="absolute top-6 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Make smarter decisions with Finch.</h2>
                <p className="text-sm text-slate-500 mt-1">See your true cash flow, before you spend.</p>
            </div>

            {/* --- Animated Character --- */}
            <div className={`absolute bottom-0 left-8 transition-opacity duration-500 ${scene >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                <AnimatedCharacter mood={characterMood} />
            </div>

            {/* --- Thought Bubble --- */}
            <div className={`absolute bottom-32 left-32 transition-all duration-300 ${scene === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                <div className="relative w-48 p-3 bg-slate-100 rounded-lg shadow-md">
                    <p className="font-semibold text-sm">Dinner Out Tonight?</p>
                    <div className="flex items-center gap-2"><IconUtensils className="w-4 h-4" /><span>{formatCurrency(-65.00)}</span></div>
                    <div className="absolute bottom-0 left-2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-slate-100 transform rotate-45"></div>
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="absolute inset-0 flex items-center justify-center">

                {/* --- SCENE 0: START --- */}
                <div className={`text-center transition-opacity duration-300 ${scene === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <button className="flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md">
                        <IconBank /> Connect Your Bank
                    </button>
                </div>

                {/* --- SCENE 1: CONNECTING --- */}
                <div className={`transition-opacity duration-300 ${scene === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="w-64 p-6 bg-white rounded-lg shadow-lg text-center">
                        <h3 className="font-semibold text-slate-700">Securely Syncing...</h3>
                        <div className="flex justify-around items-center my-4 text-slate-400">
                            <IconKey className="w-8 h-8 animate-icon-pop" style={{animationDelay: '100ms'}} />
                            <IconShieldCheck className="w-8 h-8 animate-icon-pop" style={{animationDelay: '300ms'}} />
                            <IconCheckCircle className="w-8 h-8 text-green-500 animate-icon-pop" style={{animationDelay: '500ms'}} />
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden"><div className="bg-indigo-500 h-2 rounded-full animate-progress-bar"></div></div>
                    </div>
                </div>

                {/* --- UI Card (Scenes 2+) --- */}
                <div className={`w-96 transition-all duration-500 ${scene >= 2 ? 'opacity-100' : 'opacity-0'} ${scene === 5 ? '-translate-x-32' : 'translate-x-16'}`}>
                    <div className="p-6 bg-white rounded-xl shadow-lg border">
                        <p className="text-sm font-bold text-slate-500">Your Checking Account</p>
                        
                        {/* Calculation Scene */}
                        <div className={`transition-opacity duration-300 ${scene === 2 ? 'opacity-100' : 'opacity-0 h-0'}`}>
                            <p className="text-lg mt-4">Current Balance:</p>
                            <p className="text-5xl font-bold">{formatCurrency(877.50)}</p>
                            <p className="text-slate-500 text-xs animate-fade-in" style={{animationDelay:'500ms'}}>+ Auto-detected bills & income</p>
                        </div>
                        
                        {/* "What If" Scene */}
                        <div className={`text-center transition-opacity duration-300 ${scene >= 3 ? 'opacity-100' : 'opacity-0 h-0'}`}>
                            <p className="text-sm text-slate-500 font-semibold">Available to Spend</p>
                            <p className="text-5xl font-bold text-indigo-600">{formatCurrency(77.50)}</p>
                            
                            <div className={`mt-4 p-3 bg-slate-50 rounded-lg transition-all duration-300 relative ${scene >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                                <p className="text-sm font-semibold">"What if I go to dinner?"</p>
                                <p className="text-2xl font-bold text-red-600"> {formatCurrency(12.50)}</p>
                                <div className={`absolute top-1/2 left-2 w-[90%] h-0.5 bg-red-500 origin-left transition-all ${scene === 5 ? 'animate-cross-out' : ''}`} style={{transform: 'rotate(-3deg)'}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendar View */}
                <div className={`w-80 absolute top-1/2 -translate-y-1/2 transition-all duration-500 ${scene >= 5 ? 'opacity-100 right-16' : 'opacity-0 right-0'}`}>
                    <div className="p-4 bg-white rounded-xl shadow-lg border">
                        <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800"><IconCalendarDays /> Next 3 Days</h3>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                             <div className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200">
                                <p className="font-bold text-xs">Oct 28</p>
                                <p className="text-xs">Car Insurance</p>
                                <p className="text-xs font-bold">{formatCurrency(-200)}</p>
                            </div>
                            <div className={`p-2 rounded-lg bg-red-100 text-red-800 border-2 border-red-400 transition-all ${scene >= 5 ? 'animate-highlight-pulse' : ''}`}>
                                <p className="font-bold text-xs">Oct 29</p>
                                <IconAlertTriangle className="w-5 h-5 mx-auto my-1"/>
                                <p className="text-xs font-bold">Low Balance!</p>
                            </div>
                            <div className="p-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                                <p className="font-bold text-xs">Oct 30</p>
                                <p className="text-xs">Paycheck</p>
                                <p className="text-xs font-bold">{formatCurrency(1200)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimatedPreview;