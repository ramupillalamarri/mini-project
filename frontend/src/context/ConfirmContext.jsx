import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
    isDanger: false
  });

  const confirm = useCallback((message, options = {}) => {
    const { title = 'Confirm Action', isDanger = true } = options;
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message,
        resolve,
        isDanger
      });
    });
  }, []);

  const handleCancel = () => {
    if (state.resolve) state.resolve(false);
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (state.resolve) state.resolve(true);
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />

            {/* Popup Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 pointer-events-auto"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl flex-shrink-0 ${
                  state.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'
                }`}>
                  {state.isDanger ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                    {state.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500 leading-relaxed">
                    {state.message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 font-semibold rounded-xl text-sm text-white shadow-lg transition-all ${
                    state.isDanger 
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' 
                      : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/10'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
