import React from 'react';
import { Agent, ResponseItem, ResponseStatus } from '../types';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon } from './Icons';

interface AgentDetailModalProps {
  agent: Agent;
  response: ResponseItem;
  onClose: () => void;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, response, onClose }) => {
    
    const getStatusInfo = () => {
        switch (response.status) {
            case ResponseStatus.SUCCESS:
                return { 
                    icon: <CheckCircleIcon />, 
                    text: 'Success', 
                    textColor: 'text-green-400' 
                };
            case ResponseStatus.ERROR:
                return { 
                    icon: <ExclamationCircleIcon />, 
                    text: 'Error', 
                    textColor: 'text-red-400' 
                };
            case ResponseStatus.PENDING:
            default:
                return { 
                    icon: <LoadingSpinner />, 
                    text: 'Working...', 
                    textColor: 'text-blue-400'
                };
        }
    };

    const statusInfo = getStatusInfo();

    const renderOutputOrError = () => {
        if (response.status === ResponseStatus.ERROR) {
            const errorString = response.error || "No error details provided.";
            const lines = errorString.split('\n');
            const message = lines[0];
            const stackTrace = lines.slice(1).join('\n').trim();

            return (
                <div>
                    <h3 className="font-semibold text-gray-300 mb-2">Error Details</h3>
                    <div className="bg-gray-900/70 border border-gray-700 rounded-md p-3 max-h-80 overflow-y-auto font-mono text-sm">
                        <p className="text-red-300 whitespace-pre-wrap font-semibold">{message}</p>
                        {stackTrace && (
                            <>
                                <div className="border-t border-gray-600/50 my-3"></div>
                                <details>
                                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
                                        <span className="font-semibold">Show Stack Trace</span>
                                    </summary>
                                    <pre className="mt-2 text-gray-400 whitespace-pre-wrap opacity-80 text-xs">{stackTrace}</pre>
                                </details>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div>
                <h3 className="font-semibold text-gray-300 mb-2">Live Output</h3>
                <div className="bg-gray-900/70 border border-gray-700 rounded-md p-3 max-h-80 overflow-y-auto">
                    {response.content ? (
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                            {response.content}
                            {response.status === ResponseStatus.PENDING && (
                                <span className="blinking-cursor font-bold text-blue-300">▍</span>
                            )}
                        </pre>
                    ) : (
                        <p className="text-gray-500 italic">No output received yet...</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-detail-title"
        >
            <div 
                className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 id="agent-detail-title" className="text-xl font-bold text-white">{agent.name}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                        <h3 className="font-semibold text-gray-300 mb-2">Agent Description</h3>
                        <p className={`text-gray-400 text-sm ${!agent.description && 'italic'}`}>
                            {agent.description || 'No description available.'}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-300 mb-2">Status</h3>
                        <div className={`flex items-center text-sm font-medium ${statusInfo.textColor}`}>
                            <div className="w-5 h-5 mr-2">{statusInfo.icon}</div>
                            <span>{statusInfo.text}</span>
                        </div>
                    </div>
                    
                    {renderOutputOrError()}

                </div>
            </div>
        </div>
    );
};

export default AgentDetailModal;