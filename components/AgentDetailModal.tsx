
import React from 'react';
import { Agent, ResponseItem, ResponseStatus, Tool } from '../types';
import { LoadingSpinner, CheckCircleIcon, ExclamationCircleIcon } from './Icons';

interface AgentDetailModalProps {
  agent: Agent;
  response: ResponseItem;
  assignedTools: Tool[];
  onClose: () => void;
}

const AgentDetailModal: React.FC<AgentDetailModalProps> = ({ agent, response, assignedTools, onClose }) => {
    
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
                    textColor: 'text-cyan-400'
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
                    <h3 className="font-semibold text-slate-300 mb-2">Error Details</h3>
                    <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3 max-h-80 overflow-y-auto font-mono text-sm">
                        <p className="text-rose-400 whitespace-pre-wrap font-semibold">{message}</p>
                        {stackTrace && (
                            <>
                                <div className="border-t border-slate-600/50 my-3"></div>
                                <details>
                                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                                        <span className="font-semibold">Show Stack Trace</span>
                                    </summary>
                                    <pre className="mt-2 text-slate-400 whitespace-pre-wrap opacity-80 text-xs">{stackTrace}</pre>
                                </details>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div>
                <h3 className="font-semibold text-slate-300 mb-2">Live Output</h3>
                <div className="bg-slate-900/70 border border-slate-700 rounded-md p-3 max-h-80 overflow-y-auto">
                    {response.content ? (
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                            {response.content}
                            {response.status === ResponseStatus.PENDING && (
                                <span className="blinking-cursor font-bold text-cyan-300">▍</span>
                            )}
                        </pre>
                    ) : (
                        <p className="text-slate-500 italic">No output received yet...</p>
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
                className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl shadow-cyan-500/10 w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 id="agent-detail-title" className="text-xl font-bold text-white font-mono tracking-wider">{agent.name}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <h3 className="font-semibold text-slate-300 mb-2">Agent Description</h3>
                        <p className={`text-slate-400 text-sm ${!agent.description && 'italic'}`}>
                            {agent.description || 'No description available.'}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-300 mb-2">Status</h3>
                        <div className={`flex items-center text-sm font-medium ${statusInfo.textColor}`}>
                            <div className="w-5 h-5 mr-2">{statusInfo.icon}</div>
                            <span>{statusInfo.text}</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-slate-300 mb-2">Assigned Toolkit</h3>
                        {assignedTools.length > 0 ? (
                            <ul className="space-y-2">
                                {assignedTools.map(tool => (
                                    <li key={tool.name} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                        <div className="flex justify-between items-center">
                                            <strong className="text-slate-200 font-mono text-sm">{tool.name}</strong>
                                            {response.activeTool === tool.name && (
                                                <span className="text-xs font-bold text-violet-300 bg-violet-900/50 px-2 py-1 rounded-full animate-pulse">
                                                    IN USE
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-sm mt-1">{tool.description}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 italic text-sm">No specific tools assigned to this agent.</p>
                        )}
                    </div>
                    
                    {renderOutputOrError()}

                </div>
            </div>
        </div>
    );
};

export default AgentDetailModal;