
import React from 'react';
import { ResponseItem, ResponseStatus } from '../types';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon } from './Icons';

interface ResponseCardProps {
    response: ResponseItem;
}

const ResponseCard: React.FC<ResponseCardProps> = ({ response }) => {
    const getBorderColor = () => {
        switch (response.status) {
            case ResponseStatus.SUCCESS:
                return 'border-green-500/50';
            case ResponseStatus.ERROR:
                return 'border-red-500/50';
            case ResponseStatus.PENDING:
            default:
                return 'border-blue-500/50';
        }
    };

    const renderContent = () => {
        switch (response.status) {
            case ResponseStatus.PENDING:
                if (response.content && response.content.length > 0) {
                    return (
                        <p className="text-gray-300 text-sm whitespace-pre-wrap flex-grow">
                            {response.content}
                            <span className="blinking-cursor font-bold text-blue-300">▍</span>
                        </p>
                    );
                }
                return (
                    <div className="flex flex-col flex-grow items-center justify-center text-gray-400">
                        <LoadingSpinner />
                        <span className="mt-2 text-sm">Awaiting response...</span>
                    </div>
                );
            case ResponseStatus.SUCCESS:
                return (
                    <>
                        <div className="flex items-center text-green-400 mb-2">
                            <CheckCircleIcon />
                            <span className="ml-2 font-semibold">Success</span>
                        </div>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap flex-grow">{response.content}</p>
                    </>
                );
            case ResponseStatus.ERROR:
                 return (
                    <>
                        <div className="flex items-center text-red-400 mb-2">
                            <ExclamationCircleIcon />
                            <span className="ml-2 font-semibold">Error</span>
                        </div>
                        <p className="text-red-300 text-sm">{response.error}</p>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`bg-gray-800/50 border ${getBorderColor()} rounded-lg p-4 transition-all duration-500 min-h-[150px] flex flex-col`}>
            {renderContent()}
        </div>
    );
};

export default ResponseCard;