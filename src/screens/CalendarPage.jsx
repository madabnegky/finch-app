import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../utils/currency';
import { toDateInputString } from '../utils/date';
import { IconChevronLeft, IconChevronRight, IconArrowUpCircle, IconArrowDownCircle } from '../components/core/Icon';

const CalendarTooltip = ({ transactions, position }) => (
    <div
        className="fixed z-50 bg-slate-800 text-white text-xs rounded-lg shadow-lg p-3 w-max max-w-xs transition-opacity duration-200"
        style={{
            left: `${position.x}px`,
            top: `${position.y + 8}px`,
            transform: 'translateX(-50%)'
        }}
    >
        <ul className="space-y-1">
            {transactions.map((t, i) => (
                <li key={i} className="flex justify-between gap-4">
                    <span>{t.description}</span>
                    <span className={`font-semibold ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(t.amount)}
                    </span>
                </li>
            ))}
        </ul>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-800"></div>
    </div>
);

const CalendarView = ({ projections }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState(null);
    const [hoveredInfo, setHoveredInfo] = useState(null);

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const projectionsByDate = useMemo(() => new Map(projections.map(p => [toDateInputString(p.date), p])), [projections]);

    const handleHover = (e, projection, type) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const transactions = projection.transactionsToday.filter(t =>
            type === 'income' ? t.amount > 0 : t.amount < 0
        );
        if (transactions.length > 0) {
            setHoveredInfo({
                transactions,
                position: {
                    x: rect.left + rect.width / 2,
                    y: rect.bottom,
                },
            });
        }
    };

    const handleMouseLeave = () => {
        setHoveredInfo(null);
    };

    const calendarDays = [];
    for (let i = 0; i < startingDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="border-r border-b border-slate-100"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const dateKey = toDateInputString(date);
        const projection = projectionsByDate.get(dateKey);

        const hasIncome = projection?.transactionsToday.some(t => t.amount > 0);
        const hasExpenses = projection?.transactionsToday.some(t => t.amount < 0);
        const isSelected = selectedDay && toDateInputString(selectedDay.date) === dateKey;

        calendarDays.push(
            <div key={i} onClick={() => setSelectedDay(projection)} className={`border-r border-b border-slate-100 p-2 min-h-[7rem] flex flex-col justify-between cursor-pointer hover:bg-indigo-50 transition-colors ${isSelected ? 'bg-indigo-100' : ''}`}>
                <span className="font-semibold self-end text-sm text-slate-600">{i}</span>
                <div className="flex-grow flex flex-col justify-end">
                    {projection && (
                        <div className="flex items-center justify-start gap-1 -ml-1">
                            {hasIncome &&
                                <div onMouseEnter={(e) => handleHover(e, projection, 'income')} onMouseLeave={handleMouseLeave}>
                                    <IconArrowUpCircle className="w-4 h-4 text-green-500" />
                                </div>
                            }
                            {hasExpenses &&
                                <div onMouseEnter={(e) => handleHover(e, projection, 'expense')} onMouseLeave={handleMouseLeave}>
                                    <IconArrowDownCircle className="w-4 h-4 text-red-500" />
                                </div>
                            }
                        </div>
                    )}
                    {projection && (
                        <span className={`font-bold text-sm mt-1 ${projection.totalBalance < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                            {formatCurrency(projection.totalBalance)}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    const changeMonth = (delta) => {
        const newDate = new Date(currentYear, currentMonth + delta, 1);
        setCurrentMonth(newDate.getMonth());
        setCurrentYear(newDate.getFullYear());
        setSelectedDay(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100"><IconChevronLeft /></button>
                <h3 className="font-bold text-xl">{new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100"><IconChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 border-t border-l border-slate-100 rounded-lg overflow-hidden">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-center font-bold text-xs p-2 border-r border-b border-slate-100 bg-slate-50 text-slate-500 uppercase">{day}</div>)}
                {calendarDays}
            </div>
            {hoveredInfo && <CalendarTooltip transactions={hoveredInfo.transactions} position={hoveredInfo.position} />}
            {selectedDay && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-bold text-slate-800">Details for {selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                    <p className="text-sm">Projected total balance: <span className="font-bold">{formatCurrency(selectedDay.totalBalance)}</span></p>
                    <h5 className="font-semibold mt-2 text-sm text-slate-600">Scheduled Transactions:</h5>
                    {selectedDay.transactionsToday.length > 0 ? (
                        <ul className="mt-1 text-sm space-y-1">
                            {selectedDay.transactionsToday.map((t, i) => (
                                <li key={i} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm">
                                    <span className="font-medium text-slate-700">{t.description}</span>
                                    <span className={`font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(t.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-500 mt-1">No transactions scheduled for this day.</p>}
                </div>
            )}
        </div>
    );
};

const CalendarPage = ({ projections, accounts, selectedAccountId, setSelectedAccountId }) => (
    <div className="p-6 bg-white rounded-xl shadow-md border border-slate-200">
        <div className="mb-6 max-w-sm">
            <label htmlFor="account-select" className="block text-sm font-bold text-slate-700 mb-1">View Calendar For:</label>
            <select
                id="account-select"
                name="account"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
            >
                <option value="all">All Accounts</option>
                {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                ))}
            </select>
        </div>
        <CalendarView projections={projections} />
    </div>
);

export default CalendarPage;