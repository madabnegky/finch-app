import React from 'react';
import { IconX } from './Icon';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      {/* Updated to use our new finch-gray colors */}
      <div className="bg-white rounded-xl shadow-md border border-finch-gray-200 w-full max-w-lg">
        <div className="p-6 border-b border-finch-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-finch-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-finch-gray-400 hover:text-finch-gray-700">
            <IconX />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        
        {footer && (
          <div className="p-6 bg-finch-gray-50 rounded-b-xl flex justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;