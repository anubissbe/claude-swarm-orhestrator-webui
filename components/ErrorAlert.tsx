import React from 'react';
import { ExclamationCircleIcon } from './Icons';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ title = "Error", message, onDismiss }) => {
  return (
    <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 my-4 animate-fade-in" role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-red-300">{title}</h3>
          <div className="mt-2 text-sm text-red-400">
            <p>{message}</p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex bg-red-900/0 rounded-md p-1.5 text-red-400 hover:bg-red-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-900 focus:ring-red-500 transition-colors"
              aria-label="Dismiss"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
