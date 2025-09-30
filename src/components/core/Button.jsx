import React from 'react';

const Button = ({ onClick, children, className = '', type = 'button', disabled = false }) => {
  const baseClasses = 'font-bold py-2 px-5 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Example of how you might handle different variants if needed in the future
  const primaryClasses = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-slate-400';
  const secondaryClasses = 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500 disabled:bg-slate-200';

  // For this app, we'll just combine, but you could add a `variant` prop
  const combinedClasses = `${baseClasses} ${primaryClasses} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={combinedClasses}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;