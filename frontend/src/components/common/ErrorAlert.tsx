import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorAlertProps {
  title?: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Error',
  message,
  fieldErrors,
  onDismiss,
}) => {
  return (
    <div className="p-4 mb-4 border border-rose-500/20 bg-rose-500/10 rounded-2xl text-rose-950 text-xs space-y-2 animate-fade-in">
      <div className="flex items-center justify-between font-bold">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            {title}: {message}
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-rose-600 hover:text-rose-900 rounded-lg hover:bg-rose-500/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {fieldErrors && Object.keys(fieldErrors).length > 0 && (
        <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-800 pl-6">
          {Object.entries(fieldErrors).map(([field, errs]) => (
            <li key={field}>
              <strong className="capitalize">{field.replace('_', ' ')}:</strong> {errs.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
