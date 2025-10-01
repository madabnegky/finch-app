import React from 'react';
import { FinchLogo } from '../components/core/Icon';
import AnimatedPreview from '../components/auth/AnimatedPreview';

const LandingPage = ({ onSignIn, onCreateAccount, onAnonymousSignIn }) => {
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="absolute top-0 left-0 right-0 p-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FinchLogo className="w-8 h-8" />
                        <h1 className="text-2xl font-bold text-slate-800">finch</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onSignIn} className="font-semibold text-slate-600 hover:text-indigo-600">Sign In</button>
                        <button onClick={onCreateAccount} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-700">Create Account</button>
                    </div>
                </div>
            </header>

            <main className="pt-32 pb-16">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6">
                    <div className="text-center lg:text-left">
                        <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
                            Finally, see your <span className="text-indigo-600">true</span> cash flow.
                        </h1>
                        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
                            Finch automatically detects your bills and income to show you what's safe to spend, so you can make financial decisions with confidence.
                        </p>
                        <div className="mt-8 flex items-center justify-center lg:justify-start">
                            <button 
                                onClick={onAnonymousSignIn}
                                className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 text-lg"
                            >
                                Give it a try &rarr;
                            </button>
                        </div>
                    </div>
                    <div>
                        <AnimatedPreview />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;