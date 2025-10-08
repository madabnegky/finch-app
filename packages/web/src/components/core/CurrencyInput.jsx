import React from 'react';
import Input from './Input';

const CurrencyInput = React.forwardRef((props, ref) => {
    return (
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <Input
                ref={ref}
                type="number"
                step="0.01"
                className="pl-7" // Add padding to make space for the "$"
                placeholder="0.00" // A more currency-like placeholder
                {...props}
            />
        </div>
    );
});

export default CurrencyInput;