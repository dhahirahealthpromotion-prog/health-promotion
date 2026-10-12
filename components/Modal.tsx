import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  hideDefaultCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, hideDefaultCloseButton = false }) => {
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" 
      aria-modal="true" 
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-lg text-right max-h-[90dvh] overflow-y-auto border border-gray-100 dark:border-gray-700" 
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-2.5 mb-3.5 dark:border-gray-700">
          <h3 className="text-base sm:text-xl font-black text-blue-800 dark:text-blue-400 leading-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl p-1"
            aria-label="إغلاق"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-gray-700 dark:text-gray-200 text-xs sm:text-sm leading-relaxed">
          {children}
        </div>
        {!hideDefaultCloseButton && (
            <div className="flex justify-end mt-4 sm:mt-6 pt-3 border-t dark:border-gray-700">
                <button
                    onClick={onClose}
                    className="px-5 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-xs sm:text-sm font-bold dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 min-h-[38px]"
                >
                    إغلاق
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
