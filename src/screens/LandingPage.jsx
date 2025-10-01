import React from 'react';
import { FinchLogo } from '../components/core/Icon';
import AnimatedPreview from '../components/auth/AnimatedPreview';

const LandingPage = ({ onSignIn, onCreateAccount, onAnonymousSignIn }) => {
  return (
    <div className="bg-slate-100 min-h-screen">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FinchLogo className="w-8 h-8" />
          <span className="font-bold text-xl text-slate-800">Finch</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onSignIn} className="font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
            Sign In
          </button>
          <button onClick={onCreateAccount} className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg shadow-sm hover:bg-indigo-700 transition-all">
            Create an Account
          </button>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center min-h-screen pt-24 pb-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tighter">
            Your cash flow, crystal clear.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Finch isn't just another budgeting app. It's a forward-looking tool that calculates your true "Available to Spend," so you can make smarter financial decisions with confidence.
          </p>
          <div className="mt-8">
            <button onClick={onAnonymousSignIn} className="text-lg font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              Give it a try &rarr;
            </button>
          </div>
        </div>

        <div className="mt-12 w-full max-w-4xl">
          <AnimatedPreview />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;