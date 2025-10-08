import React from 'react';

// --- START FIX ---
// Add {...props} to accept and pass through any additional attributes like 'form'
const Button = ({ onClick, children, className = '', type = 'button', disabled = false, ...props }) => {
// --- END FIX ---
  const baseClasses = 'font-bold py-2 px-5 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const primaryClasses = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-slate-400';
  const secondaryClasses = 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500 disabled:bg-slate-200';

  const combinedClasses = `${baseClasses} ${primaryClasses} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={combinedClasses}
      disabled={disabled}
      {...props} // And apply them here
    >
      {children}
    </button>
  );
};

export default Button;