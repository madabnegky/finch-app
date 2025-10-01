import React, { useState } from 'react';

const Tooltip = ({ text, children }) => {
    const [show, setShow] = useState(false);
    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg z-10 transition-opacity duration-300">
                    {text}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;