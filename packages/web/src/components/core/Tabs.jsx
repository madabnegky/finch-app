import React from 'react';

export const Tab = ({ label, children }) => {
    // The Tab component now only needs to provide the label and its content.
    // The active state and click handling are managed by the parent Tabs component.
    return <div data-label={label}>{children}</div>;
};

const Tabs = ({ children, activeIndex, onTabClick }) => {
    const tabs = React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
            const { label } = child.props;
            return (
                <button
                    key={index}
                    onClick={() => onTabClick(index)}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                        activeIndex === index
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    {label}
                </button>
            );
        }
        return null;
    });

    // Find the content of the currently active tab
    const activeContent = React.Children.toArray(children)[activeIndex]?.props.children;

    return (
        <div>
            <div className="flex space-x-2 border-b border-slate-200 mb-6">
                {tabs}
            </div>
            <div>{activeContent}</div>
        </div>
    );
};

export default Tabs;