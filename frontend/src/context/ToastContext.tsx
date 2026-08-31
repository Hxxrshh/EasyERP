import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, message, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const success = (message: string, title?: string) => showToast(message, 'success', title);
  const error = (message: string, title?: string) => showToast(message, 'error', title);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}
      {/* Toast Notification Container Overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          const Icon = toast.type === 'error' ? AlertTriangle : toast.type === 'info' ? Info : CheckCircle;
          const bgColors = toast.type === 'error'
            ? 'bg-rose-900 border-rose-700 text-rose-100'
            : toast.type === 'info'
            ? 'bg-blue-900 border-blue-700 text-blue-100'
            : 'bg-slate-900 border-emerald-500/50 text-white';

          const iconColor = toast.type === 'error' ? 'text-rose-400' : toast.type === 'info' ? 'text-blue-400' : 'text-emerald-400';

          return (
            <div
              key={toast.id}
              className={`p-3.5 rounded-xl border shadow-2xl flex items-start space-x-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-2 ${bgColors}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <div className="font-bold text-xs leading-tight mb-0.5">{toast.title}</div>}
                <div className="text-xs font-medium leading-normal">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-slate-400 hover:text-white rounded shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
