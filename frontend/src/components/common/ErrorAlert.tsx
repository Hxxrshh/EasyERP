import React from 'react';

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
    <div className="p-4 mb-4 border border-rose-200 bg-rose-50 rounded-lg text-rose-800 text-sm space-y-2">
      <div className="flex items-center justify-between font-semibold">
        <span>{title}: {message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-500 hover:text-rose-700 font-bold text-base px-1"
          >
            &times;
          </button>
        )}
      </div>

      {fieldErrors && Object.keys(fieldErrors).length > 0 && (
        <ul className="list-disc list-inside space-y-1 text-xs text-rose-700">
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
