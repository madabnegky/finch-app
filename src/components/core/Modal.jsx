import React from 'react';
import { IconX } from './Icon';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl shadow-md border border-slate-200 w-full max-w-lg">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <IconX />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        
        {footer && (
          <div className="p-6 bg-slate-50 rounded-b-xl flex justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;