import React from 'react';

const Select = React.forwardRef(({ children, ...props }, ref) => {
    return (
        <select
            ref={ref}
            className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...props}
        >
            {children}
        </select>
    );
});

export default Select;